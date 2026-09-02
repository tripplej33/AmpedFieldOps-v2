import { useCallback, useState } from 'react'
import { useUploadFile } from '@/hooks/useFiles'
import { usePermissions } from '@/hooks/usePermissions'
import type { CostCenter } from '@/types'

interface FileUploaderProps {
  projectId: string
  onUploadComplete: (file: any) => void
  onError: (error: string) => void
  costCenterId?: string
  costCenters?: CostCenter[]
  customFolders?: string[]
  initialFolderKey?: string
}

export default function FileUploader({
  projectId,
  onUploadComplete,
  onError,
  costCenterId,
  costCenters = [],
  customFolders = [],
  initialFolderKey = '__root',
}: FileUploaderProps) {
  const { hasPermission, isAdmin } = usePermissions()
  const canUpload = isAdmin || hasPermission('files.upload')
  const { upload, uploading } = useUploadFile()
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFolder, setSelectedFolder] = useState<string>(
    costCenterId ? `cost_center_${costCenterId}` : initialFolderKey
  )

  // Staged file for renaming prior to upload
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  if (!canUpload) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-border-dark bg-background-dark/30 text-center space-y-1">
        <span className="material-symbols-outlined text-3xl text-text-muted/40 block">lock</span>
        <p className="text-xs font-semibold text-white">Uploads Restricted</p>
        <p className="text-[11px] text-text-muted">Your role does not have permission to upload new files to this project.</p>
      </div>
    )
  }

  const handleStageFile = (file: File) => {
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

    try {
      let targetCostCenterId: string | undefined = undefined
      let targetCustomFolder: string | undefined = undefined

      if (selectedFolder.startsWith('cost_center_')) {
        targetCostCenterId = selectedFolder.replace('cost_center_', '')
      } else if (selectedFolder.startsWith('folder_')) {
        targetCustomFolder = decodeURIComponent(selectedFolder.replace('folder_', ''))
      }

      const result = await upload(
        projectId,
        stagedFile,
        setProgress,
        targetCostCenterId,
        targetCustomFolder,
        customFileName
      )

      handleCancelStaged()
      onUploadComplete(result)
      setProgress(0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('[FileUploader] Upload failed:', message)
      onError(message)
      setProgress(0)
    }
  }, [projectId, stagedFile, customFileName, selectedFolder, upload, onUploadComplete, onError])

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

  return (
    <div className="space-y-3">
      {/* Target Folder Selector */}
      {(costCenters.length > 0 || customFolders.length > 0) && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Target Destination Folder</label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            disabled={uploading}
            className="w-full h-[36px] px-3 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="__root">Project Root</option>
            {costCenters.length > 0 && (
              <optgroup label="Cost Centers">
                {costCenters.map((cc) => (
                  <option key={cc.id} value={`cost_center_${cc.id}`}>
                    Cost Center: {cc.name}
                  </option>
                ))}
              </optgroup>
            )}
            {customFolders.length > 0 && (
              <optgroup label="Custom Folders">
                {customFolders.map((cf) => (
                  <option key={cf} value={`folder_${encodeURIComponent(cf)}`}>
                    {cf}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {/* Staged File Confirmation & Rename Panel */}
      {stagedFile ? (
        <div className="p-4 rounded-xl border border-primary/40 bg-background-dark/80 space-y-3 animate-fadeIn shadow-lg">
          <div className="flex items-start gap-3">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Upload preview"
                className="w-16 h-16 object-cover rounded-lg border border-border-dark shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-card-dark border border-border-dark flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">drive_file_rename_outline</span>
                  Save File / Photo As
                </span>
                <span className="text-[10px] text-text-muted font-mono">
                  {(stagedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Enter custom file name..."
                disabled={uploading}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !uploading) {
                    e.preventDefault()
                    handleExecuteUpload()
                  }
                }}
                className="w-full px-3 py-1.5 bg-card-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-dark/60">
            <button
              type="button"
              onClick={handleCancelStaged}
              disabled={uploading}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteUpload}
              disabled={uploading || !customFileName.trim()}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading {progress}%...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>Upload File</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Dropzone Box */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border-dark bg-background-dark/50 hover:border-primary/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            onChange={handleChange}
            disabled={uploading}
            className="hidden"
            id="file-input"
          />

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            disabled={uploading}
            className="hidden"
            id="camera-input"
          />

          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary/80">cloud_upload</span>
            <p className="text-xs font-semibold text-white">
              {uploading ? `Uploading file... ${progress}%` : 'Click to select or drag & drop files here'}
            </p>
            <p className="text-[11px] text-text-muted">PDFs, blueprints, photos, or SWMS up to 20MB</p>

            <div className="flex items-center gap-2 mt-2">
              <label
                htmlFor="file-input"
                className="px-3 py-1.5 rounded-lg bg-card-dark border border-border-dark hover:border-primary text-xs font-medium text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
                Choose File
              </label>
              <label
                htmlFor="camera-input"
                className="px-3 py-1.5 rounded-lg bg-card-dark border border-border-dark hover:border-cyan-400 text-xs font-medium text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
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
      )}
    </div>
  )
}
