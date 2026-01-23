import { useCallback, useEffect, useMemo, useState } from 'react'
import ProjectFolderList from '@/components/files/ProjectFolderList'
import ProjectFilesView from '@/components/files/ProjectFilesView'
import FilesBreadcrumb from '@/components/files/Breadcrumb'
import Toast from '@/components/ui/Toast'
import { useFiles } from '@/hooks/useFiles'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Project, ProjectFile } from '@/types'

type ToastState = { type: 'success' | 'error' | 'info'; message: string } | null

export default function FilesPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({})
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const { files, loading: filesLoading, error: filesError } = useFiles(currentProject?.id ?? '')
  const [filesList, setFilesList] = useState<ProjectFile[]>([])

  const loadExplorerData = useCallback(async () => {
    if (!user?.id) {
      setProjects([])
      setFileCounts({})
      setProjectsLoading(false)
      return
    }

    setProjectsLoading(true)
    setProjectsError(null)

    try {
      const [{ data: projectRows, error: projectErr }, { data: fileRows, error: fileErr }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, client_id, created_at, user_id, updated_at')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('project_files')
          .select('project_id'),
      ])

      if (projectErr) throw projectErr
      if (fileErr) throw fileErr

      setProjects(projectRows || [])

      const counts: Record<string, number> = {}
      ;(fileRows || []).forEach((row: { project_id: string }) => {
        counts[row.project_id] = (counts[row.project_id] || 0) + 1
      })
      setFileCounts(counts)
    } catch (err) {
      setProjectsError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setProjectsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadExplorerData()
  }, [loadExplorerData])

  useEffect(() => {
    setFilesList(files)
  }, [files])

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project)
  }

  const handleUploadComplete = (file: ProjectFile) => {
    setFilesList((prev) => [file, ...prev])
    setFileCounts((prev) => ({
      ...prev,
      [file.project_id]: (prev[file.project_id] || 0) + 1,
    }))
    setToast({ type: 'success', message: `${file.name} uploaded successfully` })
  }

  const handleFileDeleted = (fileId: string) => {
    setFilesList((prev) => prev.filter((f) => f.id !== fileId))
    if (currentProject) {
      setFileCounts((prev) => ({
        ...prev,
        [currentProject.id]: Math.max(0, (prev[currentProject.id] || 1) - 1),
      }))
    }
    setToast({ type: 'success', message: 'File deleted successfully' })
  }

  const handleError = (error: string) => {
    setToast({ type: 'error', message: error })
  }

  const handleBackToFolders = () => {
    setCurrentProject(null)
  }

  const selectedProjectName = useMemo(() => {
    if (!currentProject) return null
    return currentProject.name
  }, [currentProject])

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between pt-4 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-primary mb-2">File Explorer</p>
            <h1 className="text-3xl font-bold text-white">Files</h1>
            <p className="text-text-muted mt-1">Browse all projects or dive into a project to manage files.</p>
          </div>
        </div>

        <div className="mb-4">
          <FilesBreadcrumb
            projectName={selectedProjectName}
            onBack={currentProject ? handleBackToFolders : undefined}
          />
        </div>

        {projectsError && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-500/30 p-4 text-sm text-red-200">
            {projectsError}
            <button
              onClick={loadExplorerData}
              className="ml-4 inline-flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Retry
            </button>
          </div>
        )}

        {!currentProject ? (
          <ProjectFolderList
            projects={projects}
            fileCounts={fileCounts}
            loading={projectsLoading}
            onSelect={handleProjectSelect}
            onRetry={loadExplorerData}
          />
        ) : (
          <ProjectFilesView
            project={currentProject}
            files={filesList}
            loading={filesLoading}
            fetchError={filesError}
            onUploadComplete={handleUploadComplete}
            onFileDeleted={handleFileDeleted}
            onError={handleError}
            onBack={handleBackToFolders}
            fileCount={fileCounts[currentProject.id] || filesList.length}
          />
        )}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
