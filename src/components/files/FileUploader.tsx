import { useCallback, useState } from 'react'
import { useUploadFile } from '@/hooks/useFiles'

interface FileUploaderProps {
  projectId: string
  onUploadComplete: (file: any) => void
  onError: (error: string) => void
}

export default function FileUploader({
  projectId,
  onUploadComplete,
  onError,
}: FileUploaderProps) {
  const { upload, uploading } = useUploadFile()
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = useCallback(
    async (file: File) => {
      try {
        console.log('[FileUploader] Starting upload for file:', file.name)
        const result = await upload(projectId, file, setProgress)
        console.log('[FileUploader] Upload successful')
        onUploadComplete(result)
        setProgress(0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        console.error('[FileUploader] Upload failed:', message)
        onError(message)
        setProgress(0)
      }
    },
    [projectId, upload, onUploadComplete, onError]
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

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border-dark bg-card-dark hover:border-primary/50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="file"
        onChange={handleChange}
        disabled={uploading}
        className="hidden"
        id="file-input"
      />

      <label htmlFor="file-input" className={uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
        <div className="flex flex-col items-center gap-2">
          <svg className="h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium text-text-muted">
            {uploading ? `Uploading... ${progress}%` : 'Drag and drop or click to upload'}
          </p>
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
