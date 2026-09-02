import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserInvitation, InviteUserFormData } from '@/types'

export function useUserInvitations() {
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: rolesData }, { data: usersData }] = await Promise.all([
        supabase
          .from('user_invitations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('*'),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const roleMap = new Map((rolesData || []).map((r) => [r.id, r]))
      const userMap = new Map((usersData || []).map((u) => [u.id, u]))

      const enriched = (rows || []).map((inv: any) => ({
        ...inv,
        role: roleMap.get(inv.role_id),
        inviter: inv.invited_by ? userMap.get(inv.invited_by) : undefined,
      }))

      setInvitations(enriched as UserInvitation[])
    } catch (err) {
      console.error('Failed to fetch user invitations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user invitations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { invitations, loading, error, refresh: fetchInvitations }
}

export function useCreateInvitation() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvitation = useCallback(
    async (data: InviteUserFormData) => {
      try {
        setIsPending(true)
        setError(null)

        // Generate high-entropy secure invitation token
        const rawToken = `${crypto.randomUUID()}-${Date.now().toString(36)}`

        const { data: created, error: err } = await supabase
          .from('user_invitations')
          .insert({
            email: data.email.toLowerCase().trim(),
            full_name: data.full_name.trim(),
            role_id: data.role_id,
            token: rawToken,
            invited_by: user?.id || null,
            status: 'pending',
          })
          .select()
          .single()

        if (err) throw err
        return created as UserInvitation
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create invitation'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  const revokeInvitation = useCallback(async (invitationId: string) => {
    try {
      setIsPending(true)
      const { error: err } = await supabase
        .from('user_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)

      if (err) throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  const resendInvitation = useCallback(async (invitationId: string) => {
    try {
      setIsPending(true)
      const newToken = `${crypto.randomUUID()}-${Date.now().toString(36)}`
      const { data: updated, error: err } = await supabase
        .from('user_invitations')
        .update({
          token: newToken,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single()

      if (err) throw err
      return updated as UserInvitation
    } finally {
      setIsPending(false)
    }
  }, [])

  return { createInvitation, revokeInvitation, resendInvitation, isPending, error }
}
