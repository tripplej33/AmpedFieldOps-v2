import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Project } from '../types'
import Button from './ui/Button'
import Modal from './ui/Modal'

interface ProjectTableProps {
  projects: Project[]
  isLoading: boolean
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
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
  onEdit,
  onDelete,
  onSort,
  pageCount,
  currentPage,
  onPageChange,
}: ProjectTableProps) {
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    onDelete(id)
    setDeleteConfirm(null)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
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
              <th className="px-4 py-3 text-left font-semibold text-text-muted cursor-pointer hover:text-primary" onClick={() => onSort('name')}>
                Name <span className="material-symbols-outlined text-xs">unfold_more</span>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden lg:table-cell cursor-pointer hover:text-primary" onClick={() => onSort('start_date')}>
                Start Date <span className="material-symbols-outlined text-xs">unfold_more</span>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden lg:table-cell">End Date</th>
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden xl:table-cell cursor-pointer hover:text-primary" onClick={() => onSort('budget')}>
                Budget <span className="material-symbols-outlined text-xs">unfold_more</span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-border-dark hover:bg-background-dark/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white cursor-pointer hover:text-primary" onClick={() => navigate(`/app/projects/${project.id}`)}>{project.name}</td>
                <td className="px-4 py-3 text-text-muted hidden md:table-cell">{project.client_id}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || 'bg-gray-900/30 text-gray-300'}`}>
                    {project.status}
                  </span>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-card-dark hover:bg-card-dark/80 disabled:opacity-50 rounded-lg transition-colors text-text-muted"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="text-sm text-text-muted">
            Page {currentPage} of {pageCount}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === pageCount}
            className="px-3 py-2 bg-card-dark hover:bg-card-dark/80 disabled:opacity-50 rounded-lg transition-colors text-text-muted"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Project">
          <div className="space-y-4">
            <p className="text-text-muted">Are you sure you want to delete this project? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
