import { useState } from 'react'
import Button from '@/components/ui/Button'
import ReceiveGoodsModal from './ReceiveGoodsModal'
import type { PurchaseOrder } from '@/types'

interface PurchaseOrdersListProps {
  purchaseOrders: PurchaseOrder[]
  loading: boolean
  onRaisePO: () => void
  onReceiveItem: (itemId: string, qty: number, poId: string) => Promise<void>
}

export default function PurchaseOrdersList({
  purchaseOrders,
  loading,
  onRaisePO,
  onReceiveItem,
}: PurchaseOrdersListProps) {
  const [selectedPOForReceiving, setSelectedPOForReceiving] = useState<PurchaseOrder | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'project_job' | 'van_restock'>('all')

  const filtered = purchaseOrders.filter((po) => {
    if (statusFilter !== 'all' && po.status !== statusFilter) return false
    if (typeFilter !== 'all') {
      const isVan = po.order_type === 'van_restock' || (!po.project_id && !!po.vehicle_id)
      if (typeFilter === 'van_restock' && !isVan) return false
      if (typeFilter === 'project_job' && isVan) return false
    }
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      po.po_number.toLowerCase().includes(term) ||
      (po.vendor?.name || '').toLowerCase().includes(term) ||
      (po.project?.name || '').toLowerCase().includes(term) ||
      (po.vehicle?.registration_number || '').toLowerCase().includes(term) ||
      (po.cost_center?.name || '').toLowerCase().includes(term)
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'partially_received':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'ordered':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'draft':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions & Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-3.5 rounded-xl border border-border-dark">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xl flex-wrap sm:flex-nowrap">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search PO #, supplier, project, van rego..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary shrink-0"
          >
            <option value="all">All Destinations</option>
            <option value="project_job">Project Deliveries</option>
            <option value="van_restock">Van Restocks</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary shrink-0"
          >
            <option value="all">All Statuses</option>
            <option value="ordered">Ordered</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received (Complete)</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <Button onClick={onRaisePO} className="h-[36px] text-xs">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Raise Purchase Order
        </Button>
      </div>

      {/* POs Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-text-muted">Loading purchase orders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            shopping_cart
          </span>
          <p className="text-white text-sm font-medium">No purchase orders found</p>
          <p className="text-xs text-text-muted mt-1">
            Click "Raise Purchase Order" to allocate materials to a project or restock a fleet van.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier / Vendor</th>
                <th className="px-4 py-3">Destination / Target</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3 text-right">Total (Incl GST)</th>
                <th className="px-4 py-3">Delivery Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {filtered.map((po) => {
                const isVanRestock = po.order_type === 'van_restock' || (!po.project_id && !!po.vehicle_id)

                return (
                  <tr key={po.id} className="hover:bg-background-dark/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{po.po_number}</td>
                    <td className="px-4 py-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-400 text-base">storefront</span>
                        <span>{po.vendor?.name || 'Supplier'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isVanRestock ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                          <span className="material-symbols-outlined text-xs text-cyan-400">local_shipping</span>
                          <span>Van Restock: {po.vehicle?.registration_number || 'Fleet Van'}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-white font-medium block">
                            {po.project?.name || 'General Project'}
                          </span>
                          {po.cost_center && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <span className="material-symbols-outlined text-xs">account_tree</span>
                              {po.cost_center.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{po.order_date}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      ${Number(po.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${getStatusBadge(
                          po.status
                        )}`}
                      >
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedPOForReceiving(po)}
                        className="px-2.5 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-text-muted hover:text-white text-xs font-medium transition-colors"
                      >
                        Receive Goods →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receive Goods Modal */}
      {selectedPOForReceiving && (
        <ReceiveGoodsModal
          isOpen={!!selectedPOForReceiving}
          onClose={() => setSelectedPOForReceiving(null)}
          purchaseOrder={selectedPOForReceiving}
          onReceiveItem={onReceiveItem}
        />
      )}
    </div>
  )
}
