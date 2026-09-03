import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProjectSitePhoto } from '@/types/photos'

export function useSitePhotos(projectId?: string) {
  const [photos, setPhotos] = useState<ProjectSitePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('project_site_photos')
        .select(`
          *,
          uploader:users!uploaded_by(id, full_name)
        `)
        .order('taken_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error: err } = await query

      if (err) throw err
      setPhotos((data || []) as ProjectSitePhoto[])
    } catch (err) {
      console.error('[useSitePhotos] Error fetching photos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load site photos')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchPhotos()

    const channel = supabase
      .channel('project_site_photos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_site_photos' }, () => fetchPhotos())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPhotos])

  const uploadPhoto = async ({
    file,
    category,
    caption,
    latitude,
    longitude,
    dataUrl,
  }: {
    file?: File
    category: ProjectSitePhoto['category']
    caption?: string
    latitude?: number | null
    longitude?: number | null
    dataUrl?: string
  }): Promise<ProjectSitePhoto> => {
    try {
      setUploading(true)
      const { data: authData } = await supabase.auth.getUser()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`
      const filePath = `site_photos/${projectId || 'general'}/${fileName}`

      let photoUrl = ''

      if (dataUrl) {
        // Convert base64 dataUrl to blob
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const { error: uploadErr } = await supabase.storage
          .from('project-files')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })

        if (uploadErr) throw uploadErr

        const { data: publicUrlData } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      } else if (file) {
        const { error: uploadErr } = await supabase.storage
          .from('project-files')
          .upload(filePath, file, { upsert: true })

        if (uploadErr) throw uploadErr

        const { data: publicUrlData } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      }

      const { data, error: insertErr } = await supabase
        .from('project_site_photos')
        .insert([
          {
            project_id: projectId,
            photo_url: photoUrl,
            category,
            caption: caption || null,
            latitude: latitude || null,
            longitude: longitude || null,
            taken_at: new Date().toISOString(),
            uploaded_by: authData?.user?.id || null,
          },
        ])
        .select(`
          *,
          uploader:users!uploaded_by(id, full_name)
        `)
        .single()

      if (insertErr) throw insertErr
      await fetchPhotos()
      return data as ProjectSitePhoto
    } finally {
      setUploading(false)
    }
  }

  const updatePhoto = async (id: string, updates: Partial<ProjectSitePhoto>) => {
    const { error: err } = await supabase
      .from('project_site_photos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (err) throw err
    await fetchPhotos()
  }

  const deletePhoto = async (id: string) => {
    const { error: err } = await supabase.from('project_site_photos').delete().eq('id', id)
    if (err) throw err
    await fetchPhotos()
  }

  return {
    photos,
    loading,
    uploading,
    error,
    refresh: fetchPhotos,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
  }
}
