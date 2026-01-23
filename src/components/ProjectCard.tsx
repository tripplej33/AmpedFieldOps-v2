import { Project } from '../types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  showClient?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-900/30 text-amber-300',
  'Active': 'bg-emerald-900/30 text-emerald-300',
  'On Hold': 'bg-orange-900/30 text-orange-300',
  'Completed': 'bg-blue-900/30 text-blue-300',
  'Invoiced': 'bg-teal-900/30 text-teal-300',
  'Archived': 'bg-gray-900/30 text-gray-300',
}

export default function ProjectCard({ project, onEdit, onDelete, showClient }: ProjectCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-card-dark rounded-lg border border-border-dark p-4 hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors cursor-pointer" onClick={() => onEdit(project)}>
            {project.name}
          </h3>
          {showClient && <p className="text-xs text-text-muted truncate">{project.client_id}</p>}
        </div>
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${STATUS_COLORS[project.status] || 'bg-gray-900/30 text-gray-300'}`}>
          {project.status}
        </span>
      </div>

      {project.description && <p className="text-sm text-text-muted mb-3 line-clamp-2">{project.description}</p>}

      <div className="flex items-center justify-between gap-2 mb-3 text-xs text-text-muted">
        {project.start_date && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>{formatDate(project.start_date)}</span>
          </div>
        )}
        {project.budget && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>${project.budget.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-dark">
        <button
          onClick={() => onEdit(project)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-primary hover:bg-primary/10 rounded transition-colors text-sm font-medium"
        >
          <span className="material-symbols-outlined text-base">edit</span>
          Edit
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors text-sm font-medium"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          Delete
        </button>
      </div>
    </div>
  )
}
