import { useState } from 'react'
import Button from '@/components/ui/Button'
import SnagModal from './SnagModal'
import type { ProjectSnag, ProjectSnagFormData, Project, CostCenter, SnagStatus } from '@/types'
import type { User } from '@/hooks/useUsers'

interface ProjectSnagsListProps {
  snags: ProjectSnag[]
  loading: boolean
  project: Project
  costCenters: CostCenter[]
  users: User[]
  onAddSnag: (data: ProjectSnagFormData) => Promise<void>
  onUpdateStatus: (id: string, status: SnagStatus) => Promise<void>
}

export default function ProjectSnagsList({
  snags,
  loading,
  project,
  costCenters,
  users,
  onAddSnag,
  onUpdateStatus,
}: ProjectSnagsListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const filtered = snags.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      s.title.toLowerCase().includes(term) ||
      (s.location || '').toLowerCase().includes(term) ||
      (s.description || '').toLowerCase().includes(term) ||
      (s.assignee?.full_name || '').toLowerCase().includes(term)
    )
  })

  const openCount = snags.filter((s) => s.status === 'open' || s.status === 'in_progress').length
  const urgentCount = snags.filter((s) => (s.priority === 'urgent' || s.priority === 'high') && s.status !== 'closed').length
  const closedCount = snags.filter((s) => s.status === 'closed').length

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30 font-bold'
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'medium':
        return 'bg-primary/20 text-primary border-primary/30'
      case 'low':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'ready_for_inspection':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'open':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  // Calculate expiry status
  const getExpiryDisplay = (dueDate?: string | null, isClosed?: boolean) => {
    if (!dueDate || isClosed) return null
    const today = new Date().toISOString().slice(0, 10)
    const diffDays = Math.ceil(
      (new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse">
          Expired {Math.abs(diffDays)}d ago
        </span>
      )
    }
    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
          Due Today
        </span>
      )
    }
    if (diffDays <= 3) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
          Due in {diffDays} days
        </span>
      )
    }
    return <span className="text-[10px] text-text-muted">Due: {dueDate}</span>
  }

  return (
    <div className="space-y-4">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Active Snags to Fix</span>
          <p className="text-white text-xl font-bold font-mono mt-0.5">{openCount} Open</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Urgent / High Priority</span>
          <p className={`text-xl font-bold font-mono mt-0.5 ${urgentCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {urgentCount} Items
          </p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Rectified & Closed</span>
          <p className="text-emerald-400 text-xl font-bold font-mono mt-0.5">{closedCount} Resolved</p>
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
              placeholder="Search snags, location, technician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Snags</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="ready_for_inspection">Ready for Inspection</option>
            <option value="closed">Closed / Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-background-dark p-1 rounded-lg border border-border-dark">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
              title="Cards View"
            >
              <span className="material-symbols-outlined text-sm block">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-sm block">view_list</span>
            </button>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} className="h-[36px] text-xs">
            <span className="material-symbols-outlined text-base">add_circle</span>
            Add Snag Item
          </Button>
        </div>
      </div>

      {/* Snags Content */}
      {loading ? (
        <div className="text-center py-12 text-xs text-text-muted">Loading quality control snags...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            fact_check
          </span>
          <p className="text-white text-sm font-medium">No snags or defect items found</p>
          <p className="text-xs text-text-muted mt-1">
            Click "Add Snag Item" to record defect punch items with photos and due date reminders.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`bg-card-dark rounded-xl border p-4 shadow-md space-y-3 relative transition-all ${
                s.status === 'closed'
                  ? 'border-border-dark opacity-75'
                  : s.priority === 'urgent'
                  ? 'border-red-500/40 hover:border-red-500'
                  : 'border-border-dark hover:border-primary/50'
              }`}
            >
              {/* Header: Priority & Expiry Display */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getPriorityBadge(
                    s.priority
                  )}`}
                >
                  {s.priority}
                </span>

                {getExpiryDisplay(s.due_date, s.status === 'closed')}
              </div>

              {/* Title & Location */}
              <div>
                <h4 className="font-semibold text-white text-xs leading-snug">{s.title}</h4>
                {s.location && (
                  <p className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs text-primary">location_on</span>
                    <span>{s.location}</span>
                  </p>
                )}
                {s.cost_center && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[11px]">account_tree</span>
                    <span>{s.cost_center.name}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              {s.description && (
                <p className="text-[11px] text-text-muted/90 bg-background-dark/60 p-2 rounded-lg border border-border-dark/40 line-clamp-2">
                  {s.description}
                </p>
              )}

              {/* Assignee & Status Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-dark/50">
                {s.status === 'in_progress' ? (
                  <div className="flex items-center gap-1.5 text-blue-400 text-[11px] min-w-0 font-medium">
                    <span className="material-symbols-outlined text-xs">engineering</span>
                    <span className="truncate">
                      Started by <strong className="text-white">{s.assignee?.full_name || 'Technician'}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-text-muted text-[11px] min-w-0">
                    <span className="material-symbols-outlined text-xs">person</span>
                    <span className="truncate">
                      {s.assignee?.full_name ? `Assigned: ${s.assignee.full_name}` : 'Unassigned'}
                    </span>
                  </div>
                )}

                {/* 1-Click Status Advance */}
                <div className="shrink-0">
                  {s.status === 'open' && (
                    <button
                      onClick={() => onUpdateStatus(s.id, 'in_progress')}
                      className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold transition-colors"
                    >
                      Start Work →
                    </button>
                  )}
                  {s.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateStatus(s.id, 'ready_for_inspection')}
                      className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 text-[10px] font-semibold transition-colors"
                    >
                      Inspect →
                    </button>
                  )}
                  {s.status === 'ready_for_inspection' && (
                    <button
                      onClick={() => onUpdateStatus(s.id, 'closed')}
                      className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition-colors"
                    >
                      Close Snag
                    </button>
                  )}
                  {s.status === 'closed' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Snag Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-background-dark/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{s.title}</td>
                  <td className="px-4 py-3 text-text-muted">{s.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getPriorityBadge(
                        s.priority
                      )}`}
                    >
                      {s.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize border ${getStatusBadge(
                        s.status
                      )}`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getExpiryDisplay(s.due_date, s.status === 'closed')}</td>
                  <td className="px-4 py-3 text-text-muted">{s.assignee?.full_name || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-right">
                    {s.status !== 'closed' ? (
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            s.id,
                            s.status === 'open'
                              ? 'in_progress'
                              : s.status === 'in_progress'
                              ? 'ready_for_inspection'
                              : 'closed'
                          )
                        }
                        className="px-2 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-xs text-white"
                      >
                        Advance →
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-xs font-semibold">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Snag Modal */}
      {isAddModalOpen && (
        <SnagModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={async (data) => {
            await onAddSnag(data)
            setIsAddModalOpen(false)
          }}
          project={project}
          costCenters={costCenters}
          users={users}
        />
      )}
    </div>
  )
}
