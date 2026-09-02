import { useState } from 'react'
import type { Timesheet, TimesheetStatus } from '../types'
import Spinner from './ui/Spinner'
import ConfirmDialog from './ui/ConfirmDialog'

interface TimesheetTableProps {
  items: Timesheet[]
  isLoading?: boolean
  onEdit: (item: Timesheet) => void
  onSubmit: (id: string) => void
  onApprove: (id: string) => void
  onUnapprove?: (id: string) => void
  onDelete: (id: string) => void
  onBatchSubmit?: (ids: string[]) => void
  onBatchApprove?: (ids: string[]) => void
  onBatchDelete?: (ids: string[]) => void
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  onSort?: (key: 'entry_date' | 'hours' | 'status') => void
  sort?: { key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' }
  isManager?: boolean
}

const statusConfig: Record<
  TimesheetStatus,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: 'edit_note',
  },
  submitted: {
    label: 'Submitted',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    icon: 'pending_actions',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: 'verified',
  },
  invoiced: {
    label: 'Invoiced',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    icon: 'receipt',
  },
}

export default function TimesheetTable({
  items,
  isLoading,
  onEdit,
  onSubmit,
  onApprove,
  onUnapprove,
  onDelete,
  onBatchSubmit,
  onBatchApprove,
  onBatchDelete,
  currentPage,
  pageCount,
  onPageChange,
  onSort,
  sort,
  isManager = false,
}: TimesheetTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [itemToDelete, setItemToDelete] = useState<Timesheet | null>(null)
  const [itemToUnapprove, setItemToUnapprove] = useState<Timesheet | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  const isAllSelected = items.length > 0 && items.every((t) => selectedIds.includes(t.id))
  const isSomeSelected = items.some((t) => selectedIds.includes(t.id)) && !isAllSelected

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((t) => t.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectedItems = items.filter((t) => selectedIds.includes(t.id))
  const draftSelected = selectedItems.filter((t) => t.status === 'draft')
  const submittedSelected = selectedItems.filter((t) => t.status === 'submitted')

  const handleConfirmSingleDelete = async () => {
    if (itemToDelete) {
      await onDelete(itemToDelete.id)
      setItemToDelete(null)
    }
  }

  const handleConfirmSingleUnapprove = async () => {
    if (itemToUnapprove && onUnapprove) {
      await onUnapprove(itemToUnapprove.id)
      setItemToUnapprove(null)
    }
  }

  const handleConfirmBatchDelete = async () => {
    if (onBatchDelete && draftSelected.length > 0) {
      await onBatchDelete(draftSelected.map((t) => t.id))
      setSelectedIds([])
      setShowBatchDeleteConfirm(false)
    }
  }

  return (
    <div className="bg-card-dark rounded-2xl border border-border-dark overflow-hidden shadow-xl">
      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px]">
              {selectedIds.length}
            </span>
            <span>selected across page</span>
          </div>

          <div className="flex items-center gap-2">
            {draftSelected.length > 0 && onBatchSubmit && (
              <button
                type="button"
                onClick={() => {
                  onBatchSubmit(draftSelected.map((t) => t.id))
                  setSelectedIds([])
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Submit Drafts ({draftSelected.length})
              </button>
            )}

            {submittedSelected.length > 0 && isManager && onBatchApprove && (
              <button
                type="button"
                onClick={() => {
                  onBatchApprove(submittedSelected.map((t) => t.id))
                  setSelectedIds([])
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                Approve Selected ({submittedSelected.length})
              </button>
            )}

            {draftSelected.length > 0 && onBatchDelete && (
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete Drafts ({draftSelected.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-text-muted hover:text-white px-2 py-1 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-background-dark/80 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="w-10 px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected
                  }}
                  onChange={handleSelectAll}
                  className="rounded border-border-dark text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                />
              </th>
              <th
                className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort?.('entry_date')}
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  {sort?.key === 'entry_date' && (
                    <span className="text-primary text-xs font-bold">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3.5">Technician</th>
              <th className="px-4 py-3.5">Project & Scope</th>
              <th className="px-4 py-3.5">Activity Type</th>
              <th
                className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort?.('hours')}
              >
                <div className="flex items-center gap-1">
                  <span>Hours</span>
                  {sort?.key === 'hours' && (
                    <span className="text-primary text-xs font-bold">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort?.('status')}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sort?.key === 'status' && (
                    <span className="text-primary text-xs font-bold">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-dark/60 text-text-muted">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-text-muted">
                  <Spinner size="md" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-text-muted">
                  <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
                    timer_off
                  </span>
                  <p className="text-white font-medium text-sm">No timesheets match your criteria</p>
                  <p className="text-xs text-text-muted mt-1">Try resetting filters or record a new entry.</p>
                </td>
              </tr>
            ) : (
              items.map((t) => {
                const isSelected = selectedIds.includes(t.id)
                const config = statusConfig[t.status] || statusConfig.draft
                const techName = t.user?.full_name || t.user?.email || 'Technician'
                const techInitial = techName.charAt(0).toUpperCase()

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-background-dark/50 transition-colors group ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(t.id)}
                        className="rounded border-border-dark text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                      />
                    </td>

                    {/* Entry Date */}
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-text-muted">calendar_today</span>
                        <span>{t.entry_date}</span>
                      </div>
                    </td>

                    {/* Technician */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {techInitial}
                        </div>
                        <span className="text-text-muted group-hover:text-white transition-colors truncate max-w-[140px]">
                          {techName}
                        </span>
                      </div>
                    </td>

                    {/* Project & Cost Center */}
                    <td className="px-4 py-3.5">
                      <div className="min-w-[160px] max-w-[240px]">
                        <div className="font-semibold text-white truncate hover:text-primary transition-colors">
                          {t.project?.name || 'Unassigned Project'}
                        </div>
                        {t.cost_center ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium truncate mt-0.5">
                            <span className="material-symbols-outlined text-xs">account_tree</span>
                            <span>{t.cost_center.name}</span>
                            {t.cost_center.customer_po_number && (
                              <span className="text-[10px] text-text-muted font-mono">
                                ({t.cost_center.customer_po_number})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-muted/60 truncate mt-0.5">
                            General Project Scope
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Activity Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background-dark border border-border-dark text-[11px] text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {t.activity_type?.name || 'General Field Labor'}
                      </span>
                    </td>

                    {/* Hours */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-sm">
                      <span className="text-white bg-background-dark px-2.5 py-1 rounded-lg border border-border-dark">
                        {Number(t.hours).toFixed(1)} <span className="text-[11px] font-normal text-text-muted">hrs</span>
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${config.bg} ${config.text} ${config.border}`}
                      >
                        <span className="material-symbols-outlined text-xs">{config.icon}</span>
                        {config.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(t)}
                              className="px-2.5 py-1 rounded-lg bg-background-dark hover:bg-card-dark text-text-muted hover:text-white border border-border-dark text-xs transition-colors"
                              title="Edit Draft"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onSubmit(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
                              title="Submit for Approval"
                            >
                              Submit
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(t)}
                              className="p-1 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Draft"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </>
                        )}

                        {t.status === 'submitted' && (
                          <>
                            {isManager && (
                              <button
                                type="button"
                                onClick={() => onApprove(t.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                                title="Approve Timesheet"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEdit(t)}
                              className="px-2.5 py-1 rounded-lg bg-background-dark hover:bg-card-dark text-text-muted hover:text-white border border-border-dark text-xs transition-colors"
                              title="Edit Details"
                            >
                              Edit
                            </button>
                            {isManager && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete(t)}
                                className="p-1 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete Timesheet"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </>
                        )}

                        {t.status === 'approved' && (
                          <>
                            {isManager && onUnapprove && (
                              <button
                                type="button"
                                onClick={() => setItemToUnapprove(t)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-medium flex items-center gap-1 transition-colors"
                                title="Unapprove and revert to Submitted"
                              >
                                <span className="material-symbols-outlined text-xs">lock_open</span>
                                Unapprove
                              </button>
                            )}
                            {isManager && (
                              <button
                                type="button"
                                onClick={() => onEdit(t)}
                                className="px-2.5 py-1 rounded-lg bg-background-dark hover:bg-card-dark text-text-muted hover:text-white border border-border-dark text-xs transition-colors"
                                title="View / Edit Timesheet"
                              >
                                Edit
                              </button>
                            )}
                            {isManager && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete(t)}
                                className="p-1 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete Approved Timesheet"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                            {!isManager && (
                              <span className="text-[11px] text-text-muted/60 italic flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
                                Approved
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border-dark/80 bg-background-dark/30 text-xs text-text-muted">
        <div>
          Showing page <span className="font-semibold text-white">{currentPage}</span> of{' '}
          <span className="font-semibold text-white">{Math.max(1, pageCount)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1.5 rounded-lg border border-border-dark bg-background-dark hover:bg-card-dark text-text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1.5 rounded-lg border border-border-dark bg-background-dark hover:bg-card-dark text-text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Timesheet Entry?"
        message={
          itemToDelete ? (
            <p>
              Are you sure you want to permanently delete this timesheet for{' '}
              <strong className="text-white">
                {itemToDelete.user?.full_name || itemToDelete.user?.email || 'Technician'}
              </strong>{' '}
              ({Number(itemToDelete.hours).toFixed(1)} hrs on {itemToDelete.entry_date})?
            </p>
          ) : (
            ''
          )
        }
        confirmText="Delete"
        variant="danger"
        icon="delete"
      />

      {/* Unapprove Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToUnapprove)}
        onClose={() => setItemToUnapprove(null)}
        onConfirm={handleConfirmSingleUnapprove}
        title="Unapprove Timesheet Entry?"
        message="This will revert the timesheet status from Approved to Submitted so hours, activities, or notes can be modified. Are you sure?"
        confirmText="Unapprove & Unlock"
        variant="warning"
        icon="lock_open"
      />

      {/* Batch Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
        title={`Delete ${draftSelected.length} Draft Timesheets?`}
        message={`Are you sure you want to delete ${draftSelected.length} selected draft timesheets? This cannot be undone.`}
        confirmText={`Delete ${draftSelected.length} Drafts`}
        variant="danger"
        icon="delete_sweep"
      />
    </div>
  )
}
