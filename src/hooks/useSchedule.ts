import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  JobSchedule,
  ScheduleStatus,
  ScheduleCreatePayload,
  ScheduleUpdatePayload,
  ScheduleFilterOptions,
} from '@/types/schedule'

export function useSchedule(filters?: ScheduleFilterOptions) {
  const [schedules, setSchedules] = useState<JobSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('job_schedules')
        .select(`
          *,
          project:projects(id, name, address, suburb, city, client:clients(name)),
          cost_center:cost_centers(id, name, customer_po_number),
          technician:users!technician_id(id, full_name, email, role, phone),
          completed_safety_doc:safety_documents!completed_safety_doc_id(id, title, status, pdf_url)
        `)
        .order('start_time', { ascending: true })

      if (filters?.startDate && filters?.endDate) {
        query = query.lte('start_time', filters.endDate).gte('end_time', filters.startDate)
      } else if (filters?.startDate) {
        query = query.gte('end_time', filters.startDate)
      } else if (filters?.endDate) {
        query = query.lte('start_time', filters.endDate)
      }
      if (filters?.technicianId && filters.technicianId !== 'all') {
        query = query.eq('technician_id', filters.technicianId)
      }
      if (filters?.projectId && filters.projectId !== 'all') {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      const { data, error: err } = await query

      if (err) throw err

      if (isMountedRef.current) {
        setSchedules((data || []) as JobSchedule[])
      }
    } catch (err) {
      console.error('[useSchedule] Error fetching schedules:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedules')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [filters?.startDate, filters?.endDate, filters?.technicianId, filters?.projectId, filters?.status])

  useEffect(() => {
    isMountedRef.current = true
    fetchSchedules()

    // Realtime channel subscription
    const channel = supabase
      .channel('job_schedules_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_schedules' },
        () => {
          fetchSchedules()
        }
      )
      .subscribe()

    return () => {
      isMountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchSchedules])

  const createSchedule = async (payload: ScheduleCreatePayload): Promise<JobSchedule> => {
    try {
      const scheduleId = payload.id || crypto.randomUUID()
      const { data: authData } = await supabase.auth.getUser()

      const scheduleData = {
        id: scheduleId,
        project_id: payload.project_id || null,
        cost_center_id: payload.cost_center_id || null,
        technician_id: payload.technician_id || null,
        assigned_crew_ids: payload.assigned_crew_ids || [],
        title: payload.title.trim(),
        description: payload.description || null,
        status: payload.status || 'scheduled',
        start_time: payload.start_time,
        end_time: payload.end_time,
        all_day: Boolean(payload.all_day),
        site_address: payload.site_address || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        estimated_travel_minutes: payload.estimated_travel_minutes || 0,
        requires_safety_doc: payload.requires_safety_doc !== undefined ? payload.requires_safety_doc : true,
        notes: payload.notes || null,
        created_by: authData?.user?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error: insertErr } = await supabase
        .from('job_schedules')
        .upsert([scheduleData], { onConflict: 'id' })
        .select(`
          *,
          project:projects(id, name, address, suburb, city, client:clients(name)),
          cost_center:cost_centers(id, name, customer_po_number),
          technician:users!technician_id(id, full_name, email, role, phone),
          completed_safety_doc:safety_documents!completed_safety_doc_id(id, title, status, pdf_url)
        `)
        .single()

      if (insertErr) throw insertErr

      await fetchSchedules()
      return data as JobSchedule
    } catch (err) {
      console.error('[useSchedule] Error creating schedule:', err)
      throw err
    }
  }

  const updateSchedule = async (id: string, payload: ScheduleUpdatePayload): Promise<JobSchedule> => {
    try {
      const { data, error: updateErr } = await supabase
        .from('job_schedules')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          project:projects(id, name, address, suburb, city, client:clients(name)),
          cost_center:cost_centers(id, name, customer_po_number),
          technician:users!technician_id(id, full_name, email, role, phone),
          completed_safety_doc:safety_documents!completed_safety_doc_id(id, title, status, pdf_url)
        `)
        .single()

      if (updateErr) throw updateErr

      await fetchSchedules()
      return data as JobSchedule
    } catch (err) {
      console.error('[useSchedule] Error updating schedule:', err)
      throw err
    }
  }

  const deleteSchedule = async (id: string): Promise<void> => {
    try {
      const { error: delErr } = await supabase.from('job_schedules').delete().eq('id', id)
      if (delErr) throw delErr
      await fetchSchedules()
    } catch (err) {
      console.error('[useSchedule] Error deleting schedule:', err)
      throw err
    }
  }

  const updateScheduleStatus = async (
    id: string,
    newStatus: ScheduleStatus,
    extraUpdates?: Partial<ScheduleUpdatePayload>
  ): Promise<JobSchedule> => {
    const payload: ScheduleUpdatePayload = {
      status: newStatus,
      ...extraUpdates,
    }

    if (newStatus === 'on_site' && !extraUpdates?.actual_start_time) {
      payload.actual_start_time = new Date().toISOString()
    }
    if (newStatus === 'completed' && !extraUpdates?.actual_end_time) {
      payload.actual_end_time = new Date().toISOString()
    }

    return await updateSchedule(id, payload)
  }

  const linkSafetyDocument = async (scheduleId: string, safetyDocId: string): Promise<JobSchedule> => {
    return await updateSchedule(scheduleId, {
      completed_safety_doc_id: safetyDocId,
    })
  }

  return {
    schedules,
    loading,
    error,
    refresh: fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    linkSafetyDocument,
  }
}
