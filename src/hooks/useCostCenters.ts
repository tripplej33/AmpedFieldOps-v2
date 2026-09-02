import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CostCenter, CostCenterFormData } from '../types'

// NOTE: Placeholder folder creation removed - requires storage RLS policies to be fixed first
// When RLS is working, files uploaded to cost_center_<id> will auto-create the folder structure

export function useCostCenters(projectId?: string) {
  const { user } = useAuth()
  const [data, setData] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase.from('cost_centers').select('*').eq('user_id', user.id)
      if (projectId) query = query.eq('project_id', projectId)
      const { data: rows, error: err } = await query.order('created_at', { ascending: false })
      if (err) throw err
      setData((rows || []) as CostCenter[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cost centers')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, projectId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, isLoading, error, refresh: fetch }
}

export function useCreateCostCenter() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (data: CostCenterFormData) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const { data: inserted, error: err } = await supabase
          .from('cost_centers')
          .insert([{ ...data, user_id: user.id }])
          .select('*')
          .single()
        if (err) throw err

        // Auto-create folder for this cost center in project_files
        try {
          const keepPath = `project_${data.project_id}/cost_center_${inserted.id}/.keep`
          const keepBlob = new Blob([''], { type: 'text/plain' })
          await supabase.storage.from('project-files').upload(keepPath, keepBlob, { upsert: true })
          await supabase.from('project_files').insert({
            project_id: data.project_id,
            path: keepPath,
            name: '.keep',
            size_bytes: 0,
            mime_type: 'text/plain',
            uploaded_by: user.id,
          })
        } catch (folderErr) {
          console.warn('[useCostCenters] Auto-create folder note:', folderErr)
        }

        return inserted as CostCenter
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create cost center')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useUpdateCostCenter() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (id: string, data: Partial<CostCenterFormData>) => {
    if (!user?.id) { setError('User not authenticated'); return null }
    setIsPending(true)
    setError(null)
    try {
      const { data: updated, error: err } = await supabase
        .from('cost_centers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single()
      if (err) throw err
      return updated as CostCenter
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cost center')
      return null
    } finally {
      setIsPending(false)
    }
  }, [user?.id])

  return { mutate, isPending, error }
}

export function useDeleteCostCenter() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (id: string) => {
    if (!user?.id) { setError('User not authenticated'); return false }
    setIsPending(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (err) throw err
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cost center')
      return false
    } finally {
      setIsPending(false)
    }
  }, [user?.id])

  return { mutate, isPending, error }
}
