import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProjectMember } from '@/types'

export function useProjectMembers(projectId?: string) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!projectId) {
      setMembers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('project_members')
        .select(
          `
          id,
          project_id,
          user_id,
          role_in_project,
          assigned_at,
          user:users(id, full_name, email, role)
        `
        )
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: true })

      if (err) throw err
      const formatted: ProjectMember[] = ((data as any[]) || []).map((row) => ({
        id: row.id,
        project_id: row.project_id,
        user_id: row.user_id,
        role_in_project: row.role_in_project,
        assigned_at: row.assigned_at,
        user: Array.isArray(row.user) ? row.user[0] : row.user,
      }))
      setMembers(formatted)
    } catch (err) {
      console.error('Failed to fetch project members:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project members')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const assignMember = async (userId: string, roleInProject: string = 'technician') => {
    if (!projectId) return
    try {
      const { data, error: err } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role_in_project: roleInProject,
        })
        .select(
          `
          id,
          project_id,
          user_id,
          role_in_project,
          assigned_at,
          user:users(id, full_name, email, role)
        `
        )
        .single()

      if (err) throw err
      const raw = data as any
      const newMember: ProjectMember = {
        id: raw.id,
        project_id: raw.project_id,
        user_id: raw.user_id,
        role_in_project: raw.role_in_project,
        assigned_at: raw.assigned_at,
        user: Array.isArray(raw.user) ? raw.user[0] : raw.user,
      }
      setMembers((prev) => [...prev, newMember])
      return newMember
    } catch (err) {
      console.error('Failed to assign member:', err)
      throw err
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { error: err } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (err) throw err
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error('Failed to remove member:', err)
      throw err
    }
  }

  return {
    members,
    loading,
    error,
    refresh: fetchMembers,
    assignMember,
    removeMember,
  }
}
