import { useCallback, useMemo, useState } from 'react'
import { CostCenter, ProjectFile } from '@/types'
import {
  useDeleteFile,
  useDeleteFolder,
  useCreateFolder,
  useRenameFile,
  getSignedDownloadUrl,
  getSignedPreviewUrl,
} from '@/hooks/useFiles'
import { usePermissions } from '@/hooks/usePermissions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface FileListProps {
  files: ProjectFile[]
  loading?: boolean
  onFileDeleted: (fileId: string) => void
  onFileUpdated?: (file: ProjectFile) => void
  onError: (error: string) => void
  costCenters?: CostCenter[]
  projectId?: string
  onFolderCreated?: (folderFile: ProjectFile) => void
  onSelectFolderForUpload?: (folderKey: string) => void
  onFolderDeleted?: (deletedFileIds: string[]) => void
}

export default function FileList({
  files,
  loading = false,
  onFileDeleted,
  onFileUpdated,
  onError,
  costCenters = [],
  projectId,
  onFolderCreated,
  onSelectFolderForUpload,
  onFolderDeleted,
}: FileListProps) {
  const { hasPermission, isAdmin } = usePermissions()
  const canCreateFolder = isAdmin || hasPermission('files.create_folder')
  const canDeleteFile = isAdmin || hasPermission('files.delete')
  const canRenameFile = isAdmin || hasPermission('files.rename') || hasPermission('files.upload')

  const { deleteFile, deleting } = useDeleteFile()
  const { deleteFolder } = useDeleteFolder()
  const { createFolder, creating: isCreatingFolder } = useCreateFolder()
  const { renameFile, renaming } = useRenameFile()

  const [previewFile, setPreviewFile] = useState<{ file: ProjectFile; url: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<{ name: string; folderKey: string; files: ProjectFile[] } | null>(null)
  const [fileToRename, setFileToRename] = useState<ProjectFile | null>(null)
  const [newFileName, setNewFileName] = useState('')

  const costCenterMap = useMemo(() => {
    const map: Record<string, string> = {}
    costCenters.forEach((cc) => {
      map[`cost_center_${cc.id}`] = cc.name
    })
    return map
  }, [costCenters])

  const groups = useMemo(() => {
    const grouped: Record<string, ProjectFile[]> = { __root: [] }

    // Pre-populate all cost centers as visible folders
    costCenters.forEach((cc) => {
      grouped[`cost_center_${cc.id}`] = []
    })

    // Populate files into groups
    files.forEach((file) => {
      const folderKey = extractFolderKey(file.path)
      if (!grouped[folderKey]) grouped[folderKey] = []
      if (file.name !== '.keep') {
        grouped[folderKey].push(file)
      }
    })

    return grouped
  }, [files, costCenters])

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    const targetProjectId = projectId || (files[0] ? files[0].project_id : '')
    if (!targetProjectId) {
      onError('Unable to determine project for new folder')
      return
    }

    try {
      const result = await createFolder(targetProjectId, newFolderName.trim())
      if (result) {
        onFolderCreated?.(result)
      }
      setIsNewFolderModalOpen(false)
      setNewFolderName('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return
    try {
      await deleteFile(fileToDelete.id, fileToDelete.path)
      onFileDeleted(fileToDelete.id)
      setFileToDelete(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return
    const targetProjectId = projectId || (files[0] ? files[0].project_id : '')
    if (!targetProjectId) {
      onError('Unable to determine project for folder deletion')
      return
    }
    try {
      const deletedIds = await deleteFolder(targetProjectId, folderToDelete.folderKey, folderToDelete.files)
      deletedIds.forEach((id) => onFileDeleted(id))
      onFolderDeleted?.(deletedIds)
      setFolderToDelete(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete folder')
    }
  }

  const handleConfirmRenameFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileToRename || !newFileName.trim()) return

    try {
      const updated = await renameFile(fileToRename.id, newFileName.trim())
      onFileUpdated?.(updated)
      setFileToRename(null)
      setNewFileName('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to rename file')
    }
  }

  const handleDownload = useCallback(
    async (file: ProjectFile) => {
      try {
        setDownloadingId(file.id)
        const url = await getSignedDownloadUrl(file.path)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to download file')
      } finally {
        setDownloadingId(null)
      }
    },
    [onError]
  )

  const handlePreview = useCallback(
    async (file: ProjectFile) => {
      try {
        setPreviewLoading(true)
        const url = await getSignedPreviewUrl(file.path)
        setPreviewFile({ file, url })
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to generate preview')
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
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/')
    )
  }

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted text-xs flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading files...</span>
      </div>
    )
  }

  const getFolderLabel = (key: string) => {
    if (key === '__root') return 'General Project Files'
    if (key.startsWith('cost_center_')) {
      return costCenterMap[key] ? `PO / Cost Center: ${costCenterMap[key]}` : 'Cost Center'
    }
    if (key.startsWith('folder_')) {
      return key.replace('folder_', '').replace(/_/g, ' ')
    }
    return key
  }

  const groupEntries = Object.entries(groups).filter(
    ([key, groupFiles]) =>
      key.startsWith('cost_center_') ||
      key.startsWith('folder_') ||
      (key === '__root' && groupFiles.length > 0)
  )

  return (
    <div className="space-y-4">
      {/* File Categories / Folders Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Folder Directory ({groupEntries.length})
          </h4>
          {canCreateFolder && (
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-background-dark hover:bg-primary/20 hover:text-primary text-text-muted border border-border-dark text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-sm text-primary">create_new_folder</span>
              New Folder
            </button>
          )}
        </div>

        {groupEntries.map(([groupKey, groupFiles]) => {
          const folderLabel = getFolderLabel(groupKey)
          const isCostCenter = groupKey.startsWith('cost_center_')
          const isCustom = groupKey.startsWith('folder_')

          return (
            <div key={groupKey} className="space-y-2 bg-background-dark/30 rounded-xl p-3 border border-border-dark/60">
              {/* Folder Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isCostCenter
                        ? 'bg-amber-500/20 text-amber-400'
                        : isCustom
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isCostCenter ? 'account_tree' : isCustom ? 'folder_special' : 'folder'}
                    </span>
                  </div>
                  <span>{folderLabel}</span>
                  <span className="text-[11px] font-normal text-text-muted">
                    ({groupFiles.length} {groupFiles.length === 1 ? 'file' : 'files'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onSelectFolderForUpload && (
                    <button
                      type="button"
                      onClick={() => onSelectFolderForUpload(groupKey)}
                      className="text-[11px] text-text-muted hover:text-primary flex items-center gap-1 transition-colors"
                      title={`Upload directly into ${folderLabel}`}
                    >
                      <span className="material-symbols-outlined text-xs">upload_file</span>
                      Upload here
                    </button>
                  )}
                  {isCustom && canDeleteFile && (
                    <button
                      type="button"
                      onClick={() => setFolderToDelete({ name: folderLabel, folderKey: groupKey, files: groupFiles })}
                      className="p-1 hover:bg-red-500/20 rounded-lg text-text-muted hover:text-red-400 transition-colors flex items-center justify-center"
                      title={`Delete folder "${folderLabel}" and all files`}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Files in this group */}
              {groupFiles.length === 0 ? (
                <div className="p-3 border border-dashed border-border-dark/40 rounded-lg text-center bg-card-dark/40">
                  <p className="text-[11px] text-text-muted/60">No files in this folder yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-dark bg-card-dark hover:bg-card-dark/80 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex-shrink-0">{getFileIcon(file.mime_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {formatSize(file.size_bytes)} | {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        {isPreviewable(file.mime_type) && (
                          <button
                            type="button"
                            onClick={() => handlePreview(file)}
                            disabled={previewLoading}
                            className="p-1.5 hover:bg-border-dark rounded-lg text-text-muted hover:text-white transition-colors"
                            title="Preview file inline"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                          className="p-1.5 hover:bg-border-dark rounded-lg text-text-muted hover:text-white transition-colors"
                          title="Download file"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                        </button>

                        {canRenameFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setFileToRename(file)
                              setNewFileName(file.name)
                            }}
                            disabled={renaming}
                            className="p-1.5 hover:bg-border-dark rounded-lg text-text-muted hover:text-primary transition-colors"
                            title="Rename file / photo"
                          >
                            <span className="material-symbols-outlined text-base">drive_file_rename_outline</span>
                          </button>
                        )}

                        {canDeleteFile && (
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            disabled={deleting}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-text-muted hover:text-red-400 transition-colors"
                            title="Delete file"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New Custom Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card-dark border border-border-dark rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">create_new_folder</span>
                Create Custom Folder
              </h3>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-muted">Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. As-Builts, Site Photos, Compliance..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark/60">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-dark text-xs text-text-muted hover:text-white hover:bg-background-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {fileToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card-dark border border-border-dark rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">drive_file_rename_outline</span>
                Rename File / Photo
              </h3>
              <button
                type="button"
                onClick={() => setFileToRename(null)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmRenameFile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-muted">Display Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter new file name..."
                  autoFocus
                  required
                  disabled={renaming}
                  className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark/60">
                <button
                  type="button"
                  onClick={() => setFileToRename(null)}
                  disabled={renaming}
                  className="px-3 py-1.5 rounded-lg border border-border-dark text-xs text-text-muted hover:text-white hover:bg-background-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !newFileName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {renaming ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile.file}
          previewUrl={previewFile.url}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Native Confirm Dialog: Delete File */}
      <ConfirmDialog
        isOpen={Boolean(fileToDelete)}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleConfirmDeleteFile}
        title="Delete Document File?"
        message={
          fileToDelete ? (
            <p>
              Are you sure you want to delete <strong className="text-white">"{fileToDelete.name}"</strong>? This will permanently remove it from cloud storage.
            </p>
          ) : (
            ''
          )
        }
        confirmText="Delete File"
        variant="danger"
        icon="delete"
      />

      {/* Native Confirm Dialog: Delete Folder */}
      <ConfirmDialog
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDeleteFolder}
        title="Delete Folder and Contents?"
        message={
          folderToDelete ? (
            <p>
              Are you sure you want to delete the folder <strong className="text-white">"{folderToDelete.name}"</strong> and all <strong className="text-amber-400">{folderToDelete.files.length} file(s)</strong> inside it? This action cannot be undone.
            </p>
          ) : (
            ''
          )
        }
        confirmText="Delete Folder"
        variant="danger"
        icon="folder_delete"
      />
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card-dark rounded-2xl border border-border-dark max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-dark">
          <div className="flex items-center gap-2 min-w-0">
            {getFileIcon(file.mime_type)}
            <h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-border-dark rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
          {file.mime_type?.startsWith('image/') ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg shadow-md"
            />
          ) : file.mime_type === 'application/pdf' ? (
            <iframe
              src={previewUrl}
              className="w-full h-[75vh] rounded-lg border border-border-dark"
              title={file.name}
            />
          ) : (
            <p className="text-text-muted text-xs">Preview not supported for this file format.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) {
    return <span className="material-symbols-outlined text-text-muted text-xl">draft</span>
  }
  if (mimeType.startsWith('image/')) {
    return <span className="material-symbols-outlined text-primary text-xl">image</span>
  }
  if (mimeType === 'application/pdf') {
    return <span className="material-symbols-outlined text-red-400 text-xl">picture_as_pdf</span>
  }
  return <span className="material-symbols-outlined text-text-muted text-xl">description</span>
}

function extractFolderKey(path: string): string {
  const segments = path.split('/')
  if (segments.length < 2) return '__root'
  const folderSegment = segments[1]
  if (folderSegment.startsWith('cost_center_')) {
    return folderSegment
  }
  if (folderSegment.startsWith('folder_')) {
    return folderSegment
  }
  return '__root'
}
