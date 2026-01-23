import { useMemo, useState } from 'react'
import { Project } from '@/types'
import { SkeletonCard, SkeletonLoader } from '@/components/ui/Skeleton'

interface ProjectFolderListProps {
  projects: Project[]
  fileCounts: Record<string, number>
  loading?: boolean
  onSelect: (project: Project) => void
  onRetry?: () => void
}

export default function ProjectFolderList({
  projects,
  fileCounts,
  loading = false,
  onSelect,
  onRetry,
}: ProjectFolderListProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name')

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const list = projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedSearch)
    )

    return list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [projects, search, sortBy])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-9 w-40" />
          <SkeletonLoader className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    )
  }

  if (!loading && projects.length === 0) {
    return (
      <div className="rounded-lg border border-border-dark bg-card-dark p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <span className="material-symbols-outlined">folder_off</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No projects yet</h3>
        <p className="text-text-muted text-sm mb-4">Create a project to start organizing files by folder.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-base">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects"
              className="w-64 rounded-lg border border-border-dark bg-card-dark pl-9 pr-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>Sort by</span>
            <div className="inline-flex rounded-lg border border-border-dark bg-card-dark p-1">
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === 'name' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'
                }`}
              >
                Name
              </button>
              <button
                onClick={() => setSortBy('created_at')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === 'created_at' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'
                }`}
              >
                Recent
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted">{filteredProjects.length} projects</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => {
          const count = fileCounts[project.id] ?? 0
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="group relative w-full rounded-xl border border-border-dark bg-gradient-to-br from-card-dark via-card-dark to-background-dark p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">folder</span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white line-clamp-1">{project.name}</p>
                    <p className="text-xs text-text-muted">{project.status}</p>
                  </div>
                </div>
                <div className="rounded-full bg-border-dark px-3 py-1 text-[11px] font-semibold text-text-muted group-hover:bg-primary/10 group-hover:text-primary">
                  {count} file{count === 1 ? '' : 's'}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                  Open
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
