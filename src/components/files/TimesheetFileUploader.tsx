import { useState, useCallback } from 'react'
import { useUploadFile } from '@/hooks/useFiles'

interface TimesheetFileUploaderProps {
  projectId: string
  costCenterId?: string
  onUploadComplete: (file: any) => void
  onError: (error: string) => void
  compact?: boolean
}

export default function TimesheetFileUploader({
  projectId,
  costCenterId,
  onUploadComplete,
  onError,
  compact = false,
}: TimesheetFileUploaderProps) {
  const { upload, uploading } = useUploadFile()
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = useCallback(
    async (file: File) => {
      if (!projectId) {
        onError('Project must be selected')
        return
      }

      try {
        console.log('[TimesheetFileUploader] Starting upload for file:', file.name, {
          projectId,
          costCenterId,
        })
        const result = await upload(projectId, file, setProgress, costCenterId)
        console.log('[TimesheetFileUploader] Upload successful')
        onUploadComplete(result)
        setProgress(0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        console.error('[TimesheetFileUploader] Upload failed:', message)
        onError(message)
        setProgress(0)
      }
    },
    [projectId, costCenterId, upload, onUploadComplete, onError]
  )

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor="timesheet-file-input" className="flex items-center gap-2 cursor-pointer">
          <input
            id="timesheet-file-input"
            type="file"
            onChange={handleChange}
            disabled={uploading || !projectId}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => document.getElementById('timesheet-file-input')?.click()}
            disabled={uploading || !projectId}
            className="flex items-center gap-1 rounded-lg border border-border-dark px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">attach_file</span>
            {uploading ? `${progress}%` : 'Attach'}
          </button>
        </label>
        {costCenterId && (
          <span className="text-xs text-text-muted">
            (Cost Center: {costCenterId.slice(0, 8)}...)
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border-dark bg-card-dark hover:border-primary/50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="file"
        onChange={handleChange}
        disabled={uploading || !projectId}
        className="hidden"
        id="timesheet-file-input"
      />

      <label htmlFor="timesheet-file-input" className={uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-xs font-medium text-text-muted">
            {uploading ? `Uploading... ${progress}%` : 'Drag and drop or click to upload'}
          </p>
          {costCenterId && (
            <p className="text-xs text-text-muted">
              Folder: project / cost center
            </p>
          )}
          <p className="text-xs text-text-muted">Max 20MB</p>
        </div>
      </label>

      {uploading && (
        <div className="absolute inset-0 rounded-lg bg-black/20 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
