import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Project, ProjectStatus } from '../types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => void
  showClient?: boolean
}

const STATUS_CONFIG: Record<ProjectStatus, { bg: string; text: string; border: string; borderLeft: string }> = {
  'Pending': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    borderLeft: 'border-l-amber-500',
  },
  'Active': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    borderLeft: 'border-l-emerald-500',
  },
  'On Hold': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    borderLeft: 'border-l-orange-500',
  },
  'Completed': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    borderLeft: 'border-l-blue-500',
  },
  'Invoiced': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    borderLeft: 'border-l-teal-500',
  },
  'Archived': {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    borderLeft: 'border-l-gray-500',
  },
}

const ALL_STATUSES: ProjectStatus[] = ['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onStatusChange,
  showClient = true,
}: ProjectCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const clientName = project.clients?.name || project.clients?.company || (project.clients ? `${project.clients.first_name || ''} ${project.clients.last_name || ''}`.trim() : '') || 'No Client Assigned'
  const config = STATUS_CONFIG[project.status] || STATUS_CONFIG['Pending']

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTimeline = () => {
    const start = project.start_date ? formatDate(project.start_date) : null
    const end = project.end_date ? formatDate(project.end_date) : null

    if (start && end) return `${start} - ${end}`
    if (start) return `Starts ${start}`
    if (end) return `Due ${end}`
    return 'No dates set'
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', project.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-card-dark rounded-xl border border-border-dark border-l-4 ${config.borderLeft} p-4 hover:border-primary/50 transition-all duration-200 group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg relative select-none ${
        isDragging ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header: Client Chip + Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {showClient && (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[65%]">
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-text-muted font-medium truncate" title={clientName}>
              {clientName}
            </span>
          </div>
        )}

        {/* 3-Dots Action Menu */}
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1 text-text-muted hover:text-white rounded-lg hover:bg-background-dark/80 transition-colors"
            title="Project Actions"
          >
            <span className="material-symbols-outlined text-base">more_vert</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-card-dark border border-border-dark rounded-xl shadow-2xl py-1 z-30 text-xs divide-y divide-border-dark/50 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/app/projects/${project.id}`)
                }}
                className="w-full px-3 py-2 text-left text-white hover:bg-background-dark flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                View 360° Hub
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(project)
                }}
                className="w-full px-3 py-2 text-left text-white hover:bg-background-dark flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-primary">edit</span>
                Edit Details
              </button>

              {/* Quick Move Submenu */}
              {onStatusChange && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-semibold text-text-muted">Move to:</div>
                  {ALL_STATUSES.filter((s) => s !== project.status).map((targetStatus) => (
                    <button
                      key={targetStatus}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onStatusChange(project.id, targetStatus)
                      }}
                      className="w-full px-3 py-1.5 text-left text-text-muted hover:text-white hover:bg-background-dark flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {targetStatus}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(project.id)
                }}
                className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Title */}
      <h3
        onClick={() => navigate(`/app/projects/${project.id}`)}
        className="font-semibold text-white text-sm leading-snug group-hover:text-primary transition-colors cursor-pointer line-clamp-2 mb-1.5"
        title={project.name}
      >
        {project.name}
      </h3>

      {/* Description Snippet */}
      {project.description && (
        <p className="text-xs text-text-muted/80 line-clamp-2 mb-3 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Bottom Metadata Badges */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border-dark/60 text-xs">
        {/* Timeline Dates or Assigned Team */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          {project.assigned_members && project.assigned_members.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {project.assigned_members.slice(0, 3).map((m) => {
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
              {project.assigned_members.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-background-dark border border-card-dark text-text-muted text-[8px] font-bold flex items-center justify-center">
                  +{project.assigned_members.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-text-muted truncate">
              <span className="material-symbols-outlined text-xs text-primary/80 shrink-0">calendar_month</span>
              <span className="truncate">{formatTimeline()}</span>
            </div>
          )}
        </div>

        {/* Budget Pill */}
        {project.budget ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-medium text-[11px]">
            <span>${project.budget.toLocaleString()}</span>
          </div>
        ) : (
          <span className="text-[11px] text-text-muted/50">—</span>
        )}
      </div>
    </div>
  )
}
