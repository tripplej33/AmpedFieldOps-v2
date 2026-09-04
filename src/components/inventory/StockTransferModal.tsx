import React, { useState } from 'react'
import { useInventoryLocations, useInventoryOperations } from '@/hooks/useInventoryLocations'
import { useProjects } from '@/hooks/useProjects'
import type { InventoryStockLevel } from '@/types/inventory'
import Button from '@/components/ui/Button'

interface StockTransferModalProps {
  isOpen: boolean
  onClose: () => void
  stockItem: InventoryStockLevel
  onSuccess?: () => void
}

export default function StockTransferModal({
  isOpen,
  onClose,
  stockItem,
  onSuccess,
}: StockTransferModalProps) {
  const { locations } = useInventoryLocations()
  const { data: projects = [] } = useProjects()
  const { transferStock, bookStockToProject, isPending } = useInventoryOperations()

  const [mode, setMode] = useState<'transfer' | 'project'>('transfer')
  const [destLocationId, setDestLocationId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [chargePrice, setChargePrice] = useState(
    stockItem.item?.default_charge_rate || (stockItem.item?.unit_cost || 0) * 1.25
  )
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const availableQty = stockItem.quantity_on_hand

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity <= 0 || quantity > availableQty) return

    try {
      if (mode === 'transfer') {
        if (!destLocationId) return
        await transferStock({
          itemId: stockItem.item_id,
          sourceLocationId: stockItem.location_id,
          destLocationId,
          quantity,
          notes,
        })
      } else {
        if (!selectedProjectId) return
        await bookStockToProject({
          itemId: stockItem.item_id,
          sourceLocationId: stockItem.location_id,
          projectId: selectedProjectId,
          quantity,
          chargePrice,
          notes,
        })
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed stock operation:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border-dark pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">sync_alt</span>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                {mode === 'transfer' ? 'Transfer Stock' : 'Book Stock to Project'}
              </h3>
              <p className="text-[11px] text-text-muted">{stockItem.item?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-surface-dark border border-border-dark rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('transfer')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'transfer' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            Location Transfer
          </button>
          <button
            type="button"
            onClick={() => setMode('project')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'project' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            Book to Project
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 bg-surface-dark/50 border border-border-dark rounded-xl flex items-center justify-between">
            <span className="text-text-muted">Source Location:</span>
            <span className="text-white font-semibold">{stockItem.location?.name}</span>
          </div>

          <div className="p-3 bg-surface-dark/50 border border-border-dark rounded-xl flex items-center justify-between">
            <span className="text-text-muted">Available Quantity:</span>
            <span className="text-primary font-mono font-bold">{availableQty} units</span>
          </div>

          {mode === 'transfer' ? (
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Destination Location</label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              >
                <option value="">-- Select Destination Location --</option>
                {locations
                  .filter((l) => l.id !== stockItem.location_id)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.location_type})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Target Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              >
                <option value="">-- Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Quantity to Move</label>
              <input
                type="number"
                min={1}
                max={availableQty}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                required
              />
            </div>

            {mode === 'project' && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Sell / Charge Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={chargePrice}
                  onChange={(e) => setChargePrice(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">Notes / Reason</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white"
              placeholder="e.g. Stock replenished from warehouse / used for switchboard install."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || quantity > availableQty}>
              {isPending ? 'Processing...' : mode === 'transfer' ? 'Complete Transfer' : 'Book to Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
