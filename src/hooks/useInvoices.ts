import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceLineItem } from '@/types/invoicing'

export function useInvoices(projectId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let query = supabase
        .from('invoices')
        .select(`
          *,
          project:projects(id, name),
          client:clients(id, name, email, xero_contact_id, address),
          line_items:invoice_line_items(*)
        `)
        .order('issue_date', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error: err } = await query
      if (err) throw err
      setInvoices((data || []) as Invoice[])
    } catch (err) {
      console.error('[useInvoices] Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchInvoices()

    const channel = supabase
      .channel('invoices_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInvoices])

  const createInvoice = async ({
    invoiceNumber,
    projectId,
    clientId,
    issueDate,
    dueDate,
    taxRate = 15,
    notes,
    clientNotes,
    lineItems,
    timesheetIds = [],
    materialIds = [],
    equipmentLogIds = [],
  }: {
    invoiceNumber: string
    projectId?: string
    clientId?: string
    issueDate: string
    dueDate: string
    taxRate?: number
    notes?: string
    clientNotes?: string
    lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]
    timesheetIds?: string[]
    materialIds?: string[]
    equipmentLogIds?: string[]
  }): Promise<Invoice> => {
    const { data: authData } = await supabase.auth.getUser()

    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
    const taxTotal = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxTotal

    // Insert Invoice
    const { data: invData, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        project_id: projectId || null,
        client_id: clientId || null,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'draft',
        subtotal,
        tax_total: taxTotal,
        total_amount: totalAmount,
        tax_rate: taxRate,
        notes: notes || null,
        client_notes: clientNotes || null,
        created_by: authData?.user?.id || null,
      })
      .select()
      .single()

    if (invErr) throw invErr

    const invoiceId = invData.id

    // Insert Line Items
    if (lineItems.length > 0) {
      const formattedItems = lineItems.map((item) => ({
        ...item,
        invoice_id: invoiceId,
      }))
      const { error: linesErr } = await supabase.from('invoice_line_items').insert(formattedItems)
      if (linesErr) throw linesErr
    }

    // Mark timesheets as invoiced
    if (timesheetIds.length > 0) {
      await supabase
        .from('timesheets')
        .update({ invoiced: true, invoice_id: invoiceId })
        .in('id', timesheetIds)
    }

    // Mark materials as invoiced
    if (materialIds.length > 0) {
      await supabase
        .from('project_materials')
        .update({ invoiced: true, invoice_id: invoiceId })
        .in('id', materialIds)
    }

    // Mark equipment logs as invoiced
    if (equipmentLogIds.length > 0) {
      await supabase
        .from('equipment_usage_logs')
        .update({ invoiced: true, invoice_id: invoiceId })
        .in('id', equipmentLogIds)
    }

    await fetchInvoices()
    return invData as Invoice
  }

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    const { error: err } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await fetchInvoices()
  }

  const deleteInvoice = async (id: string) => {
    // Unlink timesheets and materials
    await supabase.from('timesheets').update({ invoiced: false, invoice_id: null }).eq('invoice_id', id)
    await supabase.from('project_materials').update({ invoiced: false, invoice_id: null }).eq('invoice_id', id)
    await supabase.from('equipment_usage_logs').update({ invoiced: false, invoice_id: null }).eq('invoice_id', id)

    const { error: err } = await supabase.from('invoices').delete().eq('id', id)
    if (err) throw err
    await fetchInvoices()
  }

  return {
    invoices,
    loading,
    error,
    refresh: fetchInvoices,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
  }
}
