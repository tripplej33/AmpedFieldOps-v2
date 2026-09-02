import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Project, ProjectFormData, ProjectStatus, User } from '../types'
import { projectSchema } from '../lib/validators/projects'
import { supabase } from '@/lib/supabase'
import ClientSelect from './ClientSelect'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  project?: Project
  defaultStatus?: ProjectStatus
  isPending: boolean
}

const STATUSES: ProjectStatus[] = ['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']

export default function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  defaultStatus,
  isPending,
}: ProjectModalProps) {
  const [step, setStep] = useState(1)
  const [formMode, setFormMode] = useState<'quick' | 'wizard'>('quick')

  // Available users for assignment
  const [teamUsers, setTeamUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })

      setTeamUsers((data || []) as User[])
    }
    loadUsers()
  }, [])

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
          address: project.address || '',
          suburb: project.suburb || '',
          city: project.city || '',
          postal_code: project.postal_code || '',
          site_access_notes: project.site_access_notes || '',
        }
      : {
          status: defaultStatus || 'Pending',
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
      setValue('address', project.address || '')
      setValue('suburb', project.suburb || '')
      setValue('city', project.city || '')
      setValue('postal_code', project.postal_code || '')
      setValue('site_access_notes', project.site_access_notes || '')

      if (project.assigned_members) {
        setSelectedUserIds(project.assigned_members.map((m) => m.user_id))
      }
    } else {
      setSelectedUserIds([])
    }
  }, [project, setValue])

  const watchedValues = watch()

  const toggleUserAssignment = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ProjectFormData)[] = []

    if (step === 1) {
      fieldsToValidate = ['name']
    } else if (step === 2) {
      fieldsToValidate = ['client_id']
    } else if (step === 3) {
      fieldsToValidate = ['status']
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate)
      if (!isValid) return
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
    await onSubmit({
      ...data,
      assigned_user_ids: selectedUserIds,
    })
    reset()
    setStep(1)
    onClose()
  }

  const handleFormEventSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (formMode === 'wizard' && step < 5) {
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={project ? 'Edit Project' : 'Create Project'}
      size={formMode === 'quick' ? 'lg' : 'md'}
    >
      {/* Mode Switcher */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-dark">
        <span className="text-xs text-text-muted">Form Layout:</span>
        <div className="flex bg-background-dark p-1 rounded-lg border border-border-dark text-xs">
          <button
            type="button"
            onClick={() => setFormMode('quick')}
            className={`px-3 py-1 rounded transition-colors ${
              formMode === 'quick' ? 'bg-primary text-white font-medium' : 'text-text-muted hover:text-white'
            }`}
          >
            Quick Form
          </button>
          <button
            type="button"
            onClick={() => setFormMode('wizard')}
            className={`px-3 py-1 rounded transition-colors ${
              formMode === 'wizard' ? 'bg-primary text-white font-medium' : 'text-text-muted hover:text-white'
            }`}
          >
            Guided Wizard
          </button>
        </div>
      </div>

      <form onSubmit={handleFormEventSubmit} className="space-y-4 text-xs">
        {/* QUICK FORM MODE */}
        {formMode === 'quick' ? (
          <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Project Name *</label>
                <Input
                  {...register('name')}
                  placeholder="e.g. Hospital Wing Rewire"
                  error={errors.name?.message}
                />
              </div>

              <div>
                <ClientSelect
                  value={watchedValues.client_id}
                  onChange={(val) => setValue('client_id', val, { shouldValidate: true })}
                  error={errors.client_id?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Status</label>
                <select
                  {...register('status')}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Start Date</label>
                <Input {...register('start_date')} type="date" error={errors.start_date?.message} />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">End Date</label>
                <Input {...register('end_date')} type="date" error={errors.end_date?.message} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Total Budget ($)</label>
              <Input
                {...register('budget', { valueAsNumber: true })}
                type="number"
                placeholder="0.00"
                step="0.01"
                error={errors.budget?.message}
              />
            </div>

            {/* Assigned Team Members / Permissions */}
            <div className="space-y-1.5 bg-background-dark/80 p-3 rounded-xl border border-border-dark/60">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-white">
                  Assigned Technicians & Staff ({selectedUserIds.length} Assigned)
                </label>
                <span className="text-[10px] text-text-muted">
                  Users only see projects assigned to them
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                {teamUsers.map((u) => {
                  const isAssigned = selectedUserIds.includes(u.id)
                  const initial = (u.full_name || u.email || 'T').charAt(0).toUpperCase()

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUserAssignment(u.id)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isAssigned
                          ? 'bg-primary/20 border-primary text-white font-semibold'
                          : 'bg-card-dark/60 border-border-dark/60 text-text-muted hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {initial}
                        </div>
                        <div className="truncate">
                          <span className="block truncate text-xs">{u.full_name || u.email}</span>
                          <span className="block text-[9px] text-text-muted uppercase font-mono">{u.role}</span>
                        </div>
                      </div>

                      <span className="material-symbols-outlined text-sm shrink-0">
                        {isAssigned ? 'check_circle' : 'add_circle'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Physical Site Location & Address */}
            <div className="space-y-2 bg-background-dark/80 p-3 rounded-xl border border-border-dark/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">pin_drop</span>
                <label className="block font-semibold text-white text-xs">
                  Physical Site Location & Address
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-text-muted mb-1">Street Address</label>
                <Input
                  {...register('address')}
                  placeholder="e.g. 142 Queen Street"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">Suburb</label>
                  <Input {...register('suburb')} placeholder="e.g. CBD / Albany" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">City</label>
                  <Input {...register('city')} placeholder="e.g. Auckland" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">Postal Code</label>
                  <Input {...register('postal_code')} placeholder="e.g. 1010" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-text-muted mb-1">Site Access / Gate Codes / Hazards</label>
                <Input
                  {...register('site_access_notes')}
                  placeholder="e.g. Gate code #4892, key lockbox on right side of meter board"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Description</label>
              <textarea
                {...register('description')}
                placeholder="Brief summary of project scope..."
                className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white text-xs placeholder-text-muted/50 focus:outline-none focus:border-primary"
                rows={2}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Additional Notes</label>
              <textarea
                {...register('notes')}
                placeholder="Internal notes or gate codes..."
                className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white text-xs placeholder-text-muted/50 focus:outline-none focus:border-primary"
                rows={2}
              />
              {errors.notes && <p className="text-red-400 text-xs mt-1">{errors.notes.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-dark">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </div>
        ) : (
          /* GUIDED WIZARD MODE */
          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Step 1: Project Basics</h3>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Project Name *</label>
                  <Input {...register('name')} placeholder="Enter project name" error={errors.name?.message} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Description</label>
                  <textarea
                    {...register('description')}
                    placeholder="Enter project description"
                    className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white text-xs placeholder-text-muted/50 focus:outline-none focus:border-primary"
                    rows={3}
                  />
                  {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Budget</label>
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

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Step 2: Select Client</h3>
                <ClientSelect
                  value={watchedValues.client_id}
                  onChange={(val) => setValue('client_id', val, { shouldValidate: true })}
                  error={errors.client_id?.message}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Step 3: Dates & Team Assignments</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Start Date</label>
                    <Input {...register('start_date')} type="date" error={errors.start_date?.message} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">End Date</label>
                    <Input {...register('end_date')} type="date" error={errors.end_date?.message} />
                  </div>
                </div>

                <div className="space-y-1.5 bg-background-dark/80 p-3 rounded-xl border border-border-dark/60">
                  <label className="block font-semibold text-white">
                    Assign Field Technicians ({selectedUserIds.length} Selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-32 overflow-y-auto">
                    {teamUsers.map((u) => {
                      const isAssigned = selectedUserIds.includes(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUserAssignment(u.id)}
                          className={`p-1.5 rounded-lg border text-left flex items-center justify-between text-xs ${
                            isAssigned
                              ? 'bg-primary/20 border-primary text-white font-semibold'
                              : 'bg-card-dark border-border-dark text-text-muted'
                          }`}
                        >
                          <span className="truncate">{u.full_name || u.email}</span>
                          <span className="material-symbols-outlined text-xs">
                            {isAssigned ? 'check' : 'add'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Step 4: Status & Notes</h3>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Status</label>
                  <select
                    {...register('status')}
                    className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Internal Notes</label>
                  <textarea
                    {...register('notes')}
                    placeholder="Add any internal job notes..."
                    className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white text-xs placeholder-text-muted/50 focus:outline-none focus:border-primary"
                    rows={3}
                  />
                  {errors.notes && <p className="text-red-400 text-xs mt-1">{errors.notes.message}</p>}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Step 5: Review & Submit</h3>
                <div className="space-y-2 bg-background-dark rounded-xl p-3.5 border border-border-dark">
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                    <span className="text-text-muted">Project Name:</span>
                    <span className="text-white font-medium">{watchedValues.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                    <span className="text-text-muted">Status:</span>
                    <span className="text-white font-medium">{watchedValues.status}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                    <span className="text-text-muted">Assigned Team:</span>
                    <span className="text-primary font-medium">{selectedUserIds.length} Technicians</span>
                  </div>
                  {watchedValues.budget && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Budget:</span>
                      <span className="text-white font-medium">${watchedValues.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-dark">
              <div className="text-xs text-text-muted">Step {step} of 5</div>
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
          </div>
        )}
      </form>
    </Modal>
  )
}
