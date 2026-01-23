import { useState } from 'react'
import type { CostCenter, CostCenterFormData } from '@/types'
import { useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter } from '@/hooks/useCostCenters'
import Button from '@/components/ui/Button'
import CostCenterModal from '@/components/CostCenterModal'

interface CostCentersSectionProps {
  projectId: string
  costCenters: CostCenter[]
  onMutationComplete?: () => void | Promise<void>
}

export default function CostCentersSection({ projectId, costCenters, onMutationComplete }: CostCentersSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCC, setSelectedCC] = useState<CostCenter | undefined>()

  const { mutate: createCC, isPending: isCreating } = useCreateCostCenter()
  const { mutate: updateCC, isPending: isUpdating } = useUpdateCostCenter()
  const { mutate: deleteCC, isPending: isDeleting } = useDeleteCostCenter()

  const handleAdd = () => {
    setSelectedCC(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (cc: CostCenter) => {
    setSelectedCC(cc)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this cost center?')) {
      deleteCC(id)
    }
  }

  const handleSave = async (data: CostCenterFormData) => {
    console.log('CostCentersSection: handleSave called with:', data)
    try {
      if (selectedCC) {
        console.log('CostCentersSection: Updating cost center', selectedCC.id)
        const result = await updateCC(selectedCC.id, data)
        if (!result) {
          throw new Error('Failed to update cost center')
        }
        console.log('CostCentersSection: Update successful:', result)
      } else {
        console.log('CostCentersSection: Creating new cost center')
        const result = await createCC({ ...data, project_id: projectId })
        if (!result) {
          throw new Error('Failed to create cost center')
        }
        console.log('CostCentersSection: Create successful:', result)
      }
      
      // Trigger data refresh BEFORE closing modal
      if (onMutationComplete) {
        console.log('CostCentersSection: Calling onMutationComplete to refresh data')
        await onMutationComplete()
      }
      
      // Close modal only after refresh completes
      setIsModalOpen(false)
      setSelectedCC(undefined)
      console.log('CostCentersSection: Modal closed and form reset')
    } catch (error) {
      console.error('CostCentersSection: Error saving cost center:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error saving cost center: ${errorMsg}`)
    }
  }

  const disabled = isCreating || isUpdating || isDeleting

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-primary">category</span>
          Cost Centers
        </h2>
        <Button onClick={handleAdd} disabled={disabled}>
          <span className="material-symbols-outlined">add</span>
          Add Cost Center
        </Button>
      </div>

      {costCenters.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>No cost centers yet. Add one to organize project expenses.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background-dark">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Budget</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">PO Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Notes</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {costCenters.map((cc) => (
                <tr key={cc.id} className="hover:bg-nav-hover">
                  <td className="px-4 py-3 text-white font-medium">{cc.name}</td>
                  <td className="px-4 py-3 text-white">{cc.budget ? `$${cc.budget.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{cc.customer_po_number || '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-sm">{cc.notes ? cc.notes.slice(0, 40) + (cc.notes.length > 40 ? '...' : '') : '—'}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => handleEdit(cc)} disabled={disabled}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(cc.id)} disabled={disabled}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CostCenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        costCenter={selectedCC}
        isPending={disabled}
        projectId={projectId}
      />
    </div>
  )
}
