import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Project, ProjectFormData, ProjectFilters } from '../types'

const PAGE_SIZE = 10

export function useProjects(filters?: ProjectFilters, page: number = 1) {
  const { user } = useAuth()
  const [data, setData] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    const fetchProjects = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)

        // Apply filters
        if (filters?.status && filters.status.length > 0) {
          query = query.in('status', filters.status)
        }

        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId)
        }

        if (filters?.startDate) {
          query = query.gte('start_date', filters.startDate)
        }

        if (filters?.endDate) {
          query = query.lte('end_date', filters.endDate)
        }

        // Pagination
        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data: projects, error: err, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to)

        if (err) throw err

        setData(projects || [])
        setPageCount(Math.ceil((count || 0) / PAGE_SIZE))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [user?.id, filters, page])

  return { data, isLoading, error, pageCount }
}

export function useProject(id: string) {
  const { user } = useAuth()
  const [data, setData] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !id) return

    const fetchProject = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch project with client info
        const { data: project, error: err } = await supabase
          .from('projects')
          .select('*, clients(company, first_name, last_name)')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (err) throw err
        setData(project)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [user?.id, id])

  return { data, isLoading, error }
}

export function useCreateProject() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (data: ProjectFormData) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }

      setIsPending(true)
      setError(null)

      try {
        // Clean the data - remove undefined values and ensure proper types
        const cleanData = {
          name: data.name,
          description: data.description || null,
          client_id: data.client_id,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          budget: data.budget ? Number(data.budget) : null,
          notes: data.notes || null,
          user_id: user.id,
        }

        console.log('Creating project with data:', cleanData)

        const { data: project, error: err } = await supabase
          .from('projects')
          .insert([cleanData])
          .select()
          .single()

        if (err) {
          console.error('Supabase insert error:', err)
          throw err
        }
        
        console.log('Project created successfully:', project)
        return project
      } catch (err) {
        console.error('Create project failed:', err)
        const message = err instanceof Error ? err.message : 'Failed to create project'
        setError(message)
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useUpdateProject() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (id: string, data: Partial<ProjectFormData>) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }

      setIsPending(true)
      setError(null)

      try {
        const { data: project, error: err } = await supabase
          .from('projects')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (err) throw err
        return project
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update project'
        setError(message)
        return null
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useDeleteProject() {
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
          .from('projects')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (err) throw err
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete project'
        setError(message)
        return false
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { mutate, isPending, error }
}

export function useProjectsForClient(clientId: string) {
  const { user } = useAuth()
  const [data, setData] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !clientId) return

    const fetchProjects = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data: projects, error: err } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })

        if (err) throw err
        setData(projects || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [user?.id, clientId])

  return { data, isLoading, error }
}
