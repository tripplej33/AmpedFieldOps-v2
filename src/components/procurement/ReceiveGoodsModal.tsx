import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { PurchaseOrder } from '@/types'

interface ReceiveGoodsModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseOrder: PurchaseOrder
  onReceiveItem: (itemId: string, receivedQty: number, poId: string) => Promise<void>
}

export default function ReceiveGoodsModal({
  isOpen,
  onClose,
  purchaseOrder,
  onReceiveItem,
}: ReceiveGoodsModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    ;(purchaseOrder.items || []).forEach((item) => {
      initial[item.id] = item.received_quantity || 0
    })
    return initial
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleQtyChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, value) }))
  }

  const handleQuickReceiveAll = (itemId: string, orderedQty: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: orderedQty }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const items = purchaseOrder.items || []
      for (const item of items) {
        const newQty = quantities[item.id] !== undefined ? quantities[item.id] : item.received_quantity
        if (newQty !== item.received_quantity) {
          await onReceiveItem(item.id, newQty, purchaseOrder.id)
        }
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receive Goods: ${purchaseOrder.po_number}`}>
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between bg-background-dark/80 p-3 rounded-xl border border-border-dark">
          <div>
            <span className="text-text-muted text-[11px] block">Supplier:</span>
            <span className="font-semibold text-white">{purchaseOrder.vendor?.name || 'Supplier'}</span>
          </div>
          <div className="text-right">
            <span className="text-text-muted text-[11px] block">Project / Cost Center:</span>
            <span className="font-semibold text-white">
              {purchaseOrder.project?.name}{' '}
              {purchaseOrder.cost_center?.name ? `• ${purchaseOrder.cost_center.name}` : ''}
            </span>
          </div>
        </div>

        {/* Items Checklist */}
        <div className="space-y-2">
          <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
            Delivered Item Checklist
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(purchaseOrder.items || []).map((item) => {
              const currentReceived = quantities[item.id] !== undefined ? quantities[item.id] : item.received_quantity
              const isFullyReceived = currentReceived >= item.quantity

              return (
                <div
                  key={item.id}
                  className="bg-card-dark p-3 rounded-xl border border-border-dark flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white text-xs truncate">{item.description}</p>
                    <p className="text-text-muted text-[11px] mt-0.5">
                      Ordered: <strong className="text-white">{item.quantity} {item.unit_of_measure}</strong>
                      {item.item_code && <span className="font-mono ml-2">SKU: {item.item_code}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-text-muted text-[11px]">Received:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={item.quantity * 2}
                        value={currentReceived}
                        onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-[32px] px-2 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-center text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickReceiveAll(item.id, item.quantity)}
                      className={`h-[32px] px-2 rounded-lg text-[10px] font-semibold border transition-colors ${
                        isFullyReceived
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-background-dark text-text-muted hover:text-white border-border-dark'
                      }`}
                    >
                      {isFullyReceived ? 'Fully Received' : 'Receive All'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] px-4 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white font-medium"
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Save Received Goods'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
