import { useState, useEffect } from 'react'
import { useTimesheets } from '@/hooks/useTimesheets'
import { usePlantEquipment } from '@/hooks/usePlantEquipment'
import { useProjectMaterials } from '@/hooks/useProjectMaterials'
import { useProjects } from '@/hooks/useProjects'
import { useAllClients } from '@/hooks/useClients'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import { useInvoices } from '@/hooks/useInvoices'
import { generateInvoicePdf } from '@/lib/pdf/invoicePdfGenerator'
import type { InvoiceLineItem, Invoice } from '@/types/invoicing'
import type { Timesheet, Client, Project, ProjectMaterial } from '@/types'
import Button from '@/components/ui/Button'

interface GenerateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  clientId?: string
  onInvoiceCreated?: (invoice: Invoice) => void
}

export default function GenerateInvoiceModal({
  isOpen,
  onClose,
  projectId: defaultProjectId,
  clientId: defaultClientId,
  onInvoiceCreated,
}: GenerateInvoiceModalProps) {
  const { data: projects = [] } = useProjects()
  const { clients = [] } = useAllClients()
  const { profile: companyProfile } = useCompanyProfile()
  const { createInvoice } = useInvoices()

  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '')
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '')
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  )
  const [issueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [taxRate] = useState(15)
  const [notes] = useState('Payment due within 14 days of invoice date.')
  const [clientNotes] = useState('')

  // Fetch candidate timesheets for this project
  const { data: timesheets = [] } = useTimesheets({
    projectId: selectedProjectId || undefined,
    status: ['approved'],
  })
  const { usageLogs } = usePlantEquipment()
  const { materials = [] } = useProjectMaterials(selectedProjectId || undefined)

  // Selected IDs for billing
  const [selectedTsIds, setSelectedTsIds] = useState<string[]>([])
  const [selectedEqIds, setSelectedEqIds] = useState<string[]>([])
  const [selectedMatIds, setSelectedMatIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Auto-sync client when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find((p: Project) => p.id === selectedProjectId)
      if (proj && proj.client_id) {
        setSelectedClientId(proj.client_id)
      }
    }
  }, [selectedProjectId, projects])

  // Select all unbilled timesheets by default
  useEffect(() => {
    const unbilled = timesheets.filter((t: Timesheet) => !(t as any).invoiced)
    setSelectedTsIds(unbilled.map((t: Timesheet) => t.id))
  }, [timesheets])

  // Select all unbilled plant usage logs for this project
  useEffect(() => {
    const unbilledPlant = usageLogs.filter((u) => u.project_id === selectedProjectId && !u.invoiced)
    setSelectedEqIds(unbilledPlant.map((u) => u.id))
  }, [usageLogs, selectedProjectId])

  // Select all unbilled materials for this project
  useEffect(() => {
    const unbilledMats = materials.filter((m: ProjectMaterial) => !m.invoiced)
    setSelectedMatIds(unbilledMats.map((m: ProjectMaterial) => m.id))
  }, [materials])

  if (!isOpen) return null

  // Calculate billable line items
  const billableTimesheets = timesheets.filter((t: Timesheet) => selectedTsIds.includes(t.id))
  const billablePlant = usageLogs.filter((u) => selectedEqIds.includes(u.id))
  const billableMaterials = materials.filter((m: ProjectMaterial) => selectedMatIds.includes(m.id))

  const laborLines: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[] = billableTimesheets.map((ts: Timesheet) => {
    const rate = Number(ts.activity_type?.default_rate || 95)
    const hours = Number(ts.hours || 0)
    return {
      description: `${ts.user?.full_name || 'Technician'} - ${ts.activity_type?.name || 'Labor'} (${hours} hrs)`,
      item_type: 'labor',
      timesheet_id: ts.id,
      quantity: hours,
      unit_price: rate,
      tax_rate: taxRate,
      line_total: hours * rate,
      xero_item_code: ts.activity_type?.xero_item_code || undefined,
    }
  })

  const plantLines: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[] = billablePlant.map((eq) => {
    const rate = Number(eq.hourly_rate || 120)
    const units = Number(eq.units_used || 0)
    return {
      description: `Plant Hire: ${eq.vehicle?.make_model || 'Equipment'} (${units} ${eq.tracking_type})`,
      item_type: 'equipment_hire',
      equipment_usage_id: eq.id,
      quantity: units,
      unit_price: rate,
      tax_rate: taxRate,
      line_total: units * rate,
    }
  })

  const materialLines: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[] = billableMaterials.map((mat) => {
    const qty = Number(mat.quantity_used || 1)
    const rate = Number(mat.charge_out_rate || mat.unit_cost || 0)
    return {
      description: `Material: ${mat.description} (${qty} ${mat.unit_of_measure || 'EA'})`,
      item_type: 'materials',
      project_material_id: mat.id,
      quantity: qty,
      unit_price: rate,
      tax_rate: taxRate,
      line_total: qty * rate,
    }
  })

  const flattenedLines: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[] = [
    ...laborLines,
    ...plantLines,
    ...materialLines,
  ]

  const subtotal = flattenedLines.reduce((sum, item) => sum + Number(item.line_total), 0)
  const taxTotal = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxTotal

  const handleToggleTs = (id: string) => {
    setSelectedTsIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleToggleEq = (id: string) => {
    setSelectedEqIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleToggleMat = (id: string) => {
    setSelectedMatIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleCreateAndDownload = async () => {
    try {
      setSaving(true)
      const newInvoice = await createInvoice({
        invoiceNumber,
        projectId: selectedProjectId || undefined,
        clientId: selectedClientId || undefined,
        issueDate,
        dueDate,
        taxRate,
        notes,
        clientNotes,
        lineItems: flattenedLines,
        timesheetIds: selectedTsIds,
        equipmentLogIds: selectedEqIds,
        materialIds: selectedMatIds,
      })

      // Generate PDF
      const pdf = generateInvoicePdf(
        {
          ...newInvoice,
          project: projects.find((p: Project) => p.id === selectedProjectId) || null,
          client: clients.find((c: Client) => c.id === selectedClientId) || null,
          line_items: flattenedLines as any,
        },
        companyProfile
      )
      pdf.save(`${invoiceNumber}.pdf`)

      onInvoiceCreated?.(newInvoice)
      onClose()
    } catch (err) {
      console.error('Failed to create invoice:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Generate Invoice from Timesheets & Plant</h2>
              <p className="text-xs text-text-muted">
                Compile approved technician hours, plant machinery usage, and materials into an itemized tax invoice.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-2 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-surface-dark/40 border border-border-dark rounded-xl p-4 text-xs">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="">-- Select Project --</option>
                {projects.map((p: Project) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="">-- Select Client --</option>
                {clients.map((c: Client) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.xero_contact_id ? '(Xero)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>
          </div>

          {/* Timesheet Selection Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">schedule</span>
                1. Select Approved Labor & Timesheets ({billableTimesheets.length} selected)
              </h3>
              <span className="text-xs font-bold text-primary">
                ${laborLines.reduce((s, l) => s + l.line_total, 0).toFixed(2)}
              </span>
            </div>

            <div className="max-h-44 overflow-y-auto border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 text-xs">
              {timesheets.length === 0 ? (
                <div className="p-4 text-center text-text-muted">No approved timesheets found for this project.</div>
              ) : (
                timesheets.map((ts: Timesheet) => {
                  const isChecked = selectedTsIds.includes(ts.id)
                  const rate = Number(ts.activity_type?.default_rate || 95)
                  const hours = Number(ts.hours || 0)

                  return (
                    <label
                      key={ts.id}
                      className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-surface-dark transition-colors ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTs(ts.id)}
                          className="rounded border-border-dark bg-background-dark text-primary w-4 h-4"
                        />
                        <div>
                          <span className="text-white font-semibold">
                            {ts.user?.full_name} • {ts.activity_type?.name}
                          </span>
                          <span className="text-text-muted text-[11px] block truncate max-w-md">
                            {ts.entry_date ? new Date(ts.entry_date).toLocaleDateString() : ''} - {ts.notes || 'General Work'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-mono font-bold">${(hours * rate).toFixed(2)}</span>
                        <span className="text-text-muted text-[10px] block">
                          {hours}h @ ${rate}/h
                        </span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Plant & Machinery Selection Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-base">precision_manufacturing</span>
                2. Select Plant & Machinery Hire ({billablePlant.length} selected)
              </h3>
              <span className="text-xs font-bold text-amber-400">
                ${plantLines.reduce((s, p) => s + p.line_total, 0).toFixed(2)}
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 text-xs">
              {usageLogs.filter((u) => u.project_id === selectedProjectId).length === 0 ? (
                <div className="p-3 text-center text-text-muted text-[11px]">
                  No plant/machinery usage logged for this project yet.
                </div>
              ) : (
                usageLogs
                  .filter((u) => u.project_id === selectedProjectId)
                  .map((eq) => {
                    const isChecked = selectedEqIds.includes(eq.id)
                    const rate = Number(eq.hourly_rate || 120)
                    const units = Number(eq.units_used || 0)

                    return (
                      <label
                        key={eq.id}
                        className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-surface-dark transition-colors ${
                          isChecked ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEq(eq.id)}
                            className="rounded border-border-dark bg-background-dark text-amber-500 w-4 h-4"
                          />
                          <div>
                            <span className="text-white font-semibold">{eq.vehicle?.make_model}</span>
                            <span className="text-text-muted text-[11px] block">
                              {eq.date} - {eq.notes || 'Plant operation'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-mono font-bold">${(units * rate).toFixed(2)}</span>
                          <span className="text-text-muted text-[10px] block">
                            {units} {eq.tracking_type} @ ${rate}/{eq.tracking_type}
                          </span>
                        </div>
                      </label>
                    )
                  })
              )}
            </div>
          </div>

          {/* Materials & Stock Consumables Selection Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-cyan-400 text-base">inventory_2</span>
                3. Select Project Materials & Consumables ({billableMaterials.length} selected)
              </h3>
              <span className="text-xs font-bold text-cyan-400">
                ${materialLines.reduce((s, m) => s + m.line_total, 0).toFixed(2)}
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 text-xs">
              {materials.length === 0 ? (
                <div className="p-3 text-center text-text-muted text-[11px]">
                  No project materials logged for this project yet.
                </div>
              ) : (
                materials.map((mat: ProjectMaterial) => {
                  const isChecked = selectedMatIds.includes(mat.id)
                  const qty = Number(mat.quantity_used || 1)
                  const rate = Number(mat.charge_out_rate || mat.unit_cost || 0)

                  return (
                    <label
                      key={mat.id}
                      className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-surface-dark transition-colors ${
                        isChecked ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMat(mat.id)}
                          className="rounded border-border-dark bg-background-dark text-cyan-500 w-4 h-4"
                        />
                        <div>
                          <span className="text-white font-semibold">{mat.description}</span>
                          <span className="text-text-muted text-[11px] block">
                            {mat.entry_date} - {mat.source === 'van_stock' ? 'From Van Stock' : 'Direct Purchase'}
                            {mat.notes ? ` • ${mat.notes}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-mono font-bold">${(qty * rate).toFixed(2)}</span>
                        <span className="text-text-muted text-[10px] block">
                          {qty} {mat.unit_of_measure || 'EA'} @ ${rate}/{mat.unit_of_measure || 'EA'}
                        </span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Invoice Summary Totals */}
          <div className="p-4 bg-surface-dark/60 border border-border-dark rounded-xl flex items-center justify-between flex-wrap gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-text-muted block text-[11px]">Subtotal (Excl. GST):</span>
              <span className="text-lg font-bold text-white font-mono">${subtotal.toFixed(2)}</span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted block text-[11px]">GST ({taxRate}%):</span>
              <span className="text-lg font-bold text-amber-400 font-mono">${taxTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted block text-[11px]">Total Invoice Amount:</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleCreateAndDownload}
              disabled={saving || flattenedLines.length === 0}
              className="text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              {saving ? 'Creating...' : 'Create Invoice & Download PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
