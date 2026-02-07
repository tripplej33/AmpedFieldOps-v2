import { useCallback, useMemo, useState } from 'react'
import { CostCenter, ProjectFile } from '@/types'
import { useDeleteFile, getSignedDownloadUrl, getSignedPreviewUrl } from '@/hooks/useFiles'

interface FileListProps {
  files: ProjectFile[]
  loading?: boolean
  onFileDeleted: (fileId: string) => void
  onError: (error: string) => void
  costCenters?: CostCenter[]
}

export default function FileList({
  files,
  loading = false,
  onFileDeleted,
  onError,
  costCenters = [],
}: FileListProps) {
  const { deleteFile, deleting } = useDeleteFile()
  const [previewFile, setPreviewFile] = useState<{ file: ProjectFile; url: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const costCenterMap = useMemo(() => {
    const map: Record<string, string> = {}
    costCenters.forEach((cc) => {
      map[cc.id] = cc.name
    })
    return map
  }, [costCenters])

  const groups = useMemo(() => {
    const grouped: Record<string, ProjectFile[]> = { __root: [] }
    files.forEach((file) => {
      if (file.name === '.keep') return // Hide placeholder marker
      const ccId = extractCostCenterId(file.path)
      const key = ccId || '__root'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(file)
      console.log('[FileList] Grouping file:', { name: file.name, path: file.path, ccId, key })
    })
    console.log('[FileList] Groups:', grouped)
    return grouped
  }, [files])

  const handleDelete = useCallback(
    async (file: ProjectFile) => {
      if (!confirm(`Delete "${file.name}"?`)) return

      try {
        await deleteFile(file.id, file.path)
        onFileDeleted(file.id)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to delete file')
      }
    },
    [deleteFile, onFileDeleted, onError]
  )

  const handleDownload = useCallback(
    async (file: ProjectFile) => {
      try {
        console.log('[FileList] Downloading:', file.name)
        setDownloadingId(file.id)
        const url = await getSignedDownloadUrl(file.path)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log('[FileList] Download initiated')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to download file'
        console.error('[FileList] Download error:', message)
        onError(message)
      } finally {
        setDownloadingId(null)
      }
    },
    [onError]
  )

  const handlePreview = useCallback(
    async (file: ProjectFile) => {
      if (!isPreviewable(file.mime_type)) return

      try {
        console.log('[FileList] Generating preview URL for:', file.name)
        setPreviewLoading(true)
        const url = await getSignedPreviewUrl(file.path)
        setPreviewFile({ file, url })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load preview'
        console.error('[FileList] Preview error:', message)
        onError(message)
      } finally {
        setPreviewLoading(false)
      }
    },
    [onError]
  )

  const isPreviewable = (mimeType: string | null | undefined) => {
    if (!mimeType) return false
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf'
    )
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Loading files...</div>
  }

  const groupEntries = Object.entries(groups)
  const totalFiles = groupEntries.reduce((acc, [, list]) => acc + list.length, 0)

  if (totalFiles === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p>No files uploaded yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {groupEntries.map(([groupKey, groupFiles]) => {
          // Skip empty groups
          if (groupFiles.length === 0) return null
          
          return (
            <div key={groupKey} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                <span className="material-symbols-outlined text-sm text-primary">folder</span>
                {groupKey === '__root' ? 'Project Root' : (costCenterMap[groupKey] || `Cost Center ${groupKey.slice(0, 8)}...`)}
                <span className="text-[11px] text-text-muted/80">({groupFiles.length})</span>
              </div>

            {groupFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border-dark bg-card-dark hover:bg-card-dark/80 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatSize(file.size_bytes)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isPreviewable(file.mime_type) && (
                    <button
                      onClick={() => handlePreview(file)}
                      disabled={previewLoading}
                      className="p-2 hover:bg-border-dark rounded-lg transition-colors disabled:opacity-50"
                      title="Preview"
                    >
                      {previewLoading ? (
                        <svg className="h-5 w-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    className="p-2 hover:bg-border-dark rounded-lg transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    {downloadingId === file.id ? (
                      <svg className="h-5 w-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleting}
                    className="p-2 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )})}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile.file}
          previewUrl={previewFile.url}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  )
}

function FilePreviewModal({
  file,
  previewUrl,
  onClose,
}: {
  file: ProjectFile
  previewUrl: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card-dark rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-dark">
          <h2 className="text-lg font-semibold text-white truncate">{file.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-border-dark rounded transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {file.mime_type?.startsWith('image/') ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-auto max-h-[70vh] object-contain"
              onError={(e) => {
                console.error('[FileList] Preview image failed to load:', e)
              }}
            />
          ) : file.mime_type === 'application/pdf' ? (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh]"
              title={file.name}
              onError={(e) => {
                console.error('[FileList] Preview PDF failed to load:', e)
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) {
    return (
      <svg className="h-6 w-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }

  if (mimeType.startsWith('image/')) {
    return (
      <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }

  if (mimeType === 'application/pdf') {
    return (
      <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      </svg>
    )
  }

  return (
    <svg className="h-6 w-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function extractCostCenterId(path: string): string | null {
  const segments = path.split('/')
  if (segments.length < 2) return null
  const costCenterSegment = segments[1]
  if (costCenterSegment.startsWith('cost_center_')) {
    return costCenterSegment.replace('cost_center_', '')
  }
  return null
}
