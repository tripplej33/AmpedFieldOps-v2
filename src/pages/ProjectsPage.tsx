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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | undefined>()
  const [defaultStatus, setDefaultStatus] = useState<ProjectStatus>('Pending')
  const [showFilters, setShowFilters] = useState(false)

  const { data: projects, isLoading, pageCount, refresh: refreshProjects } = useProjects(filters, currentPage)
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
    const channel = supabase
      .channel('projects-live-sync')
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
    if (await deleteProject(id)) {
      await refreshProjects()
    }
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2.5">
            <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary">folder_managed</span>
            Projects
          </h1>
          <p className="text-text-muted text-xs sm:text-sm">Manage company jobs, budget tracking, and scheduling</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Non-intrusive Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-card-dark border-border-dark text-text-muted hover:text-white hover:border-border-dark/80'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>

          {/* View Toggle */}
          <div className="flex gap-0.5 bg-card-dark border border-border-dark rounded-lg p-1">
            <button
              onClick={() => handleViewChange('table')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Table View (Default)"
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
              <span className="text-xs font-semibold">Table</span>
            </button>
            <button
              onClick={() => handleViewChange('kanban')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
              <span className="text-xs font-semibold">Kanban</span>
            </button>
          </div>

          {/* Create Button */}
          <Button onClick={handleCreateProject} disabled={isCreating || isUpdating || isDeleting}>
            <span className="material-symbols-outlined">add</span>
            <span className="hidden sm:inline">New Project</span>
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
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSort={() => {}}
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
