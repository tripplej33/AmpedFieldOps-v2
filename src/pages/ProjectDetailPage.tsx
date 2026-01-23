import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useCostCenters } from '@/hooks/useCostCenters'
import Button from '@/components/ui/Button'
import CostCentersSection from '@/components/CostCentersSection'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useProject(id || '')
  const { data: costCenters, refresh: refreshCostCenters } = useCostCenters(id || '')

  if (!id) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">Invalid project ID</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
        <Button onClick={() => navigate('/app/projects')}>Back to Projects</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => navigate('/app/projects')} className="text-text-muted hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-primary">work</span>
              {project.name}
            </h1>
          </div>
          <p className="text-text-muted">Project ID: {project.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-xs font-medium ${
            project.status === 'Active' ? 'bg-green-500/10 text-green-400' :
            project.status === 'Completed' ? 'bg-blue-500/10 text-blue-400' :
            project.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-border-dark rounded-lg p-4">
          <p className="text-text-muted text-sm mb-1">Client</p>
          <p className="text-white font-semibold">
            {project.clients?.company || (project.clients ? `${project.clients.first_name} ${project.clients.last_name}` : '—')}
          </p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-lg p-4">
          <p className="text-text-muted text-sm mb-1">Start Date</p>
          <p className="text-white font-semibold">{project.start_date || '—'}</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-lg p-4">
          <p className="text-text-muted text-sm mb-1">End Date</p>
          <p className="text-white font-semibold">{project.end_date || '—'}</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-lg p-4">
          <p className="text-text-muted text-sm mb-1">Budget</p>
          <p className="text-white font-semibold">{project.budget ? `$${project.budget.toFixed(2)}` : '—'}</p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-card-dark border border-border-dark rounded-lg p-6">
          <h3 className="text-white font-semibold mb-2">Description</h3>
          <p className="text-text-muted">{project.description}</p>
        </div>
      )}

      {/* Cost Centers Section */}
      <CostCentersSection projectId={id} costCenters={costCenters} onMutationComplete={refreshCostCenters} />
    </div>
  )
}
