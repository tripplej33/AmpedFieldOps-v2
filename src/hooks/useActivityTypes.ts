import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ActivityType, ActivityTypeFormData } from '../types'

let cachedActivityTypes: ActivityType[] | null = null

export function useActivityTypes() {
  const [data, setData] = useState<ActivityType[]>(() => cachedActivityTypes || [])
  const [isLoading, setIsLoading] = useState(!cachedActivityTypes)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchTypes = async () => {
      try {
        if (!cachedActivityTypes) {
          setIsLoading(true)
        }
        setError(null)
        const { data: rows, error: err } = await supabase
          .from('activity_types')
          .select('*')
          .order('name', { ascending: true })
        if (err) throw err
        if (isMounted) {
          const fresh = (rows || []) as ActivityType[]
          cachedActivityTypes = fresh
          setData(fresh)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch activity types')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    fetchTypes()

    return () => {
      isMounted = false
    }
  }, [])

  return { data, isLoading, error }
}

export function useCreateActivityType() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (data: ActivityTypeFormData) => {
      setIsPending(true)
      setError(null)
      try {
        const { data: inserted, error: err } = await supabase
          .from('activity_types')
          .insert([{ ...data, user_id: user?.id }])
          .select('*')
          .single()
        if (err) throw err
        cachedActivityTypes = null
        return inserted as ActivityType
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create activity type')
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useUpdateActivityType() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (id: string, data: Partial<ActivityTypeFormData>) => {
    setIsPending(true)
    setError(null)
    try {
      const { data: updated, error: err } = await supabase
        .from('activity_types')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (err) throw err
      cachedActivityTypes = null
      return updated as ActivityType
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity type')
      return null
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

export function useDeleteActivityType() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (id: string) => {
    setIsPending(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('activity_types')
        .delete()
        .eq('id', id)
      if (err) throw err
      cachedActivityTypes = null
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity type')
      return false
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}
