import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ProjectFile } from '@/types'

export function useFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setFiles([])
      return
    }

    const fetchFiles = async () => {
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

    fetchFiles()
  }, [projectId])

  return { files, loading, error }
}

export function useUploadFile() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (
    projectId: string,
    file: File,
    onProgress?: (progress: number) => void,
    costCenterId?: string
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

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      // Build storage path with optional cost center subdirectory
      const storagePath = costCenterId
        ? `project_${projectId}/cost_center_${costCenterId}/${filename}`
        : `project_${projectId}/${filename}`

      console.log('[useFiles] Uploading:', { projectId, storagePath, fileName: file.name, size: file.size })

      // Upload to storage with progress tracking
      const { data: _storageData, error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadErr) {
        console.error('[useFiles] Storage upload error:', uploadErr)
        throw uploadErr
      }

      console.log('[useFiles] Storage upload success, creating metadata record')

      // Create metadata record with explicit auth context
      const { data: metadata, error: metadataErr } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          path: storagePath,
          name: file.name,
          size_bytes: file.size,
          mime_type: file.type || null,
          uploaded_by: userId,
        })
        .select()
        .single()

      if (metadataErr) {
        console.error('[useFiles] Metadata insert error:', metadataErr)
        // If metadata creation fails, try to clean up storage
        const { error: cleanupErr } = await supabase.storage
          .from('project-files')
          .remove([storagePath])
        if (cleanupErr) console.error('[useFiles] Cleanup error after failed metadata insert:', cleanupErr)
        throw metadataErr
      }

      console.log('[useFiles] Upload complete:', metadata)
      onProgress?.(100)
      return metadata
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

      if (storageErr) throw storageErr

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

export async function getSignedDownloadUrl(filePath: string): Promise<string> {
  try {
    console.log('[getSignedDownloadUrl] Creating signed URL for:', filePath)
    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) {
      console.error('[getSignedDownloadUrl] Error:', error)
      throw error
    }
    
    console.log('[getSignedDownloadUrl] Success')
    return data.signedUrl
  } catch (err) {
    console.error('[getSignedDownloadUrl] Failed:', err)
    throw err
  }
}

export async function getSignedPreviewUrl(filePath: string): Promise<string> {
  try {
    console.log('[getSignedPreviewUrl] Creating preview URL for:', filePath)
    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) {
      console.error('[getSignedPreviewUrl] Error:', error)
      throw error
    }
    
    console.log('[getSignedPreviewUrl] Success')
    return data.signedUrl
  } catch (err) {
    console.error('[getSignedPreviewUrl] Failed:', err)
    throw err
  }
}

export function getPreviewUrl(filePath: string): string {
  return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-files/${filePath}`
}
