import { useState } from 'react'
import type { CostCenter, CostCenterFormData } from '@/types'
import { useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter } from '@/hooks/useCostCenters'
import Button from '@/components/ui/Button'
import CostCenterModal from '@/components/CostCenterModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Toast from '@/components/ui/Toast'

interface CostCentersSectionProps {
  projectId: string
  costCenters: CostCenter[]
  onMutationComplete?: () => void | Promise<void>
}

export default function CostCentersSection({ projectId, costCenters, onMutationComplete }: CostCentersSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCC, setSelectedCC] = useState<CostCenter | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteCC(deleteTarget)
    setDeleteTarget(null)
    if (onMutationComplete) await onMutationComplete()
  }

  const handleSave = async (data: CostCenterFormData) => {
    try {
      if (selectedCC) {
        const result = await updateCC(selectedCC.id, data)
        if (!result) throw new Error('Failed to update cost center')
      } else {
        const result = await createCC({ ...data, project_id: projectId })
        if (!result) throw new Error('Failed to create cost center')
      }

      // Trigger data refresh BEFORE closing modal
      if (onMutationComplete) await onMutationComplete()

      // Close modal only after refresh completes
      setIsModalOpen(false)
      setSelectedCC(undefined)
    } catch (error) {
      console.error('CostCentersSection: Error saving cost center:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setToast({ type: 'error', message: `Error saving cost center: ${errorMsg}` })
    }
  }

  const disabled = isCreating || isUpdating || isDeleting

  const totalAllocatedBudget = costCenters.reduce((sum, cc) => sum + (cc.budget || 0), 0)

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">category</span>
            Cost Centers & Budget Allocations
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Total Allocated: <span className="text-white font-semibold">${totalAllocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <Button onClick={handleAdd} disabled={disabled}>
          <span className="material-symbols-outlined">add</span>
          Add Cost Center
        </Button>
      </div>

      {costCenters.length === 0 ? (
        <div className="text-center py-8 text-text-muted border border-dashed border-border-dark rounded-lg">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">account_balance_wallet</span>
          <p className="text-white font-medium">No cost centers created</p>
          <p className="text-sm text-text-muted">Add a cost center to track PO numbers and project budgets.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background-dark">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Cost Center Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Allocated Budget</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Customer PO Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Notes</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {costCenters.map((cc) => (
                <tr key={cc.id} className="hover:bg-nav-hover">
                  <td className="px-4 py-3 text-white font-medium">{cc.name}</td>
                  <td className="px-4 py-3 text-white font-mono">${(cc.budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    {cc.customer_po_number ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30">
                        <span className="material-symbols-outlined text-xs">receipt_long</span>
                        {cc.customer_po_number}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-sm">{cc.notes ? cc.notes.slice(0, 40) + (cc.notes.length > 40 ? '...' : '') : '—'}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => handleEdit(cc)} disabled={disabled}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(cc.id)} disabled={disabled}>
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

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Cost Center"
        message="Are you sure you want to delete this cost center? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isPending={isDeleting}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
