import { useState } from 'react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects'
import type { Project, ProjectFormData, ProjectFilters, ProjectStatus } from '../types'
import ProjectTable from '../components/ProjectTable'
import KanbanBoard from '../components/KanbanBoard'
import ProjectModal from '../components/ProjectModal'
import ProjectFiltersComponent from '../components/ProjectFilters'
import Button from '../components/ui/Button'

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<ProjectFilters>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | undefined>()

  const { data: projects, isLoading, pageCount } = useProjects(filters, currentPage)
  const { mutate: createProject, isPending: isCreating } = useCreateProject()
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject()
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject()

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (await deleteProject(id)) {
      // Refresh data
      setCurrentPage(1)
    }
  }

  const handleCreateProject = () => {
    setSelectedProject(undefined)
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (data: ProjectFormData) => {
    if (selectedProject) {
      await updateProject(selectedProject.id, data)
    } else {
      await createProject(data)
    }
    setCurrentPage(1)
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
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      await updateProject(projectId, { ...project, status: newStatus })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary">folder</span>
            Projects
          </h1>
          <p className="text-text-muted">Manage your projects and track progress</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex gap-1 bg-card-dark border border-border-dark rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-xl">table_rows</span>
              <span className="hidden sm:inline text-sm font-medium">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Kanban View"
            >
              <span className="material-symbols-outlined text-xl">dashboard</span>
              <span className="hidden sm:inline text-sm font-medium">Kanban</span>
            </button>
          </div>

          {/* Create Button */}
          <Button onClick={handleCreateProject} disabled={isCreating || isUpdating || isDeleting}>
            <span className="material-symbols-outlined">add</span>
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters */}
        <div>
          <ProjectFiltersComponent onFilterChange={handleFilterChange} onClear={handleClearFilters} />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {viewMode === 'table' ? (
            <div className="bg-card-dark rounded-lg border border-border-dark overflow-hidden">
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
            <div>
              <KanbanBoard
                projects={projects}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        project={selectedProject}
        isPending={isCreating || isUpdating}
      />
    </div>
  )
}
