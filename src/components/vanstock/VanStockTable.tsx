import { useState } from 'react'
import type { VanInventoryItem } from '@/types'
import type { InventoryStockLevel } from '@/types/inventory'
import StockTransferModal from '@/components/inventory/StockTransferModal'

interface VanStockTableProps {
  stock: VanInventoryItem[]
  loading: boolean
  onAdjustStock: (id: string, newQty: number) => Promise<void>
  onRefresh?: () => void
}

export default function VanStockTable({ stock, loading, onAdjustStock, onRefresh }: VanStockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempQty, setTempQty] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [transferItem, setTransferItem] = useState<InventoryStockLevel | null>(null)

  const filtered = stock.filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      (s.item?.name || '').toLowerCase().includes(term) ||
      (s.item?.sku || '').toLowerCase().includes(term) ||
      (s.item?.category || '').toLowerCase().includes(term)
    )
  })

  const handleStartEdit = (s: VanInventoryItem) => {
    setEditingId(s.id)
    setTempQty(s.quantity_on_hand)
  }

  const handleSaveEdit = async (id: string) => {
    await onAdjustStock(id, tempQty)
    setEditingId(null)
  }

  const handleQuickAdjust = async (s: VanInventoryItem, delta: number) => {
    const next = Math.max(0, s.quantity_on_hand + delta)
    await onAdjustStock(s.id, next)
  }

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
          search
        </span>
        <input
          type="text"
          placeholder="Filter inventory stock items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[36px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs text-text-muted animate-pulse">Loading mobile inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-3xl text-text-muted/40 block mb-1">
            inventory_2
          </span>
          <p className="text-white text-xs font-medium">No stock items in this location</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
            <table className="w-full text-xs text-left">
              <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Item / SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">In Location</th>
                  <th className="px-4 py-3 text-center">Target</th>
                  <th className="px-4 py-3">Stock Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark/60 text-white">
                {filtered.map((s) => {
                  const isLow = s.quantity_on_hand <= (s.item?.min_reorder_level || 3)
                  const isOut = s.quantity_on_hand === 0

                  return (
                    <tr key={s.id} className="hover:bg-background-dark/40 transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        <p className="text-white">{s.item?.name || 'Stock Item'}</p>
                        <span className="text-[10px] font-mono text-primary font-normal">
                          SKU: {s.item?.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{s.item?.category || 'General'}</td>
                      <td className="px-4 py-3 text-center">
                        {editingId === s.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={tempQty}
                              onChange={(e) => setTempQty(parseFloat(e.target.value) || 0)}
                              className="w-14 h-[28px] px-1 bg-background-dark border border-primary rounded text-center text-white font-mono text-xs"
                            />
                            <button
                              onClick={() => handleSaveEdit(s.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleStartEdit(s)}
                            className="cursor-pointer font-mono font-bold text-white bg-background-dark px-2.5 py-1 rounded border border-border-dark hover:border-primary transition-colors"
                            title="Click to edit quantity"
                          >
                            {s.quantity_on_hand} {s.item?.unit_of_measure}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-text-muted">
                        {s.target_stock_level} {s.item?.unit_of_measure}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Stocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setTransferItem({
                                id: s.id,
                                item_id: s.inventory_item_id || s.item?.id || '',
                                location_id: s.vehicle_id,
                                quantity_on_hand: s.quantity_on_hand,
                                min_reorder_level: s.item?.min_reorder_level || 3,
                                target_stock_level: s.target_stock_level || 10,
                                created_at: s.created_at,
                                item: s.item as any,
                                location: { id: s.vehicle_id, name: s.vehicle?.registration_number || 'Location', location_type: 'van', is_primary: false, created_at: s.created_at },
                              })
                            }
                            className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1 border border-primary/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">sync_alt</span>
                            Transfer / Book
                          </button>

                          <button
                            onClick={() => handleQuickAdjust(s, -1)}
                            disabled={s.quantity_on_hand <= 0}
                            className="w-7 h-7 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-white flex items-center justify-center disabled:opacity-30"
                            title="Deduct 1"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(s, 1)}
                            className="w-7 h-7 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-white flex items-center justify-center"
                            title="Add 1"
                          >
                            +1
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View (Adaptive Viewport) */}
          <div className="md:hidden space-y-3">
            {filtered.map((s) => {
              const isLow = s.quantity_on_hand <= (s.item?.min_reorder_level || 3)
              const isOut = s.quantity_on_hand === 0

              return (
                <div key={s.id} className="bg-card-dark border border-border-dark rounded-xl p-3.5 space-y-3 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{s.item?.name || 'Stock Item'}</h4>
                      <span className="text-[10px] font-mono text-primary">SKU: {s.item?.sku}</span>
                    </div>
                    {isOut ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        In Stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-surface-dark/50 p-2.5 rounded-lg border border-border-dark/60 text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted block">Quantity on Hand:</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {s.quantity_on_hand} {s.item?.unit_of_measure}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickAdjust(s, -1)}
                        disabled={s.quantity_on_hand <= 0}
                        className="w-8 h-8 rounded-lg bg-background-dark active:bg-border-dark border border-border-dark text-white font-bold flex items-center justify-center disabled:opacity-30"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(s, 1)}
                        className="w-8 h-8 rounded-lg bg-background-dark active:bg-border-dark border border-border-dark text-white font-bold flex items-center justify-center"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setTransferItem({
                        id: s.id,
                        item_id: s.inventory_item_id || s.item?.id || '',
                        location_id: s.vehicle_id,
                        quantity_on_hand: s.quantity_on_hand,
                        min_reorder_level: s.item?.min_reorder_level || 3,
                        target_stock_level: s.target_stock_level || 10,
                        created_at: s.created_at,
                        item: s.item as any,
                        location: { id: s.vehicle_id, name: s.vehicle?.registration_number || 'Location', location_type: 'van', is_primary: false, created_at: s.created_at },
                      })
                    }
                    className="w-full py-2 rounded-lg bg-primary text-black font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">sync_alt</span>
                    Transfer / Book to Job
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Stock Transfer Modal */}
      {transferItem && (
        <StockTransferModal
          isOpen={!!transferItem}
          onClose={() => setTransferItem(null)}
          stockItem={transferItem}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </div>
  )
}
