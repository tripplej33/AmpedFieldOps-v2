import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Client, ClientFormData } from '../types'

export interface ClientsFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  contactType?: 'all' | 'customer' | 'vendor'
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

export function useAllClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. First try backend endpoint which includes Xero contacts
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || ''
        const res = await fetch('/api/admin/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (res.ok) {
          const apiClients = await res.json()
          if (Array.isArray(apiClients) && apiClients.length > 0) {
            const formatted = apiClients.map((c: any) => ({
              ...c,
              name: c.name || c.company || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Client',
              contact_name: c.contact_name || (c.company ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : undefined),
            }))
            setClients(formatted)
            return
          }
        }
      } catch {
        // Fallback to Supabase
      }

      // 2. Direct Supabase query
      const { data, error: fetchErr } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      const formatted = (data || []).map((c: any) => ({
        ...c,
        name: c.name || c.company || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Client',
        contact_name: c.contact_name || (c.company ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : undefined),
      }))

      setClients(formatted)
    } catch (err) {
      console.error('Fetch all clients error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to fetch clients'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllClients()
  }, [fetchAllClients])

  return { clients, loading, error, refresh: fetchAllClients }
}

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

    if (fetchInProgress && lastFetchKey === fetchKey) {
      return
    }

    const fetchClients = async () => {
      try {
        fetchInProgress = true
        lastFetchKey = fetchKey
        setLoading(true)
        setError(null)

        // 1. Try to fetch from backend API (includes Xero pulled clients)
        try {
          const apiRes = await fetch('/api/admin/clients', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
          })

          if (apiRes.ok) {
            let allClients = await apiRes.json()

            if (filters.status && filters.status !== 'all') {
              allClients = allClients.filter((c: any) => c.status === filters.status)
            }

            if (filters.contactType && filters.contactType !== 'all') {
              if (filters.contactType === 'customer') {
                allClients = allClients.filter((c: any) => c.contact_type !== 'vendor')
              } else if (filters.contactType === 'vendor') {
                allClients = allClients.filter((c: any) => c.contact_type === 'vendor' || c.is_supplier === true || c.contact_type === 'both')
              }
            }

            if (filters.search) {
              const searchTerm = filters.search.toLowerCase()
              allClients = allClients.filter(
                (c: any) =>
                  c.name?.toLowerCase().includes(searchTerm) ||
                  c.contact_name?.toLowerCase().includes(searchTerm) ||
                  c.email?.toLowerCase().includes(searchTerm) ||
                  c.phone?.toLowerCase().includes(searchTerm)
              )
            }

            const sortColumn = filters.sortBy === 'name' ? 'name' : 'created_at'
            allClients.sort((a: any, b: any) => {
              let aVal = a[sortColumn] || ''
              let bVal = b[sortColumn] || ''
              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
              return filters.sortOrder === 'asc' ? comparison : -comparison
            })

            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE
            const paginatedClients = allClients.slice(from, to + 1)

            setHasMore(paginatedClients.length > PAGE_SIZE)
            setClients(paginatedClients.slice(0, PAGE_SIZE))
            return
          }
        } catch (apiErr) {
          console.error('API fetch failed, falling back to Supabase:', apiErr)
        }

        // 2. Fallback to Supabase
        let query = supabase.from('clients').select('*')

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }

        if (filters.contactType && filters.contactType !== 'all') {
          if (filters.contactType === 'customer') {
            query = query.or('contact_type.eq.customer,contact_type.eq.both,contact_type.is.null')
          } else if (filters.contactType === 'vendor') {
            query = query.or('contact_type.eq.vendor,contact_type.eq.both,is_supplier.eq.true')
          }
        }

        if (filters.search) {
          const searchTerm = `%${filters.search}%`
          query = query.or(
            `name.ilike.${searchTerm},contact_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
          )
        }

        const sortColumn = filters.sortBy === 'name' ? 'name' : 'created_at'
        const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'
        query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE
        query = query.range(from, to)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        setHasMore(data ? data.length > PAGE_SIZE : false)

        const formatted = (data ? data.slice(0, PAGE_SIZE) : []).map((c: any) => ({
          ...c,
          name: c.name || c.company || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Client',
          contact_name: c.contact_name || (c.company ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : undefined),
        }))

        setClients(formatted)
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
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    if (!id) {
      setClient(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      const formatted: Client = {
        ...data,
        name: data.name || data.company || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unnamed Client',
        contact_name: data.contact_name || (data.company ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : undefined),
      }

      setClient(formatted)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client'
      setError(message)
      setClient(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  return { client, loading, error, refresh: fetchClient }
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
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
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
