import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Project, ProjectFormData, ProjectStatus } from '../types'
import { projectSchema } from '../lib/validators/projects'
import { useClients } from '../hooks/useClients'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  project?: Project
  isPending: boolean
}

const STATUSES: ProjectStatus[] = ['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']

export default function ProjectModal({ isOpen, onClose, onSubmit, project, isPending }: ProjectModalProps) {
  const [step, setStep] = useState(1)
  const { clients } = useClients()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description,
          client_id: project.client_id,
          status: project.status,
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget,
          notes: project.notes,
        }
      : {
          status: 'Pending',
        },
  })

  useEffect(() => {
    if (project) {
      setValue('name', project.name)
      setValue('description', project.description)
      setValue('client_id', project.client_id)
      setValue('status', project.status)
      setValue('start_date', project.start_date)
      setValue('end_date', project.end_date)
      setValue('budget', project.budget)
      setValue('notes', project.notes)
    }
  }, [project, setValue])

  const watchedValues = watch()

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ProjectFormData)[] = []
    
    // Validate only required fields for current step
    if (step === 1) {
      fieldsToValidate = ['name'] // description and budget are optional
    } else if (step === 2) {
      fieldsToValidate = ['client_id']
    } else if (step === 3) {
      fieldsToValidate = ['status'] // dates are optional
    }
    // Step 4 has no required fields (notes is optional)
    // Step 5 is review only

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate)
      if (!isValid) {
        return // Don't advance if validation fails
      }
    }
    
    if (step < 5) {
      setStep((prev) => prev + 1)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1)
    }
  }

  const handleFormSubmit = async (data: ProjectFormData) => {
    await onSubmit(data)
    reset()
    setStep(1)
    onClose()
  }

  // Prevent accidental submit before final step; advance steps on Enter/submit until review
  const handleFormEventSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (step < 5) {
      event.preventDefault()
      handleNextStep()
      return
    }

    handleSubmit(handleFormSubmit)(event)
  }

  const handleClose = () => {
    reset()
    setStep(1)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={project ? 'Edit Project' : 'Create Project'}>
      <form onSubmit={handleFormEventSubmit} className="space-y-6">
        {/* Step 1: Project Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Project Basics</h3>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Project Name *</label>
              <Input
                {...register('name')}
                placeholder="Enter project name"
                error={errors.name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Description</label>
              <textarea
                {...register('description')}
                placeholder="Enter project description"
                className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                rows={3}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Budget</label>
              <Input
                {...register('budget', { valueAsNumber: true })}
                type="number"
                placeholder="0.00"
                step="0.01"
                error={errors.budget?.message}
              />
            </div>
          </div>
        )}

        {/* Step 2: Client Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Select Client</h3>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Client *</label>
              <select
                {...register('client_id')}
                className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Choose a client...</option>
                {clients?.map((client: { id: string; company?: string; first_name: string; last_name: string }) => (
                  <option key={client.id} value={client.id}>
                    {client.company || `${client.first_name} ${client.last_name}`}
                  </option>
                ))}
              </select>
              {errors.client_id && <p className="text-red-400 text-sm mt-1">{errors.client_id.message}</p>}
            </div>

            {watchedValues.client_id && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-primary">
                  Client ID: <span className="font-mono">{watchedValues.client_id}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Dates */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Project Dates</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Start Date</label>
                <Input {...register('start_date')} type="date" error={errors.start_date?.message} />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">End Date</label>
                <Input {...register('end_date')} type="date" error={errors.end_date?.message} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Cost Centers (Stub) */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Cost Centers</h3>

            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-2">info</span>
              <p className="text-sm text-text-muted mt-2">
                Cost centers will be managed in the project detail view. You can add and configure them after creating the project.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Additional Notes</label>
              <textarea
                {...register('notes')}
                placeholder="Add any additional notes..."
                className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                rows={3}
              />
              {errors.notes && <p className="text-red-400 text-sm mt-1">{errors.notes.message}</p>}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Review & Submit</h3>

            <div className="space-y-3 bg-background-dark rounded-lg p-4 border border-border-dark">
              <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                <span className="text-text-muted">Project Name:</span>
                <span className="text-white font-medium">{watchedValues.name}</span>
              </div>
              {watchedValues.description && (
                <div className="flex justify-between items-start pb-2 border-b border-border-dark">
                  <span className="text-text-muted">Description:</span>
                  <span className="text-white font-medium text-right max-w-xs">{watchedValues.description}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                <span className="text-text-muted">Client ID:</span>
                <span className="text-white font-medium">{watchedValues.client_id}</span>
              </div>
              {watchedValues.start_date && (
                <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                  <span className="text-text-muted">Start Date:</span>
                  <span className="text-white font-medium">{new Date(watchedValues.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {watchedValues.end_date && (
                <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                  <span className="text-text-muted">End Date:</span>
                  <span className="text-white font-medium">{new Date(watchedValues.end_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                <span className="text-text-muted">Status:</span>
                <span className="text-white font-medium">{watchedValues.status}</span>
              </div>
              {watchedValues.budget && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Budget:</span>
                  <span className="text-white font-medium">${watchedValues.budget.toLocaleString()}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-text-muted">
              Review the information above and click submit to create the project.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border-dark">
          <div className="text-sm text-text-muted">
            Step {step} of 5
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={handlePrevStep} disabled={isPending}>
                Back
              </Button>
            )}

            {step < 5 ? (
              <Button type="button" onClick={handleNextStep} disabled={isPending}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : project ? 'Update Project' : 'Create Project'}
              </Button>
            )}

            <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
