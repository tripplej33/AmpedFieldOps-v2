import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Timesheet, TimesheetFormData, TimesheetFilters, TimesheetStatus } from '../types'

export function useTimesheets(
  filters?: TimesheetFilters,
  page: number = 1,
  sort?: { key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' },
  pageSize: number = 25
) {
  const { user } = useAuth()
  const [data, setData] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters])

  const fetchTimesheets = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('timesheets')
        .select(
          '*, project:projects(id, name), cost_center:cost_centers(id, name, customer_po_number), activity_type:activity_types(id, name)',
          { count: 'exact' }
        )

      // Access control: non-managers should only see their own
      const isManager = user.role === 'manager' || user.role === 'admin'
      if (!isManager) {
        query = query.eq('user_id', user.id)
      }

      // Apply filters
      if (filters?.userId) query = query.eq('user_id', filters.userId)
      if (filters?.projectId) query = query.eq('project_id', filters.projectId)
      if (filters?.status && filters.status.length > 0) query = query.in('status', filters.status)
      if (filters?.startDate) query = query.gte('entry_date', filters.startDate)
      if (filters?.endDate) query = query.lte('entry_date', filters.endDate)

      if (filters?.clientId) {
        const { data: clientProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', filters.clientId)
        const pIds = (clientProjects || []).map((p) => p.id)
        if (pIds.length > 0) {
          query = query.in('project_id', pIds)
        } else {
          query = query.eq('project_id', '00000000-0000-0000-0000-000000000000')
        }
      } else if (filters?.contactType && filters.contactType !== 'all') {
        let clientQuery = supabase.from('clients').select('id')
        if (filters.contactType === 'vendor') {
          clientQuery = clientQuery.or('contact_type.eq.vendor,contact_type.eq.both,is_supplier.eq.true')
        } else {
          clientQuery = clientQuery.or('contact_type.eq.customer,contact_type.eq.both,contact_type.is.null')
        }
        const { data: matchedClients } = await clientQuery
        const clientIds = (matchedClients || []).map((c) => c.id)
        if (clientIds.length > 0) {
          const { data: clientProjects } = await supabase
            .from('projects')
            .select('id')
            .in('client_id', clientIds)
          const pIds = (clientProjects || []).map((p) => p.id)
          if (pIds.length > 0) {
            query = query.in('project_id', pIds)
          } else {
            query = query.eq('project_id', '00000000-0000-0000-0000-000000000000')
          }
        }
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      if (sort) {
        query = query.order(sort.key, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('entry_date', { ascending: false }).order('created_at', { ascending: false })
      }

      const [{ data: rows, error: err, count }, { data: usersData }] = await Promise.all([
        query.range(from, to),
        supabase.from('users').select('id, full_name, email, role'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((row: any) => ({
        ...row,
        user: userMap.get(row.user_id) || { full_name: 'Technician', email: '' },
      }))

      setData(enriched as Timesheet[])
      setPageCount(Math.ceil((count || 0) / pageSize))
    } catch (err) {
      console.error('Failed to fetch timesheets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch timesheets')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.role, filtersKey, page, sort?.key, sort?.direction, pageSize])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  return { data, isLoading, error, pageCount, refresh: fetchTimesheets }
}

export function useCreateTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (data: TimesheetFormData) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const clean = {
          user_id: user.id,
          project_id: data.project_id,
          cost_center_id: data.cost_center_id || null,
          activity_type_id: data.activity_type_id,
          entry_date: data.entry_date,
          hours: Number(data.hours),
          status: 'draft' as TimesheetStatus,
          notes: data.notes || null,
        }
        const { data: inserted, error: err } = await supabase
          .from('timesheets')
          .insert([clean])
          .select('*')
          .single()
        if (err) throw err
        return inserted as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useUpdateTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string, data: Partial<TimesheetFormData> & { user_id?: string }) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        }
        if (data.project_id !== undefined) payload.project_id = data.project_id
        if (data.cost_center_id !== undefined) payload.cost_center_id = data.cost_center_id || null
        if (data.activity_type_id !== undefined) payload.activity_type_id = data.activity_type_id
        if (data.entry_date !== undefined) payload.entry_date = data.entry_date
        if (data.hours !== undefined) payload.hours = Number(data.hours)
        if (data.start_time !== undefined) payload.start_time = data.start_time || null
        if (data.end_time !== undefined) payload.end_time = data.end_time || null
        if (data.break_minutes !== undefined) payload.break_minutes = data.break_minutes ?? 0
        if (data.notes !== undefined) payload.notes = data.notes || null
        if (data.user_id !== undefined) payload.user_id = data.user_id

        const { data: updated, error: err } = await supabase
          .from('timesheets')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single()
        if (err) throw err
        return updated as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useSubmitTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const { data: updated, error: err } = await supabase
          .from('timesheets')
          .update({
            status: 'submitted' as TimesheetStatus,
            submitted_at: new Date().toISOString(),
            submitted_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single()
        if (err) throw err
        return updated as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useApproveTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const { data: updated, error: err } = await supabase
          .from('timesheets')
          .update({
            status: 'approved' as TimesheetStatus,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single()
        if (err) throw err
        return updated as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useUnapproveTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string, targetStatus: 'draft' | 'submitted' = 'submitted') => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }
      setIsPending(true)
      setError(null)
      try {
        const { data: updated, error: err } = await supabase
          .from('timesheets')
          .update({
            status: targetStatus as TimesheetStatus,
            approved_at: null,
            approved_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single()
        if (err) throw err
        return updated as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unapprove timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useDeleteTimesheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string) => {
      if (!user?.id) {
        setError('User not authenticated')
        return false
      }
      setIsPending(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('timesheets')
          .delete()
          .eq('id', id)
        if (err) throw err
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete timesheet')
        return false
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useBulkCreateTimesheets() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (data: {
      project_id: string
      cost_center_id?: string
      entry_date: string
      entries: {
        activity_type_id: string
        user_id: string
        hours: number
        start_time?: string | null
        end_time?: string | null
        break_minutes?: number | null
        notes?: string
      }[]
    }) => {
      setIsPending(true)
      setError(null)
      try {
        const timesheetRecords = data.entries.map((entry) => ({
          user_id: entry.user_id,
          project_id: data.project_id,
          cost_center_id: data.cost_center_id || null,
          activity_type_id: entry.activity_type_id,
          entry_date: data.entry_date,
          hours: Number(entry.hours),
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          break_minutes: entry.break_minutes ?? 0,
          status: 'draft' as TimesheetStatus,
          notes: entry.notes || null,
        }))

        const { data: inserted, error: err } = await supabase
          .from('timesheets')
          .insert(timesheetRecords)
          .select('*')

        if (err) throw err
        return inserted as Timesheet[]
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create timesheets')
        return null
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { mutate, isPending, error }
}

export function useDuplicateTimesheet() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const duplicate = useCallback(
    async (
      timesheetId: string,
      targetUserId: string,
      targetDate?: string,
      customStartTime?: string,
      customEndTime?: string
    ) => {
      setIsPending(true)
      setError(null)
      try {
        const { data: original, error: fetchErr } = await supabase
          .from('timesheets')
          .select('*')
          .eq('id', timesheetId)
          .single()

        if (fetchErr) throw fetchErr

        const newRow = {
          user_id: targetUserId,
          project_id: original.project_id,
          cost_center_id: original.cost_center_id,
          activity_type_id: original.activity_type_id,
          entry_date: targetDate || original.entry_date,
          hours: original.hours,
          start_time: customStartTime !== undefined ? customStartTime : original.start_time,
          end_time: customEndTime !== undefined ? customEndTime : original.end_time,
          break_minutes: original.break_minutes,
          status: 'draft' as TimesheetStatus,
          notes: original.notes,
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('timesheets')
          .insert(newRow)
          .select('*')
          .single()

        if (insertErr) throw insertErr
        return inserted as Timesheet
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to duplicate timesheet')
        return null
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { duplicate, isPending, error }
}
