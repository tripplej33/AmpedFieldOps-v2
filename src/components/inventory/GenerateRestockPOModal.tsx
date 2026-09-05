import React, { useState, useEffect } from 'react'
import { useStockLevels } from '@/hooks/useInventoryLocations'
import { useAllClients } from '@/hooks/useClients'
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import Button from '@/components/ui/Button'
import type { PurchaseOrderItemFormData } from '@/types'

interface GenerateRestockPOModalProps {
  isOpen: boolean
  onClose: () => void
  locationId: string
  locationName: string
  onSuccess?: () => void
}

interface RestockRow {
  selected: boolean
  itemId: string
  sku: string
  name: string
  unitOfMeasure: string
  onHand: number
  targetQty: number
  orderQty: number
  unitCost: number
}

export default function GenerateRestockPOModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  onSuccess,
}: GenerateRestockPOModalProps) {
  const { stockLevels, loading: stockLoading } = useStockLevels(locationId)
  const { clients = [] } = useAllClients()
  const { create: createPO, isPending: isCreating } = useCreatePurchaseOrder()

  const vendors = clients.filter((c) => c.contact_type === 'vendor' || c.contact_type === 'both' || c.is_supplier)

  const [vendorId, setVendorId] = useState('')
  const [poNumber, setPoNumber] = useState(`PO-RESTOCK-${Math.floor(100000 + Math.random() * 900000)}`)
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState(`Automated restock order for ${locationName}`)
  const [rows, setRows] = useState<RestockRow[]>([])
  const [error, setError] = useState<string | null>(null)

  // Auto-build low-stock item list
  useEffect(() => {
    if (stockLevels.length > 0) {
      const lowItems: RestockRow[] = stockLevels
        .filter((s) => Number(s.quantity_on_hand || 0) <= Number(s.min_reorder_level || 5))
        .map((s) => {
          const onHand = Number(s.quantity_on_hand || 0)
          const target = Number(s.target_stock_level || 20)
          const needed = Math.max(1, target - onHand)
          return {
            selected: true,
            itemId: s.item_id,
            sku: s.item?.sku || '',
            name: s.item?.name || 'Stock Item',
            unitOfMeasure: s.item?.unit_of_measure || 'EA',
            onHand,
            targetQty: target,
            orderQty: needed,
            unitCost: Number(s.item?.unit_cost || 0),
          }
        })

      setRows(lowItems)
    } else {
      setRows([])
    }
  }, [stockLevels])

  if (!isOpen) return null

  const handleToggleRow = (idx: number) => {
    const next = [...rows]
    next[idx].selected = !next[idx].selected
    setRows(next)
  }

  const handleQtyChange = (idx: number, qty: number) => {
    const next = [...rows]
    next[idx].orderQty = Math.max(1, qty)
    setRows(next)
  }

  const selectedRows = rows.filter((r) => r.selected)
  const subtotal = selectedRows.reduce((sum, r) => sum + r.orderQty * r.unitCost, 0)
  const gst = subtotal * 0.15
  const total = subtotal + gst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) {
      setError('Please select a supplier / vendor for this restock purchase order')
      return
    }
    if (selectedRows.length === 0) {
      setError('Please select at least one item to restock')
      return
    }

    try {
      setError(null)
      const poItems: PurchaseOrderItemFormData[] = selectedRows.map((r) => ({
        item_code: r.sku,
        description: `${r.name} (Restock for ${locationName})`,
        quantity: r.orderQty,
        unit_of_measure: r.unitOfMeasure,
        unit_cost: r.unitCost,
        notes: `Restock to reach target level ${r.targetQty}`,
      }))

      await createPO({
        po_number: poNumber,
        vendor_id: vendorId,
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery_date: expectedDate || undefined,
        delivery_address: locationName,
        delivery_notes: `Deliver to storage location: ${locationName}`,
        notes,
        order_type: 'van_restock',
        items: poItems,
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to create restock PO:', err)
      setError(err instanceof Error ? err.message : 'Failed to create restock purchase order')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Generate Restock Purchase Order — {locationName}
              </h2>
              <p className="text-[11px] text-text-muted">
                Auto-compile items below reorder levels and dispatch a purchase order to your supplier.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* PO Form Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-dark/40 border border-border-dark rounded-xl p-3 text-xs shrink-0">
          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">
              Supplier / Vendor <span className="text-red-400">*</span>
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
            >
              <option value="">-- Choose Supplier --</option>
              {(vendors.length > 0 ? vendors : clients).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.xero_contact_id ? '(Xero)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">PO Number</label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">Expected Delivery</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">Restock PO Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent workshop replenish"
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
            />
          </div>
        </div>

        {/* Low-stock Item Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Items Below Reorder Threshold ({selectedRows.length} of {rows.length} selected)
            </span>
            <button
              type="button"
              onClick={() => {
                const allSelected = rows.every((r) => r.selected)
                setRows(rows.map((r) => ({ ...r, selected: !allSelected })))
              }}
              className="text-[11px] text-primary hover:underline"
            >
              {rows.every((r) => r.selected) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {stockLoading ? (
            <div className="p-8 text-center text-text-muted text-xs animate-pulse">
              Scanning inventory levels...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border-dark rounded-xl bg-surface-dark/20 text-xs">
              <span className="material-symbols-outlined text-3xl text-emerald-400 block mb-1">
                check_circle
              </span>
              <p className="text-white font-semibold">All Stock Levels Healthy</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                No items in {locationName} are currently below their minimum reorder point.
              </p>
            </div>
          ) : (
            <div className="border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 text-xs">
              {rows.map((r, idx) => (
                <div
                  key={r.itemId}
                  className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                    r.selected ? 'bg-cyan-500/5' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={() => handleToggleRow(idx)}
                      className="rounded border-border-dark bg-background-dark text-cyan-500 w-4 h-4"
                    />
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{r.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted">
                        <span className="font-mono text-primary">SKU: {r.sku || 'N/A'}</span>
                        <span>•</span>
                        <span>
                          On Hand: <strong className="text-red-400 font-mono">{r.onHand}</strong> / Target: {r.targetQty} {r.unitOfMeasure}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <label className="text-[10px] text-text-muted block">Order Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={r.orderQty}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-16 h-7 px-2 bg-background-dark border border-border-dark rounded text-right font-mono font-bold text-white"
                      />
                    </div>
                    <div className="text-right w-20">
                      <span className="text-[10px] text-text-muted block">Est. Total:</span>
                      <span className="text-white font-mono font-bold">
                        ${(r.orderQty * r.unitCost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PO Totals Bar */}
        <div className="p-3 bg-surface-dark/60 border border-border-dark rounded-xl flex items-center justify-between flex-wrap gap-4 text-xs shrink-0">
          <div>
            <span className="text-text-muted block text-[11px]">Subtotal (Excl. GST):</span>
            <span className="text-sm font-bold text-white font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">GST (15%):</span>
            <span className="text-sm font-bold text-amber-400 font-mono">${gst.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Estimated PO Total:</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark flex-wrap gap-3 shrink-0">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isCreating} className="text-xs">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating || selectedRows.length === 0 || !vendorId}
            className="text-xs font-bold flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            {isCreating ? 'Generating PO...' : `Generate Restock PO (${selectedRows.length} Items)`}
          </Button>
        </div>
      </div>
    </div>
  )
}
