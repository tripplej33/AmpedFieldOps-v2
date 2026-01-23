import FileUploader from '@/components/files/FileUploader'
import FileList from '@/components/files/FileList'
import { Project, ProjectFile } from '@/types'

interface ProjectFilesViewProps {
  project: Project
  files: ProjectFile[]
  fileCount: number
  loading?: boolean
  fetchError?: string | null
  onUploadComplete: (file: ProjectFile) => void
  onFileDeleted: (fileId: string) => void
  onError: (error: string) => void
  onBack: () => void
}

export default function ProjectFilesView({
  project,
  files,
  fileCount,
  loading = false,
  fetchError,
  onUploadComplete,
  onFileDeleted,
  onError,
  onBack,
}: ProjectFilesViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-base">folder_open</span>
            {project.name}
          </div>
          <p className="mt-2 text-sm text-text-muted">{fileCount} file{fileCount === 1 ? '' : 's'} in this project</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-border-dark px-3 py-1 text-xs font-semibold text-text-muted capitalize">
            {project.status}
          </span>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-border-dark px-3 py-2 text-sm font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to folders
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-200">
          {fetchError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Upload Files</h2>
              <span className="text-xs text-text-muted">Max 20MB</span>
            </div>
            <FileUploader
              projectId={project.id}
              onUploadComplete={onUploadComplete}
              onError={onError}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Files ({fileCount})</h2>
            <div className="inline-flex items-center gap-1 rounded-full bg-border-dark px-3 py-1 text-[11px] font-semibold text-text-muted">
              <span className="material-symbols-outlined text-sm">cloud_download</span>
              Signed URLs, 1-hour expiry
            </div>
          </div>
          <FileList
            files={files}
            loading={loading}
            onFileDeleted={onFileDeleted}
            onError={onError}
          />
        </div>
      </div>
    </div>
  )
}
