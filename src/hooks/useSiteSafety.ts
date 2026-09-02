import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SiteAttendance, SiteAttendanceFormData, SiteEvacuation } from '@/types'

export function useSiteAttendance(projectId?: string) {
  const [attendances, setAttendances] = useState<SiteAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendances = useCallback(async () => {
    if (!projectId) {
      setAttendances([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: usersData }] = await Promise.all([
        supabase
          .from('site_attendances')
          .select('*')
          .eq('project_id', projectId)
          .order('signed_in_at', { ascending: false }),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((a: any) => ({
        ...a,
        user: a.user_id ? userMap.get(a.user_id) : undefined,
      }))

      setAttendances(enriched as SiteAttendance[])
    } catch (err) {
      console.error('Failed to fetch site attendances:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch site attendances')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAttendances()

    if (!projectId) return
    const channel = supabase
      .channel(`site_attendance_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_attendances', filter: `project_id=eq.${projectId}` },
        () => fetchAttendances()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchAttendances])

  return { attendances, loading, error, refresh: fetchAttendances }
}

export function useSiteSignIn() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(
    async (data: SiteAttendanceFormData) => {
      try {
        setIsPending(true)
        setError(null)

        const { data: record, error: err } = await supabase
          .from('site_attendances')
          .insert({
            project_id: data.project_id,
            user_id: user?.id || null,
            person_name: data.person_name.trim(),
            person_type: data.person_type || 'subcontractor',
            company_name: data.company_name?.trim() || null,
            phone: data.phone?.trim() || null,
            emergency_contact_phone: data.emergency_contact_phone?.trim() || null,
            selfie_photo_url: data.selfie_photo_url || null,
            induction_confirmed: data.induction_confirmed ?? true,
            hazards_acknowledged: data.hazards_acknowledged ?? true,
            status: 'on_site',
            accounted_for: false,
            notes: data.notes?.trim() || null,
          })
          .select()
          .single()

        if (err) throw err
        return record as SiteAttendance
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to sign into site'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  const signOut = useCallback(async (attendanceId: string) => {
    try {
      setIsPending(true)
      const { error: err } = await supabase
        .from('site_attendances')
        .update({
          status: 'signed_out',
          signed_out_at: new Date().toISOString(),
        })
        .eq('id', attendanceId)

      if (err) throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  const toggleAccountedFor = useCallback(async (attendanceId: string, accountedFor: boolean) => {
    try {
      const { error: err } = await supabase
        .from('site_attendances')
        .update({ accounted_for: accountedFor })
        .eq('id', attendanceId)

      if (err) throw err
    } catch (err) {
      console.error('Failed to toggle muster status:', err)
    }
  }, [])

  return { signIn, signOut, toggleAccountedFor, isPending, error }
}

export function useEvacuationRollCall() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)

  const initiateRollCall = useCallback(
    async (projectId: string, totalOnSite: number, drillType: 'fire_drill' | 'emergency_evacuation' = 'fire_drill') => {
      try {
        setIsPending(true)
        // Reset all currently on site to not accounted for yet
        await supabase
          .from('site_attendances')
          .update({ accounted_for: false })
          .eq('project_id', projectId)
          .eq('status', 'on_site')

        const { data: record, error: err } = await supabase
          .from('site_evacuations')
          .insert({
            project_id: projectId,
            initiated_by: user?.id || null,
            drill_type: drillType,
            total_on_site: totalOnSite,
            accounted_for_count: 0,
            missing_count: totalOnSite,
          })
          .select()
          .single()

        if (err) throw err
        return record as SiteEvacuation
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { initiateRollCall, isPending }
}
