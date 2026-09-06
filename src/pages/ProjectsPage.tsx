import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects'
import type { Project, ProjectFormData, ProjectFilters, ProjectStatus } from '../types'
import { supabase } from '../lib/supabase'
import ProjectTable from '../components/ProjectTable'
import KanbanBoard from '../components/KanbanBoard'
import ProjectModal from '../components/ProjectModal'
import ProjectFiltersComponent from '../components/ProjectFilters'
import Button from '../components/ui/Button'

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view') as 'table' | 'kanban' | null
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(viewParam === 'kanban' ? 'kanban' : 'table')

  useEffect(() => {
    if (viewParam === 'kanban' || viewParam === 'table') {
      setViewMode(viewParam)
    }
  }, [viewParam])

  const handleViewChange = (mode: 'table' | 'kanban') => {
    setViewMode(mode)
    setSearchParams(mode === 'table' ? {} : { view: mode })
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<ProjectFilters>()
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | undefined>()
  const [defaultStatus, setDefaultStatus] = useState<ProjectStatus>('Pending')
  const [showFilters, setShowFilters] = useState(false)

  const { data: projects, isLoading, pageCount, refresh: refreshProjects } = useProjects(
    filters,
    currentPage,
    sort
  )
  const { mutate: createProject, isPending: isCreating } = useCreateProject()
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject()
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject()

  const hasActiveFilters = Boolean(
    (filters?.status && filters.status.length > 0) ||
    filters?.clientId ||
    filters?.startDate ||
    filters?.endDate
  )

  useEffect(() => {
    // Real-time project updates
    const channelId = `projects_live_sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        refreshProjects()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshProjects])

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const success = await deleteProject(id)
    if (success) {
      await refreshProjects()
      return true
    }
    return false
  }

  const handleCreateProject = () => {
    setSelectedProject(undefined)
    setDefaultStatus('Pending')
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (data: ProjectFormData) => {
    if (selectedProject) {
      await updateProject(selectedProject.id, data)
    } else {
      await createProject(data)
    }
    await refreshProjects()
  }

  const handleFilterChange = (newFilters: ProjectFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters(undefined)
    setCurrentPage(1)
  }

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    await updateProject(projectId, { status: newStatus })
    await refreshProjects()
  }

  const handleSort = (field: string) => {
    setSort((prev) => {
      if (prev?.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' }
        return undefined
      }
      return { field, direction: 'asc' }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-text-muted text-xs mt-0.5">Manage operational jobs, budgets, and milestones</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters Toggle Button */}
          <Button
            variant={hasActiveFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white ml-0.5 animate-pulse" />
            )}
          </Button>

          {/* View Mode Switcher (Table vs Kanban) */}
          <div className="flex bg-card-dark p-1 rounded-xl border border-border-dark">
            <button
              onClick={() => handleViewChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              Table
            </button>
            <button
              onClick={() => handleViewChange('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <span className="material-symbols-outlined text-sm">view_kanban</span>
              Board
            </button>
          </div>

          <Button
            onClick={handleCreateProject}
            className="flex items-center gap-1.5 text-xs font-semibold shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Project
          </Button>
        </div>
      </div>

      {/* Non-intrusive Inline Filter Bar (When Open) */}
      {showFilters && (
        <div className="animate-fadeIn">
          <ProjectFiltersComponent
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-sm">
          <ProjectTable
            projects={projects}
            isLoading={isLoading}
            isDeleting={isDeleting}
            currentSort={sort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSort={handleSort}
            pageCount={pageCount}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <KanbanBoard
          projects={projects}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onAddNew={(status) => {
            setSelectedProject(undefined)
            setDefaultStatus(status)
            setIsModalOpen(true)
          }}
        />
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        project={selectedProject}
        defaultStatus={defaultStatus}
        isPending={isCreating || isUpdating}
      />
    </div>
  )
}
