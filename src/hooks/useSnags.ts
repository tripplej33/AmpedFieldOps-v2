import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectSnag, ProjectSnagFormData, SnagStatus } from '@/types'

export function useSnags(projectId?: string) {
  const [snags, setSnags] = useState<ProjectSnag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnags = useCallback(async () => {
    if (!projectId) {
      setSnags([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: usersData }] = await Promise.all([
        supabase
          .from('project_snags')
          .select(`
            *,
            cost_center:cost_centers(id, name, customer_po_number)
          `)
          .eq('project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((s: any) => ({
        ...s,
        assignee: s.assigned_to ? userMap.get(s.assigned_to) : undefined,
      }))

      setSnags(enriched as ProjectSnag[])
    } catch (err) {
      console.error('Failed to fetch snags:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch snags')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSnags()
  }, [fetchSnags])

  return { snags, loading, error, refresh: fetchSnags }
}

export function useCreateSnag() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (data: ProjectSnagFormData) => {
      try {
        setIsPending(true)
        setError(null)

        const { data: snag, error: err } = await supabase
          .from('project_snags')
          .insert({
            project_id: data.project_id,
            cost_center_id: data.cost_center_id || null,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            location: data.location?.trim() || null,
            priority: data.priority || 'medium',
            status: 'open',
            assigned_to: data.assigned_to || null,
            due_date: data.due_date || null,
            photo_urls: data.photo_urls || [],
            created_by: user?.id || null,
          })
          .select()
          .single()

        if (err) throw err
        return snag as ProjectSnag
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create snag'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { create, isPending, error }
}

export function useUpdateSnagStatus() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)

  const updateStatus = useCallback(
    async (snagId: string, status: SnagStatus, assignedTo?: string) => {
      try {
        setIsPending(true)
        const updates: any = {
          status,
          updated_at: new Date().toISOString(),
        }
        if (status === 'in_progress') {
          updates.assigned_to = assignedTo || user?.id || null
        }
        if (status === 'closed') {
          updates.resolved_at = new Date().toISOString()
        }

        const { error } = await supabase
          .from('project_snags')
          .update(updates)
          .eq('id', snagId)

        if (error) throw error
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { updateStatus, isPending }
}
