import { Project, ProjectStatus } from '../types'
import ProjectCard from './ProjectCard'

interface KanbanBoardProps {
  projects: Project[]
  isLoading: boolean
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
}

const STATUSES: ProjectStatus[] = ['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']

const STATUS_ICON: Record<ProjectStatus, string> = {
  'Pending': 'schedule',
  'Active': 'play_circle',
  'On Hold': 'pause_circle',
  'Completed': 'check_circle',
  'Invoiced': 'receipt',
  'Archived': 'archive',
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  'Pending': 'text-amber-400',
  'Active': 'text-emerald-400',
  'On Hold': 'text-orange-400',
  'Completed': 'text-blue-400',
  'Invoiced': 'text-teal-400',
  'Archived': 'text-gray-400',
}

export default function KanbanBoard({
  projects,
  isLoading,
  onEdit,
  onDelete,
  onStatusChange,
}: KanbanBoardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent"></div>
      </div>
    )
  }

  const getProjectsByStatus = (status: ProjectStatus) => {
    return projects.filter((p) => p.status === status)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-max md:min-w-full">
        {STATUSES.map((status) => {
          const statusProjects = getProjectsByStatus(status)

          return (
            <div key={status} className="bg-background-dark rounded-lg border border-border-dark p-4 min-w-80 md:min-w-0">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-dark">
                <span className={`material-symbols-outlined text-xl ${STATUS_COLORS[status]}`}>
                  {STATUS_ICON[status]}
                </span>
                <h3 className="font-semibold text-white">{status}</h3>
                <span className="ml-auto inline-flex items-center justify-center w-6 h-6 bg-border-dark text-text-muted text-xs font-bold rounded-full">
                  {statusProjects.length}
                </span>
              </div>

              <div className="space-y-3">
                {statusProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-muted">No projects</p>
                  </div>
                ) : (
                  statusProjects.map((project) => (
                    <div key={project.id} className="group relative">
                      <ProjectCard
                        project={project}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showClient={false}
                      />
                      {status !== 'Archived' && (
                        <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                          {STATUSES
                            .filter((s) => s !== status && s !== 'Archived')
                            .slice(0, 3)
                            .map((newStatus) => (
                              <button
                                key={newStatus}
                                onClick={() => onStatusChange(project.id, newStatus)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded"
                                title={`Move to ${newStatus}`}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {STATUS_ICON[newStatus]}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
