import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { costCenterSchema, CostCenterFormData as CostCenterFormDataZ } from '@/lib/validators/costCenters'
import type { CostCenter, CostCenterFormData } from '@/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface CostCenterModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CostCenterFormData) => Promise<void>
  costCenter?: CostCenter
  isPending?: boolean
  projectId?: string
}

export default function CostCenterModal({
  isOpen,
  onClose,
  onSave,
  costCenter,
  isPending,
  projectId,
}: CostCenterModalProps) {
  const form = useForm<CostCenterFormDataZ>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      project_id: costCenter?.project_id || projectId || '',
      name: costCenter?.name || '',
      budget: costCenter?.budget || undefined,
      customer_po_number: costCenter?.customer_po_number || '',
      notes: costCenter?.notes || '',
    },
  })

  // Reset form when costCenter changes (edit mode)
  useEffect(() => {
    if (costCenter) {
      form.reset({
        project_id: costCenter.project_id,
        name: costCenter.name,
        budget: costCenter.budget || undefined,
        customer_po_number: costCenter.customer_po_number || '',
        notes: costCenter.notes || '',
      })
    } else if (projectId) {
      form.reset({
        project_id: projectId,
        name: '',
        budget: undefined,
        customer_po_number: '',
        notes: '',
      })
    }
  }, [costCenter, projectId, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    console.log('CostCenterModal: Form submitted with values:', values)
    try {
      const formData: CostCenterFormData = {
        project_id: values.project_id,
        name: values.name,
        budget: values.budget,
        customer_po_number: values.customer_po_number,
        notes: values.notes,
      }
      console.log('CostCenterModal: Calling onSave with:', formData)
      await onSave(formData)
      console.log('CostCenterModal: Save successful, closing modal')
      form.reset()
      onClose()
    } catch (error) {
      console.error('CostCenterModal: Error submitting form:', error)
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={costCenter ? 'Edit Cost Center' : 'Add Cost Center'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g., Labor, Materials, Equipment"
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <Input
          label="Budget"
          type="number"
          placeholder="0.00"
          step={0.01}
          min={0}
          {...form.register('budget', { valueAsNumber: true })}
          error={form.formState.errors.budget?.message}
        />
        <Input
          label="Customer PO Number"
          placeholder="e.g., PO-12345"
          {...form.register('customer_po_number')}
          error={form.formState.errors.customer_po_number?.message}
        />
        <Input
          label="Notes"
          placeholder="Optional notes"
          {...form.register('notes')}
          error={form.formState.errors.notes?.message}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {costCenter ? 'Update' : 'Create'} Cost Center
          </Button>
        </div>
      </form>
    </Modal>
  )
}
