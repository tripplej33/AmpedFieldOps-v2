import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ProjectFile } from '@/types'

export function useFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = async () => {
    if (!projectId) {
      setFiles([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setFiles(data || [])
    } catch (err) {
      console.error('Failed to fetch files:', err)
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  return { files, loading, error, refresh: fetchFiles }
}

export function useUploadFile() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (
    projectId: string,
    file: File,
    onProgress?: (progress: number) => void,
    costCenterId?: string,
    customFolderName?: string,
    customFileName?: string
  ) => {
    setUploading(true)
    setError(null)

    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('File size exceeds 20MB limit')
      }

      // Get current user
      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData.user?.id) {
        throw new Error('Not authenticated')
      }
      const userId = authData.user.id

      // Determine final display file name and sanitized storage file name
      const displayName = customFileName && customFileName.trim() ? customFileName.trim() : file.name
      const timestamp = Date.now()
      const sanitizedName = displayName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}-${sanitizedName}`

      // Build storage path
      let storagePath = `project_${projectId}/${filename}`
      if (customFolderName && customFolderName.trim()) {
        const safeFolder = customFolderName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '_')
        storagePath = `project_${projectId}/folder_${encodeURIComponent(safeFolder)}/${filename}`
      } else if (costCenterId) {
        storagePath = `project_${projectId}/cost_center_${costCenterId}/${filename}`
      }

      // Upload to storage with progress tracking
      const { data: _storageData, error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadErr) {
        throw uploadErr
      }

      // Create metadata record
      const { data: metadata, error: metadataErr } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          path: storagePath,
          name: displayName,
          size_bytes: file.size,
          mime_type: file.type || null,
          uploaded_by: userId,
        })
        .select('*')
        .single()

      if (metadataErr) {
        console.error('[useFiles] Metadata insert error:', metadataErr)
        await supabase.storage.from('project-files').remove([storagePath])
        throw metadataErr
      }

      onProgress?.(100)
      return metadata as ProjectFile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('[useFiles] Upload error:', message, err)
      setError(message)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}

export function useRenameFile() {
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const renameFile = async (fileId: string, newName: string): Promise<ProjectFile> => {
    if (!fileId || !newName.trim()) {
      throw new Error('File ID and new file name are required')
    }

    setRenaming(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('project_files')
        .update({
          name: newName.trim(),
        })
        .eq('id', fileId)
        .select('*')
        .single()

      if (err) throw err
      return data as ProjectFile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename file'
      console.error('[useFiles] Rename error:', message, err)
      setError(message)
      throw err
    } finally {
      setRenaming(false)
    }
  }

  return { renameFile, renaming, error }
}

export function useCreateFolder() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFolder = async (projectId: string, folderName: string) => {
    if (!projectId || !folderName.trim()) {
      throw new Error('Project ID and folder name are required')
    }

    setCreating(true)
    setError(null)

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData.user?.id) {
        throw new Error('Not authenticated')
      }
      const userId = authData.user.id

      const safeFolder = folderName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '_')
      const storagePath = `project_${projectId}/folder_${encodeURIComponent(safeFolder)}/.keep`

      // Upload .keep marker
      const keepBlob = new Blob([''], { type: 'text/plain' })
      const { error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(storagePath, keepBlob, {
          contentType: 'text/plain',
          upsert: true,
        })

      if (uploadErr) {
        console.warn('[useCreateFolder] Storage marker note:', uploadErr)
      }

      // Insert placeholder metadata record
      const { data: metadata, error: metadataErr } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          path: storagePath,
          name: '.keep',
          size_bytes: 0,
          mime_type: 'text/plain',
          uploaded_by: userId,
        })
        .select('*')
        .single()

      if (metadataErr) {
        console.warn('[useCreateFolder] Metadata note:', metadataErr)
      }

      return metadata as ProjectFile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create folder'
      setError(message)
      throw err
    } finally {
      setCreating(false)
    }
  }

  return { createFolder, creating, error }
}

export function useDeleteFile() {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFile = async (fileId: string, path: string) => {
    setDeleting(true)
    setError(null)

    try {
      // Delete from storage
      const { error: storageErr } = await supabase.storage
        .from('project-files')
        .remove([path])

      if (storageErr) console.warn('Storage deletion note:', storageErr)

      // Delete metadata record
      const { error: metadataErr } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)

      if (metadataErr) throw metadataErr
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
      throw err
    } finally {
      setDeleting(false)
    }
  }

  return { deleteFile, deleting, error }
}

export function useDeleteFolder() {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFolder = async (
    projectId: string,
    folderKey: string,
    filesInFolder: ProjectFile[] = []
  ): Promise<string[]> => {
    setDeleting(true)
    setError(null)

    try {
      const prefix = `project_${projectId}/${folderKey}/`

      // 1. Fetch all project_files belonging to this folder prefix (including .keep and any hidden files)
      const { data: matchedDbFiles } = await supabase
        .from('project_files')
        .select('id, path')
        .eq('project_id', projectId)
        .like('path', `${prefix}%`)

      const allFiles = [...(matchedDbFiles || []), ...filesInFolder]
      const paths = Array.from(new Set(allFiles.map((f) => f.path).filter(Boolean)))
      const ids = Array.from(new Set(allFiles.map((f) => f.id).filter(Boolean)))

      // 2. Remove files from storage
      if (paths.length > 0) {
        await supabase.storage.from('project-files').remove(paths)
      }

      // Also clean up any orphan files in storage folder
      try {
        const { data: storageList } = await supabase.storage
          .from('project-files')
          .list(`project_${projectId}/${folderKey}`)
        if (storageList && storageList.length > 0) {
          const extraStoragePaths = storageList.map((item) => `${prefix}${item.name}`)
          await supabase.storage.from('project-files').remove(extraStoragePaths)
        }
      } catch (listErr) {
        console.warn('Storage folder cleanup note:', listErr)
      }

      // 3. Delete from database
      if (ids.length > 0) {
        const { error: err } = await supabase
          .from('project_files')
          .delete()
          .in('id', ids)
        if (err) throw err
      }

      return ids
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder'
      setError(message)
      throw err
    } finally {
      setDeleting(false)
    }
  }

  return { deleteFolder, deleting, error }
}

export async function getSignedDownloadUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  } catch (err) {
    console.error('[getSignedDownloadUrl] Failed:', err)
    throw err
  }
}

export async function getSignedPreviewUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  } catch (err) {
    console.error('[getSignedPreviewUrl] Failed:', err)
    throw err
  }
}

export function getPreviewUrl(filePath: string): string {
  return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-files/${filePath}`
}
