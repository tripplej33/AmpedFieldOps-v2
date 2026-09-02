import { useState } from 'react'
import Button from '@/components/ui/Button'
import LogMaterialModal from './LogMaterialModal'
import type { ProjectMaterial, ProjectMaterialFormData, Project, CostCenter } from '@/types'

interface ProjectMaterialsListProps {
  materials: ProjectMaterial[]
  loading: boolean
  project: Project
  costCenters: CostCenter[]
  onLogMaterial: (data: ProjectMaterialFormData) => Promise<void>
}

export default function ProjectMaterialsList({
  materials,
  loading,
  project,
  costCenters,
  onLogMaterial,
}: ProjectMaterialsListProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const filtered = materials.filter((m) => {
    if (sourceFilter !== 'all' && m.source !== sourceFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      m.description.toLowerCase().includes(term) ||
      (m.cost_center?.name || '').toLowerCase().includes(term) ||
      (m.inventory_item?.sku || '').toLowerCase().includes(term)
    )
  })

  const totalCost = materials.reduce((sum, m) => sum + (Number(m.total_cost) || 0), 0)
  const vanStockCount = materials.filter((m) => m.source === 'van_stock').length

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'van_stock':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'warehouse':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'direct_po':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Total Materials Incurred</span>
          <p className="text-white text-xl font-bold font-mono mt-0.5">${totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Items Logged</span>
          <p className="text-primary text-xl font-bold mt-0.5">{materials.length} Entries</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Pulled from Van Stock</span>
          <p className="text-emerald-400 text-xl font-bold mt-0.5">{vanStockCount} Items</p>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-3.5 rounded-xl border border-border-dark">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search materials, SKU, cost center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Sources</option>
            <option value="van_stock">Van Stock</option>
            <option value="warehouse">Warehouse</option>
            <option value="direct_po">Direct PO</option>
          </select>
        </div>

        <Button onClick={() => setIsLogModalOpen(true)} className="h-[36px] text-xs">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Log Materials to Job
        </Button>
      </div>

      {/* Materials Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-text-muted">Loading project materials...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            inventory_2
          </span>
          <p className="text-white text-sm font-medium">No materials logged to this project yet</p>
          <p className="text-xs text-text-muted mt-1">
            Click "Log Materials to Job" to record cable, switchgear, or van stock used on site.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Material / SKU</th>
                <th className="px-4 py-3">Cost Center</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-background-dark/40 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{m.entry_date}</td>
                  <td className="px-4 py-3 font-semibold">
                    <p className="text-white truncate max-w-xs">{m.description}</p>
                    {m.inventory_item?.sku && (
                      <span className="text-[10px] font-mono text-primary font-normal">
                        SKU: {m.inventory_item.sku}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.cost_center ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                        <span className="material-symbols-outlined text-xs">account_tree</span>
                        {m.cost_center.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted">General Scope</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getSourceBadge(
                        m.source
                      )}`}
                    >
                      {m.source === 'van_stock'
                        ? 'Van Stock'
                        : m.source === 'warehouse'
                        ? 'Warehouse'
                        : 'Direct PO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    {m.quantity_used} {m.unit_of_measure}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-muted">
                    ${Number(m.unit_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">
                    ${Number(m.total_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {m.user?.full_name || 'Technician'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Material Modal */}
      {isLogModalOpen && (
        <LogMaterialModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          onSubmit={async (data) => {
            await onLogMaterial(data)
            setIsLogModalOpen(false)
          }}
          project={project}
          costCenters={costCenters}
        />
      )}
    </div>
  )
}
