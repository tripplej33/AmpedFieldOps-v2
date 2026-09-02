import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProjectContact, ProjectContactFormData } from '@/types'

export function useProjectContacts(projectId?: string) {
  const [contacts, setContacts] = useState<ProjectContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!projectId) {
      setContacts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('project_contacts')
        .select('*')
        .eq('project_id', projectId)
        .order('is_emergency', { ascending: false })
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (err) throw err
      setContacts((data || []) as ProjectContact[])
    } catch (err) {
      console.error('Failed to fetch project contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project contacts')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, loading, error, refresh: fetchContacts }
}

export function useCreateProjectContact() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (projectId: string, data: ProjectContactFormData) => {
      try {
        setIsPending(true)
        setError(null)

        const { data: newContact, error: insertError } = await supabase
          .from('project_contacts')
          .insert({
            project_id: projectId,
            ...data,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return newContact as ProjectContact
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add contact'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { create, isPending, error }
}

export function useUpdateProjectContact() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(
    async (id: string, data: Partial<ProjectContactFormData>) => {
      try {
        setIsPending(true)
        setError(null)

        const { data: updatedContact, error: updateError } = await supabase
          .from('project_contacts')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError
        return updatedContact as ProjectContact
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update contact'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { update, isPending, error }
}

export function useDeleteProjectContact() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteContact = useCallback(async (id: string) => {
    try {
      setIsPending(true)
      setError(null)

      const { error: err } = await supabase
        .from('project_contacts')
        .delete()
        .eq('id', id)

      if (err) throw err
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete contact'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsPending(false)
    }
  }, [])

  return { deleteContact, isPending, error }
}
