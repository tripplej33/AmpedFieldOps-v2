import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Project, ProjectFormData, ProjectFilters } from '../types'

const PAGE_SIZE = 50

export function useProjects(filters?: ProjectFilters, page: number = 1) {
  const { user } = useAuth()
  const [data, setData] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. Check user role permissions for scoped visibility
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager'
      let isRestrictedToAssigned = false

      if (!isAdminOrManager) {
        // Query user's role from roles table
        const { data: roleData } = await supabase
          .from('roles')
          .select('permissions')
          .eq('id', user.role)
          .maybeSingle()

        const permissions = (roleData?.permissions || []) as string[]
        const hasViewAll = permissions.includes('projects.view_all')
        isRestrictedToAssigned = !hasViewAll
      }

      let assignedProjectIds: string[] = []
      if (isRestrictedToAssigned) {
        // Fetch project IDs assigned to this user and created by user in parallel
        const [{ data: assignments }, { data: createdProjects }] = await Promise.all([
          supabase.from('project_members').select('project_id').eq('user_id', user.id),
          supabase.from('projects').select('id').eq('user_id', user.id),
        ])

        const memberProjectIds = (assignments || []).map((a) => a.project_id)
        const createdProjectIds = (createdProjects || []).map((p) => p.id)
        assignedProjectIds = Array.from(new Set([...memberProjectIds, ...createdProjectIds]))

        if (assignedProjectIds.length === 0) {
          setData([])
          setPageCount(0)
          setIsLoading(false)
          return
        }
      }

      // 2. Build Query
      let query = supabase
        .from('projects')
        .select(
          `
          *,
          clients(id, name, contact_name),
          assigned_members:project_members(
            id,
            user_id,
            role_in_project,
            assigned_at,
            user:users(id, full_name, email, role)
          )
        `,
          { count: 'exact' }
        )

      if (isRestrictedToAssigned && assignedProjectIds.length > 0) {
        query = query.in('id', assignedProjectIds)
      }

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

      setData((projects as Project[]) || [])
      setPageCount(Math.ceil((count || 0) / PAGE_SIZE))
    } catch (err) {
      console.error('Fetch projects error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.role, filters, page])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { data, isLoading, error, pageCount, refresh: fetchProjects }
}

export function useProject(id: string) {
  const { user } = useAuth()
  const [data, setData] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!user?.id || !id) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: project, error: err } = await supabase
        .from('projects')
        .select(
          `
          *,
          clients(id, name, contact_name),
          assigned_members:project_members(
            id,
            user_id,
            role_in_project,
            assigned_at,
            user:users(id, full_name, email, role)
          )
        `
        )
        .eq('id', id)
        .single()

      if (err) throw err
      setData(project as Project)
    } catch (err) {
      console.error('Fetch project error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, id])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  return { data, isLoading, error, refresh: fetchProject }
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
        const cleanData = {
          name: data.name,
          description: data.description || null,
          client_id: data.client_id,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          budget: data.budget ? Number(data.budget) : null,
          notes: data.notes || null,
          address: data.address || null,
          suburb: data.suburb || null,
          city: data.city || null,
          postal_code: data.postal_code || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          site_access_notes: data.site_access_notes || null,
          user_id: user.id,
        }

        const { data: project, error: err } = await supabase
          .from('projects')
          .insert([cleanData])
          .select('*, clients(id, name, contact_name)')
          .single()

        if (err) throw err

        // If assigned members were chosen, insert them
        if (data.assigned_user_ids && data.assigned_user_ids.length > 0) {
          const memberRows = data.assigned_user_ids.map((uid) => ({
            project_id: project.id,
            user_id: uid,
            role_in_project: 'technician',
          }))

          await supabase.from('project_members').insert(memberRows)
        }

        return project as Project
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
    async (id: string, data: Partial<ProjectFormData> & Record<string, any>) => {
      if (!user?.id) {
        setError('User not authenticated')
        return null
      }

      setIsPending(true)
      setError(null)

      try {
        const cleanPayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        }

        if (data.name !== undefined) cleanPayload.name = data.name
        if (data.description !== undefined) cleanPayload.description = data.description || null
        if (data.client_id !== undefined) cleanPayload.client_id = data.client_id
        if (data.status !== undefined) cleanPayload.status = data.status
        if (data.start_date !== undefined) cleanPayload.start_date = data.start_date || null
        if (data.end_date !== undefined) cleanPayload.end_date = data.end_date || null
        if (data.budget !== undefined) cleanPayload.budget = data.budget ? Number(data.budget) : null
        if (data.notes !== undefined) cleanPayload.notes = data.notes || null
        if (data.address !== undefined) cleanPayload.address = data.address || null
        if (data.suburb !== undefined) cleanPayload.suburb = data.suburb || null
        if (data.city !== undefined) cleanPayload.city = data.city || null
        if (data.postal_code !== undefined) cleanPayload.postal_code = data.postal_code || null
        if (data.latitude !== undefined) cleanPayload.latitude = data.latitude || null
        if (data.longitude !== undefined) cleanPayload.longitude = data.longitude || null
        if (data.site_access_notes !== undefined) cleanPayload.site_access_notes = data.site_access_notes || null

        const { data: project, error: err } = await supabase
          .from('projects')
          .update(cleanPayload)
          .eq('id', id)
          .select('*, clients(id, name, contact_name)')
          .single()

        if (err) throw err

        // If assigned members array provided, sync members
        if (data.assigned_user_ids !== undefined) {
          // Delete existing assignments
          await supabase.from('project_members').delete().eq('project_id', id)

          // Insert new ones
          if (data.assigned_user_ids.length > 0) {
            const rows = data.assigned_user_ids.map((uid: string) => ({
              project_id: id,
              user_id: uid,
              role_in_project: 'technician',
            }))
            await supabase.from('project_members').insert(rows)
          }
        }

        return project as Project
      } catch (err) {
        console.error('Update project failed:', err)
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
