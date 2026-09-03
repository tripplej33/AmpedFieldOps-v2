import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  SafetyTemplate,
  SafetyDocument,
  SafetySignature,
  SafetyCategory,
  SafetyDocStatus,
} from '@/types/safety'

export function useSafetyTemplates() {
  const [templates, setTemplates] = useState<SafetyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('safety_templates')
        .select('*')
        .order('is_system_default', { ascending: false })
        .order('title', { ascending: true })

      if (err) throw err
      setTemplates(data || [])
    } catch (err) {
      console.error('[useSafetyTemplates] Error fetching templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load safety templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = async (template: Omit<SafetyTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: err } = await supabase
      .from('safety_templates')
      .insert([template])
      .select()
      .single()

    if (err) throw err
    setTemplates((prev) => [...prev, data])
    return data
  }

  const updateTemplate = async (id: string, updates: Partial<SafetyTemplate>) => {
    const { data, error: err } = await supabase
      .from('safety_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const deleteTemplate = async (id: string) => {
    const { error: err } = await supabase
      .from('safety_templates')
      .delete()
      .eq('id', id)

    if (err) throw err
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}

export function useSafetyDocuments(projectId?: string, costCenterId?: string) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<SafetyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let query = supabase
        .from('safety_documents')
        .select(`
          *,
          template:safety_templates(*),
          project:projects(id, name, address, suburb, city, client:clients(name)),
          cost_center:cost_centers(id, name, customer_po_number),
          signatures:safety_signatures(*)
        `)
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (costCenterId) {
        query = query.eq('cost_center_id', costCenterId)
      }

      const { data, error: err } = await query
      if (err) throw err
      setDocuments(data || [])
    } catch (err) {
      console.error('[useSafetyDocuments] Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load safety documents')
    } finally {
      setLoading(false)
    }
  }, [projectId, costCenterId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const createDocument = async (payload: {
    id?: string
    template_id?: string | null
    project_id?: string | null
    cost_center_id?: string | null
    title: string
    category: SafetyCategory
    form_data: Record<string, any>
  }) => {
    const docId = payload.id || crypto.randomUUID()
    const { data, error: err } = await supabase
      .from('safety_documents')
      .insert([
        {
          id: docId,
          template_id: payload.template_id,
          project_id: payload.project_id,
          cost_center_id: payload.cost_center_id,
          title: payload.title,
          category: payload.category,
          form_data: payload.form_data || {},
          status: 'draft',
          created_by: user?.id,
        },
      ])
      .select(`
        *,
        template:safety_templates(*),
        project:projects(id, name, address, suburb, city, client:clients(name)),
        cost_center:cost_centers(id, name, customer_po_number),
        signatures:safety_signatures(*)
      `)
      .single()

    if (err) throw err
    setDocuments((prev) => [data, ...prev.filter((d) => d.id !== docId)])
    return data
  }

  const updateDocument = async (
    id: string,
    updates: {
      title?: string
      status?: SafetyDocStatus
      form_data?: Record<string, any>
      storage_path?: string | null
      pdf_url?: string | null
      project_id?: string | null
      cost_center_id?: string | null
      template_id?: string | null
      category?: SafetyCategory
    }
  ) => {
    const { data, error: err } = await supabase
      .from('safety_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        template:safety_templates(*),
        project:projects(id, name, address, suburb, city, client:clients(name)),
        cost_center:cost_centers(id, name, customer_po_number),
        signatures:safety_signatures(*)
      `)
      .single()

    if (err) throw err
    setDocuments((prev) => prev.map((d) => (d.id === id ? data : d)))
    return data
  }

  const deleteDocument = async (id: string) => {
    const { error: err } = await supabase
      .from('safety_documents')
      .delete()
      .eq('id', id)

    if (err) throw err
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  /**
   * Archives a completed PDF to Supabase storage and registers it in the project's File Explorer
   */
  const archiveDocumentPdf = async (
    documentId: string,
    pdfBlob: Blob,
    pdfFileName: string,
    targetProjectId?: string,
    targetCostCenterId?: string
  ) => {
    const cleanFileName = pdfFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    let storagePath = ''

    if (targetProjectId) {
      storagePath = `projects/${targetProjectId}/safety-documents/${Date.now()}_${cleanFileName}`
    } else if (targetCostCenterId) {
      storagePath = `cost-centers/${targetCostCenterId}/safety-documents/${Date.now()}_${cleanFileName}`
    } else {
      storagePath = `general/safety-documents/${Date.now()}_${cleanFileName}`
    }

    // 1. Upload to Supabase storage bucket 'documents' (or fallback to 'files')
    let bucketName = 'documents'
    let uploadRes = await supabase.storage.from(bucketName).upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

    if (uploadRes.error && uploadRes.error.message?.includes('not found')) {
      bucketName = 'files'
      uploadRes = await supabase.storage.from(bucketName).upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })
    }

    if (uploadRes.error) {
      throw uploadRes.error
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    const publicPdfUrl = publicUrlData?.publicUrl || null

    // 2. Update safety document status to 'completed' with storage link
    const updatedDoc = await updateDocument(documentId, {
      status: 'completed',
      storage_path: storagePath,
      pdf_url: publicPdfUrl,
    })

    // 3. Register entry in project_files table under dedicated "Safety Documents" folder
    if (targetProjectId) {
      try {
        await supabase.from('project_files').insert([
          {
            project_id: targetProjectId,
            name: cleanFileName,
            file_type: 'application/pdf',
            file_size: pdfBlob.size,
            storage_path: storagePath,
            custom_folder: 'Safety Documents',
            created_by: user?.id,
          },
        ])
      } catch (e) {
        console.warn('[useSafetyDocuments] Auto-filing to project_files warning:', e)
      }
    }

    return { updatedDoc, publicPdfUrl }
  }

  return {
    documents,
    loading,
    error,
    refresh: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    archiveDocumentPdf,
  }
}

export function useSafetySignatures(documentId?: string) {
  const [signatures, setSignatures] = useState<SafetySignature[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSignatures = useCallback(async () => {
    if (!documentId) return
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('safety_signatures')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (err) throw err
      setSignatures(data || [])
    } catch (err) {
      console.error('[useSafetySignatures] Error fetching signatures:', err)
      setError(err instanceof Error ? err.message : 'Failed to load signatures')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (documentId) {
      fetchSignatures()
    }
  }, [documentId, fetchSignatures])

  const assignUserToSign = async (user: {
    id: string
    full_name: string
    role?: string
  }) => {
    if (!documentId) throw new Error('Document ID is required to assign user')

    const { data, error: err } = await supabase
      .from('safety_signatures')
      .insert([
        {
          document_id: documentId,
          user_id: user.id,
          signer_name: user.full_name,
          signer_role: user.role || 'Technician',
          signature_data: '',
          sign_type: 'remote',
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (err) throw err
    setSignatures((prev) => [...prev, data])

    await supabase
      .from('safety_documents')
      .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('status', 'draft')

    return data
  }

  const addPendingCrewMember = async (crew: {
    signer_name: string
    signer_role: string
  }) => {
    if (!documentId) throw new Error('Document ID is required to add crew member')

    const { data, error: err } = await supabase
      .from('safety_signatures')
      .insert([
        {
          document_id: documentId,
          signer_name: crew.signer_name,
          signer_role: crew.signer_role || 'Technician',
          signature_data: '',
          sign_type: 'on_the_spot',
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (err) throw err
    setSignatures((prev) => [...prev, data])

    await supabase
      .from('safety_documents')
      .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('status', 'draft')

    return data
  }

  const signPendingSignature = async (
    signatureId: string,
    payload: {
      signature_data: string
      geo_location?: { latitude: number; longitude: number; accuracy?: number } | null
    }
  ) => {
    const { data, error: err } = await supabase
      .from('safety_signatures')
      .update({
        signature_data: payload.signature_data,
        geo_location: payload.geo_location,
        status: 'signed',
        signed_at: new Date().toISOString(),
      })
      .eq('id', signatureId)
      .select()
      .single()

    if (err) throw err
    setSignatures((prev) => prev.map((s) => (s.id === signatureId ? data : s)))
    return data
  }

  const addSignature = async (payload: {
    signer_name: string
    signer_role: string
    signature_data: string
    sign_type: 'on_the_spot' | 'remote' | 'qr_code'
    user_id?: string | null
    geo_location?: { latitude: number; longitude: number; accuracy?: number } | null
  }) => {
    if (!documentId) throw new Error('Document ID is required to add signature')

    // Check if there is an existing pending signature for this signer/user
    const existingPending = signatures.find(
      (s) =>
        s.status === 'pending' &&
        ((payload.user_id && s.user_id === payload.user_id) ||
          s.signer_name.toLowerCase() === payload.signer_name.toLowerCase())
    )

    if (existingPending) {
      return await signPendingSignature(existingPending.id, {
        signature_data: payload.signature_data,
        geo_location: payload.geo_location,
      })
    }

    const { data, error: err } = await supabase
      .from('safety_signatures')
      .insert([
        {
          document_id: documentId,
          ...payload,
          status: 'signed',
          signed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (err) throw err
    setSignatures((prev) => [...prev, data])

    // Update document status from draft to pending_signatures if needed
    await supabase
      .from('safety_documents')
      .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('status', 'draft')

    return data
  }

  const deleteSignature = async (id: string) => {
    const { error: err } = await supabase
      .from('safety_signatures')
      .delete()
      .eq('id', id)

    if (err) throw err
    setSignatures((prev) => prev.filter((s) => s.id !== id))
  }

  return {
    signatures,
    loading,
    error,
    refresh: fetchSignatures,
    addSignature,
    assignUserToSign,
    addPendingCrewMember,
    signPendingSignature,
    deleteSignature,
  }
}
