import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Role, RoleFormData } from '@/types'

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true })

      if (err) throw err
      setRoles((data || []) as Role[])
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  return { roles, loading, error, refresh: fetchRoles }
}

export function useSaveRole() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveRole = useCallback(async (data: RoleFormData, isNew: boolean) => {
    try {
      setIsPending(true)
      setError(null)

      const rolePayload = {
        id: data.id.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        permissions: data.permissions || [],
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { data: created, error: err } = await supabase
          .from('roles')
          .insert({
            ...rolePayload,
            is_system: false,
          })
          .select()
          .single()

        if (err) throw err
        return created as Role
      } else {
        const { data: updated, error: err } = await supabase
          .from('roles')
          .update(rolePayload)
          .eq('id', data.id)
          .select()
          .single()

        if (err) throw err
        return updated as Role
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save role'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsPending(false)
    }
  }, [])

  const deleteRole = useCallback(async (roleId: string) => {
    try {
      setIsPending(true)
      const { error: err } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)
        .eq('is_system', false)

      if (err) throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { saveRole, deleteRole, isPending, error }
}
