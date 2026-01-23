import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Timesheet, TimesheetFormData, TimesheetFilters, TimesheetStatus } from '../types'

const PAGE_SIZE = 10

export function useTimesheets(
  filters?: TimesheetFilters,
  page: number = 1,
  sort?: { key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' }
) {
  const { user } = useAuth()
  const [data, setData] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters]) // stabilize dependency so we do not refetch on identical objects

  const fetchTimesheets = useCallback(async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('timesheets')
        .select('*', { count: 'exact' })

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

      // Pagination
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      if (sort) {
        query = query.order(sort.key, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('entry_date', { ascending: false }).order('created_at', { ascending: false })
      }

      const { data: rows, error: err, count } = await query.range(from, to)

      if (err) throw err

      setData((rows || []) as Timesheet[])
      setPageCount(Math.ceil((count || 0) / PAGE_SIZE))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timesheets')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.role, filtersKey, page, sort?.key, sort?.direction])

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
    async (id: string, data: Partial<TimesheetFormData>) => {
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
            project_id: data.project_id,
            cost_center_id: data.cost_center_id ?? undefined,
            activity_type_id: data.activity_type_id,
            entry_date: data.entry_date,
            hours: data.hours !== undefined ? Number(data.hours) : undefined,
            notes: data.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
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
          .eq('user_id', user.id)
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
          .eq('user_id', user.id)
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
    async (data: { project_id: string; cost_center_id?: string; entry_date: string; entries: { activity_type_id: string; user_id: string; hours: number; notes?: string }[] }) => {
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
