import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Client, ClientFormData } from '../types'

export interface ClientsFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  sortBy?: 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

export interface UseClientsResult {
  clients: Client[]
  loading: boolean
  error: string | null
  hasMore: boolean
}

const PAGE_SIZE = 10

// Cache to prevent duplicate simultaneous fetches
let fetchInProgress = false
let lastFetchKey = ''

export function useClients(
  filters: ClientsFilters = {},
  page: number = 0,
  refreshKey: number = 0
): UseClientsResult {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setClients([])
      setLoading(false)
      return
    }

    const fetchKey = `${user.id}-${JSON.stringify(filters)}-${page}-${refreshKey}`
    
    // Prevent duplicate fetches
    if (fetchInProgress && lastFetchKey === fetchKey) {
      return
    }

    const fetchClients = async () => {
      try {
        fetchInProgress = true
        lastFetchKey = fetchKey
        setLoading(true)
        setError(null)

        let query = supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)

        // Apply filters
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }

        if (filters.search) {
          const searchTerm = `%${filters.search}%`
          query = query.or(
            `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
          )
        }

        // Apply sorting
        const sortColumn = filters.sortBy === 'name' ? 'first_name' : 'created_at'
        const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'
        query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

        // Apply pagination
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE

        query = query.range(from, to)

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        // Check if there are more results
        setHasMore(data ? data.length > PAGE_SIZE : false)

        // Remove the last item if there are more (used for pagination check)
        const clientsData = data ? data.slice(0, PAGE_SIZE) : []
        setClients(clientsData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch clients'
        console.error('Fetch clients error:', message)
        setError(message)
        setClients([])
      } finally {
        setLoading(false)
        fetchInProgress = false
      }
    }

    fetchClients()
  }, [user?.id, filters, page, refreshKey])

  return {
    clients,
    loading,
    error,
    hasMore,
  }
}

export function useClient(id: string | null) {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !user?.id) {
      setClient(null)
      setLoading(false)
      return
    }

    const fetchClient = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        setClient(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch client'
        setError(message)
        setClient(null)
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [id, user?.id])

  return { client, loading, error }
}

export function useCreateClient() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (data: ClientFormData) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      try {
        setLoading(true)
        setError(null)

        // Prevent duplicate by email for this user
        if (data.email) {
          const { data: existing, error: existingError } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .eq('email', data.email)
            .limit(1)

          if (existingError) {
            throw new Error(existingError.message)
          }

          if (existing && existing.length > 0) {
            throw new Error('A client with this email already exists')
          }
        }

        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            ...data,
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(insertError.message)
        }

        return newClient as Client
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create client'
        setError(message)
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [user?.id]
  )

  return { create, loading, error }
}

export function useUpdateClient() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(
    async (id: string, data: Partial<ClientFormData>) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      try {
        setLoading(true)
        setError(null)

        const { data: updatedClient, error: updateError } = await supabase
          .from('clients')
          .update(data)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(updateError.message)
        }

        return updatedClient as Client
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update client'
        setError(message)
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [user?.id]
  )

  return { update, loading, error }
}

export function useDeleteClient() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const delete_ = useCallback(
    async (id: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      try {
        setLoading(true)
        setError(null)

        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (deleteError) {
          throw new Error(deleteError.message)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete client'
        setError(message)
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [user?.id]
  )

  return { delete: delete_, loading, error }
}
