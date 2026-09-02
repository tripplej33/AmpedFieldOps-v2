import { useState } from 'react'
import { Project, ProjectStatus } from '../types'
import ProjectCard from './ProjectCard'

interface KanbanBoardProps {
  projects: Project[]
  isLoading: boolean
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
  onAddNew?: (status: ProjectStatus) => void
}

const STATUSES: ProjectStatus[] = ['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']

const STATUS_METRICS: Record<
  ProjectStatus,
  { icon: string; text: string; bg: string; border: string; bar: string; glow: string }
> = {
  'Pending': {
    icon: 'hourglass_empty',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    bar: 'bg-amber-500',
    glow: 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30',
  },
  'Active': {
    icon: 'rocket_launch',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    bar: 'bg-emerald-500',
    glow: 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30',
  },
  'On Hold': {
    icon: 'pause_circle',
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    bar: 'bg-orange-500',
    glow: 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30',
  },
  'Completed': {
    icon: 'verified',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    bar: 'bg-blue-500',
    glow: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30',
  },
  'Invoiced': {
    icon: 'receipt_long',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    bar: 'bg-teal-500',
    glow: 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/30',
  },
  'Archived': {
    icon: 'archive',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    bar: 'bg-slate-500',
    glow: 'border-slate-400 bg-slate-500/10 ring-2 ring-slate-400/30',
  },
}

export default function KanbanBoard({
  projects,
  isLoading,
  onEdit,
  onDelete,
  onStatusChange,
  onAddNew,
}: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<ProjectStatus | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 py-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card-dark rounded-xl border border-border-dark p-4 h-96 animate-pulse" />
        ))}
      </div>
    )
  }

  const getProjectsByStatus = (status: ProjectStatus) => {
    return projects.filter((p) => p.status === status)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== status) {
      setDragOverCol(status)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCol(status)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (dragOverCol === status) {
      setDragOverCol(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCol(null)
    const projectId = e.dataTransfer.getData('text/plain')
    if (projectId) {
      onStatusChange(projectId, status)
    }
  }

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1720px] xl:min-w-full">
        {STATUSES.map((status) => {
          const columnProjects = getProjectsByStatus(status)
          const config = STATUS_METRICS[status]
          const isOver = dragOverCol === status
          const totalColumnBudget = columnProjects.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0)

          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragEnter={(e) => handleDragEnter(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex-1 min-w-[280px] bg-background-dark/90 rounded-xl border flex flex-col transition-all duration-200 ${
                isOver ? config.glow : 'border-border-dark hover:border-border-dark/80'
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`h-1.5 w-full rounded-t-xl ${config.bar}`} />

              {/* Column Header */}
              <div className="p-3.5 border-b border-border-dark/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.bg} ${config.text} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-lg">{config.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{status}</h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                      <span>{columnProjects.length} {columnProjects.length === 1 ? 'project' : 'projects'}</span>
                      {totalColumnBudget > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-text-muted/40 inline-block shrink-0" />
                          <span className="text-primary font-mono font-medium">${(totalColumnBudget / 1000).toFixed(1)}k</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => onAddNew(status)}
                    className="w-7 h-7 rounded-lg border border-border-dark hover:border-primary/50 text-text-muted hover:text-white flex items-center justify-center transition-colors"
                    title={`Add new ${status} project`}
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                )}
              </div>

              {/* Card List Area */}
              <div className="p-3 space-y-3 flex-1 min-h-[300px] overflow-y-auto max-h-[calc(100vh-280px)]">
                {columnProjects.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-border-dark/40 rounded-xl flex flex-col items-center justify-center text-center p-4 transition-colors">
                    <span className={`material-symbols-outlined text-3xl mb-1.5 ${config.text} opacity-40`}>
                      {config.icon}
                    </span>
                    <p className="text-xs text-text-muted/70 font-medium">No {status} projects</p>
                    <p className="text-[10px] text-text-muted/50 mt-0.5">Drag & drop cards here</p>
                  </div>
                ) : (
                  columnProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      showClient={true}
                    />
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
