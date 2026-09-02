import { useState, useMemo } from 'react'
import FileUploader from '@/components/files/FileUploader'
import FileList from '@/components/files/FileList'
import { CostCenter, Project, ProjectFile } from '@/types'

interface ProjectFilesViewProps {
  project: Project
  files: ProjectFile[]
  fileCount: number
  loading?: boolean
  fetchError?: string | null
  onUploadComplete: (file: ProjectFile) => void
  onFileDeleted: (fileId: string) => void
  onFileUpdated?: (file: ProjectFile) => void
  onError: (error: string) => void
  onBack: () => void
  costCenters?: CostCenter[]
}

export default function ProjectFilesView({
  project,
  files,
  fileCount,
  loading = false,
  fetchError,
  onUploadComplete,
  onFileDeleted,
  onFileUpdated,
  onError,
  onBack,
  costCenters = [],
}: ProjectFilesViewProps) {
  const [targetUploadFolder, setTargetUploadFolder] = useState('__root')

  // Extract unique custom folder names
  const customFolders = useMemo(() => {
    const set = new Set<string>()
    files.forEach((f) => {
      const parts = f.path.split('/')
      if (parts.length > 1 && parts[1].startsWith('folder_')) {
        set.add(decodeURIComponent(parts[1].replace('folder_', '')))
      }
    })
    return Array.from(set)
  }, [files])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-base">folder_open</span>
            {project.name}
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {fileCount} file{fileCount === 1 ? '' : 's'} across project root, cost centers & custom directories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-border-dark px-3 py-1 text-xs font-semibold text-text-muted capitalize">
            {project.status}
          </span>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-dark px-3 py-1.5 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Project Folders
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-xs text-red-200">
          {fetchError}
        </div>
      )}

      {/* Grid: Uploader on Left, Full Folder Tree on Right */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Upload Files</h2>
              <span className="text-[11px] text-text-muted">Max 20MB</span>
            </div>
            <FileUploader
              projectId={project.id}
              onUploadComplete={onUploadComplete}
              onError={onError}
              costCenters={costCenters}
              customFolders={customFolders}
              initialFolderKey={targetUploadFolder}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
          <FileList
            files={files}
            loading={loading}
            onFileDeleted={onFileDeleted}
            onFileUpdated={onFileUpdated}
            onError={onError}
            costCenters={costCenters}
            projectId={project.id}
            onFolderCreated={onUploadComplete}
            onSelectFolderForUpload={(key) => setTargetUploadFolder(key)}
          />
        </div>
      </div>
    </div>
  )
}
