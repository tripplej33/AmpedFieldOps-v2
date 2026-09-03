import { useState } from 'react'
import type { Project } from '@/types'

interface UnassignedJobsDrawerProps {
  projects: Project[]
  isOpen: boolean
  onToggle: () => void
  onScheduleProject: (project: Project) => void
}

export default function UnassignedJobsDrawer({
  projects,
  isOpen,
  onToggle,
  onScheduleProject,
}: UnassignedJobsDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase()
    const clientName = p.clients?.name || p.clients?.company || (p as any).client?.name || ''
    return (
      p.name.toLowerCase().includes(term) ||
      (p.address && p.address.toLowerCase().includes(term)) ||
      clientName.toLowerCase().includes(term)
    )
  })

  return (
    <aside
      className={`
        bg-card-dark border-l border-border-dark flex flex-col transition-all duration-300
        ${isOpen ? 'w-80 shrink-0' : 'w-12 shrink-0 overflow-hidden'}
      `}
    >
      {/* Drawer Toggle Header */}
      <div className="h-14 p-3 border-b border-border-dark flex items-center justify-between bg-surface-dark/60">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-xs font-bold text-white hover:text-primary transition-colors truncate"
          title="Toggle Unassigned Projects"
        >
          <span className="material-symbols-outlined text-primary text-lg shrink-0">
            {isOpen ? 'chevron_right' : 'chevron_left'}
          </span>
          {isOpen && (
            <span className="truncate flex items-center gap-1.5">
              <span>Unscheduled Projects</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                {projects.length}
              </span>
            </span>
          )}
        </button>

        {isOpen && (
          <span className="text-[11px] text-text-muted">Quick Dispatch</span>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col">
          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter active projects..."
              className="w-full h-8 pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Projects List */}
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs">
                No matching projects found.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const fullAddress = [p.address, p.suburb, p.city].filter(Boolean).join(', ')

                return (
                  <div
                    key={p.id}
                    className="p-3 bg-background-dark border border-border-dark rounded-xl space-y-2 hover:border-primary/50 transition-all group"
                  >
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </h5>
                      {(p.clients?.name || (p as any).client?.name) && (
                        <p className="text-[11px] text-text-muted truncate">
                          Client: {p.clients?.name || (p as any).client?.name}
                        </p>
                      )}
                    </div>

                    {fullAddress && (
                      <p className="text-[10px] text-text-muted/80 flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-xs">pin_drop</span>
                        {fullAddress}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onScheduleProject(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-lg border border-primary/20 text-xs font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">event</span>
                        Schedule
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
