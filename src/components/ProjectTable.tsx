import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Project } from '../types'
import { getClientDisplayName } from '../lib/clientName'
import Button from './ui/Button'
import Modal from './ui/Modal'

interface ProjectTableProps {
  projects: Project[]
  isLoading: boolean
  isDeleting?: boolean
  currentSort?: { field: string; direction: 'asc' | 'desc' }
  onEdit: (project: Project) => void
  onDelete: (id: string) => Promise<boolean | void> | void
  onSort: (field: string) => void
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-900/30 text-amber-300',
  'Active': 'bg-emerald-900/30 text-emerald-300',
  'On Hold': 'bg-orange-900/30 text-orange-300',
  'Completed': 'bg-blue-900/30 text-blue-300',
  'Invoiced': 'bg-teal-900/30 text-teal-300',
  'Archived': 'bg-gray-900/30 text-gray-300',
}

export default function ProjectTable({
  projects,
  isLoading,
  isDeleting = false,
  currentSort,
  onEdit,
  onDelete,
  onSort,
  pageCount,
  currentPage,
  onPageChange,
}: ProjectTableProps) {
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleteError(null)
    const result = await onDelete(id)
    if (result !== false) {
      setDeleteConfirm(null)
    } else {
      setDeleteError('Failed to delete project. Please check if related resources prevent deletion.')
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const renderSortIcon = (field: string) => {
    if (currentSort?.field !== field) {
      return <span className="material-symbols-outlined text-xs opacity-40 group-hover:opacity-100 transition-opacity">unfold_more</span>
    }
    return (
      <span className="material-symbols-outlined text-xs text-primary font-bold">
        {currentSort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-4xl text-text-muted mb-2">folder_open</span>
        <p className="text-text-muted">No projects found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card-dark border-b border-border-dark">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-text-muted cursor-pointer hover:text-primary transition-colors group" onClick={() => onSort('name')}>
                <span className="inline-flex items-center gap-1">
                  Name {renderSortIcon('name')}
                </span>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden sm:table-cell">Assigned Team</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden lg:table-cell cursor-pointer hover:text-primary transition-colors group" onClick={() => onSort('start_date')}>
                <span className="inline-flex items-center gap-1">
                  Start Date {renderSortIcon('start_date')}
                </span>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden lg:table-cell">End Date</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden xl:table-cell cursor-pointer hover:text-primary transition-colors group" onClick={() => onSort('budget')}>
                <span className="inline-flex items-center gap-1">
                  Budget {renderSortIcon('budget')}
                </span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
              {projects.map((project) => {
                const clientName = getClientDisplayName(project.clients)
                const members = project.assigned_members || []
                return (
                <tr key={project.id} className="border-b border-border-dark hover:bg-background-dark/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white cursor-pointer hover:text-primary" onClick={() => navigate(`/app/projects/${project.id}`)}>{project.name}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell cursor-pointer hover:text-white" onClick={() => navigate('/app/clients')}>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">apartment</span>
                      {clientName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || 'bg-gray-900/30 text-gray-300'}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {members.length > 0 ? (
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {members.slice(0, 3).map((m) => {
                          const initial = (m.user?.full_name || m.user?.email || 'T').charAt(0).toUpperCase()
                          return (
                            <div
                              key={m.id}
                              title={m.user?.full_name || m.user?.email}
                              className="w-5 h-5 rounded-full bg-primary/30 border border-card-dark text-primary text-[9px] font-bold flex items-center justify-center"
                            >
                              {initial}
                            </div>
                          )
                        })}
                        {members.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-background-dark border border-card-dark text-text-muted text-[8px] font-bold flex items-center justify-center">
                            +{members.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted/40 text-xs">—</span>
                    )}
                  </td>
                <td className="px-4 py-3 text-text-muted hidden lg:table-cell">{formatDate(project.start_date)}</td>
                <td className="px-4 py-3 text-text-muted hidden lg:table-cell">{formatDate(project.end_date)}</td>
                <td className="px-4 py-3 text-text-muted hidden xl:table-cell">
                  {project.budget ? `$${project.budget.toLocaleString()}` : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(project)}
                      className="text-primary hover:text-primary/80 transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(project.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap pt-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="First Page"
            className="p-2 bg-card-dark hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors text-text-muted flex items-center justify-center border border-border-dark"
          >
            <span className="material-symbols-outlined text-base">first_page</span>
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous Page"
            className="p-2 bg-card-dark hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors text-text-muted flex items-center justify-center border border-border-dark"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          {/* Direct page numbers: show ±1 around current, plus first and last */}
          {Array.from({ length: pageCount }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1)
            .reduce<(number | string)[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                acc.push('...')
              }
              acc.push(p)
              return acc
            }, [])
            .map((item, idx) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  onClick={() => onPageChange(item)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-colors border ${
                    currentPage === item
                      ? 'bg-primary text-white font-bold border-primary shadow-sm'
                      : 'bg-card-dark hover:bg-surface-dark text-text-muted hover:text-white border-border-dark'
                  }`}
                >
                  {item}
                </button>
              ) : (
                <span key={`dots-${idx}`} className="px-1 text-xs text-text-muted select-none">
                  …
                </span>
              )
            )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === pageCount}
            title="Next Page"
            className="p-2 bg-card-dark hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors text-text-muted flex items-center justify-center border border-border-dark"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
          <button
            onClick={() => onPageChange(pageCount)}
            disabled={currentPage === pageCount}
            title="Last Page"
            className="p-2 bg-card-dark hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors text-text-muted flex items-center justify-center border border-border-dark"
          >
            <span className="material-symbols-outlined text-base">last_page</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => {
            if (!isDeleting) {
              setDeleteConfirm(null)
              setDeleteError(null)
            }
          }}
          title="Delete Project"
        >
          <div className="space-y-4">
            <p className="text-text-muted">Are you sure you want to delete this project? This action cannot be undone.</p>
            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {deleteError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteConfirm(null)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
