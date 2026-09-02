import { useState } from 'react'
import { usePurchaseOrders, useCreatePurchaseOrder, useReceivePOItem } from '@/hooks/usePurchaseOrders'
import { useProjects } from '@/hooks/useProjects'
import { useCostCenters } from '@/hooks/useCostCenters'
import PurchaseOrdersList from '@/components/procurement/PurchaseOrdersList'
import PurchaseOrderModal from '@/components/procurement/PurchaseOrderModal'
import Toast from '@/components/ui/Toast'
import type { PurchaseOrderFormData } from '@/types'

export default function PurchaseOrdersPage() {
  const { purchaseOrders, loading, refresh } = usePurchaseOrders()
  const { data: projects = [] } = useProjects()
  const { data: costCenters } = useCostCenters('')
  const { create: createPO, isPending: isPOCreating } = useCreatePurchaseOrder()
  const { receiveItem } = useReceivePOItem()

  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleCreatePO = async (data: PurchaseOrderFormData) => {
    try {
      await createPO(data)
      await refresh()
      setIsPOModalOpen(false)
      setToast({ type: 'success', message: `Purchase Order ${data.po_number} created successfully` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to create Purchase Order' })
    }
  }

  const handleReceivePOItem = async (itemId: string, qty: number, poId: string) => {
    try {
      await receiveItem(itemId, qty, poId)
      await refresh()
      setToast({ type: 'success', message: 'Delivered goods updated' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update goods receipt' })
    }
  }

  // Statistics
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (Number(po.total) || 0), 0)
  const orderedCount = purchaseOrders.filter((po) => po.status === 'ordered').length
  const completedCount = purchaseOrders.filter((po) => po.status === 'received').length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-4xl text-primary">shopping_cart</span>
            Purchase Orders & Procurement
          </h1>
          <p className="text-text-muted text-xs mt-1">
            Supplier orders allocated to projects, cost centers, and Xero sync
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-xs uppercase font-semibold">Total PO Spend</p>
          <p className="text-white text-2xl font-bold font-mono mt-1">${totalPOValue.toLocaleString()}</p>
          <p className="text-xs text-text-muted mt-1">{purchaseOrders.length} total purchase orders</p>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-xs uppercase font-semibold">Awaiting Delivery</p>
          <p className="text-amber-400 text-2xl font-bold mt-1">{orderedCount} Active</p>
          <p className="text-xs text-text-muted mt-1">Supplier orders in progress</p>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-xs uppercase font-semibold">Fully Received</p>
          <p className="text-emerald-400 text-2xl font-bold mt-1">{completedCount} Received</p>
          <p className="text-xs text-text-muted mt-1">Materials verified on site</p>
        </div>
      </div>

      {/* Main List */}
      <PurchaseOrdersList
        purchaseOrders={purchaseOrders}
        loading={loading}
        onRaisePO={() => setIsPOModalOpen(true)}
        onReceiveItem={handleReceivePOItem}
      />

      {/* Raise PO Modal */}
      {isPOModalOpen && (
        <PurchaseOrderModal
          isOpen={isPOModalOpen}
          onClose={() => setIsPOModalOpen(false)}
          onSubmit={handleCreatePO}
          projects={projects}
          costCenters={costCenters || []}
          isPending={isPOCreating}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
