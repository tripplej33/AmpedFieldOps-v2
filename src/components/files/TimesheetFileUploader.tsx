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

  // Staged file for renaming prior to upload
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const handleStageFile = (file: File) => {
    if (!projectId) {
      onError('Project must be selected first')
      return
    }
    setStagedFile(file)
    setCustomFileName(file.name)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImagePreviewUrl(url)
    } else {
      setImagePreviewUrl(null)
    }
  }

  const handleCancelStaged = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setStagedFile(null)
    setCustomFileName('')
    setImagePreviewUrl(null)
  }

  const handleExecuteUpload = useCallback(async () => {
    if (!stagedFile) return
    if (!projectId) {
      onError('Project must be selected')
      return
    }

    try {
      const result = await upload(
        projectId,
        stagedFile,
        setProgress,
        costCenterId,
        undefined,
        customFileName
      )
      handleCancelStaged()
      onUploadComplete(result)
      setProgress(0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('[TimesheetFileUploader] Upload failed:', message)
      onError(message)
      setProgress(0)
    }
  }, [projectId, stagedFile, customFileName, costCenterId, upload, onUploadComplete, onError])

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
      handleStageFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleStageFile(e.target.files[0])
    }
  }

  if (stagedFile) {
    return (
      <div className="p-3 rounded-xl border border-primary/40 bg-background-dark/90 space-y-2.5 animate-fadeIn">
        <div className="flex items-start gap-2.5">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Photo preview"
              className="w-12 h-12 object-cover rounded-lg border border-border-dark shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-card-dark border border-border-dark flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-xs">drive_file_rename_outline</span>
                Name Photo / File
              </label>
              <span className="text-[10px] text-text-muted">
                {(stagedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="e.g. site_inspection_photo.jpg"
              autoFocus
              disabled={uploading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !uploading) {
                  e.preventDefault()
                  handleExecuteUpload()
                }
              }}
              className="w-full px-2.5 py-1 bg-card-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-dark/60">
          <button
            type="button"
            onClick={handleCancelStaged}
            disabled={uploading}
            className="px-2.5 py-1 text-xs text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteUpload}
            disabled={uploading || !customFileName.trim()}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading {progress}%...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xs">cloud_upload</span>
                <span>Save Attachment</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          id="timesheet-file-input"
          type="file"
          onChange={handleChange}
          disabled={uploading || !projectId}
          className="hidden"
        />
        <input
          id="timesheet-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          disabled={uploading || !projectId}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => document.getElementById('timesheet-file-input')?.click()}
          disabled={uploading || !projectId}
          className="flex items-center gap-1 rounded-lg border border-border-dark px-2.5 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach document or receipt"
        >
          <span className="material-symbols-outlined text-sm">attach_file</span>
          Attach File
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('timesheet-camera-input')?.click()}
          disabled={uploading || !projectId}
          className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Take photo on mobile"
        >
          <span className="material-symbols-outlined text-sm">photo_camera</span>
          Take Photo
        </button>
      </div>
    )
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
        dragActive
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
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={uploading || !projectId}
        className="hidden"
        id="timesheet-camera-input"
      />

      <div className="flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-3xl text-primary/80">cloud_upload</span>
        <p className="text-xs font-medium text-white">
          {uploading ? `Uploading... ${progress}%` : 'Drag and drop or select photos / work receipts'}
        </p>
        <p className="text-[11px] text-text-muted">PDFs, blueprints, or photos up to 20MB</p>

        <div className="flex items-center gap-2 mt-2">
          <label
            htmlFor="timesheet-file-input"
            className="px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-primary text-xs font-medium text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
            Choose File
          </label>
          <label
            htmlFor="timesheet-camera-input"
            className="px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-cyan-400 text-xs font-medium text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">photo_camera</span>
            Take Photo
          </label>
        </div>
      </div>

      {uploading && (
        <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-xs flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
