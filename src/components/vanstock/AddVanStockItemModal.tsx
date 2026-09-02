import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useInventory } from '@/hooks/useInventory'

interface AddVanStockItemModalProps {
  isOpen: boolean
  onClose: () => void
  vehicleId: string
  vehicleName: string
  onAddStockItem: (vehicleId: string, itemId: string, qty: number, targetQty: number) => Promise<void>
}

export default function AddVanStockItemModal({
  isOpen,
  onClose,
  vehicleId,
  vehicleName,
  onAddStockItem,
}: AddVanStockItemModalProps) {
  const { items: catalogItems } = useInventory()
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState<number>(10)
  const [targetQuantity, setTargetQuantity] = useState<number>(10)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || !vehicleId) return

    try {
      setIsPending(true)
      await onAddStockItem(
        vehicleId,
        selectedItemId,
        Number(quantity) || 0,
        Number(targetQuantity) || 10
      )
      onClose()
    } finally {
      setIsPending(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stock Van: ${vehicleName}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">
            Select Catalog Item <span className="text-primary">*</span>
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            required
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          >
            <option value="">Choose item from catalog...</option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.category}] {item.name} ({item.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Initial Quantity On Hand</label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Target Max Stock Level</label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(parseFloat(e.target.value) || 10)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
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
          <Button type="submit" disabled={isPending || !selectedItemId}>
            {isPending ? 'Allocating...' : 'Add to Van Inventory'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
