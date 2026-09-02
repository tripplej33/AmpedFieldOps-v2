import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import ClientModal from '@/components/ClientModal'
import Toast from '@/components/ui/Toast'
import type { Project, Timesheet, CostCenter, Invoice, ClientFormData } from '@/types'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { client, loading: clientLoading, error: clientError, refresh: refreshClient } = useClient(id || null)
  const { update: updateClient, loading: isUpdating } = useUpdateClient()

  const [activeTab, setActiveTab] = useState<'projects' | 'cost_centers' | 'timesheets' | 'invoices'>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const fetchClientExtraData = useCallback(async () => {
    if (!id) return
    try {
      // 1. Fetch Client Projects
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      const clientProjects = (projData || []) as Project[]
      setProjects(clientProjects)

      const projectIds = clientProjects.map((p) => p.id)

      if (projectIds.length > 0) {
        // 2. Fetch Cost Centers & Timesheets for these projects
        const [{ data: ccData }, { data: tsData }, { data: usersData }] = await Promise.all([
          supabase
            .from('cost_centers')
            .select('*, project:projects(id, name)')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('timesheets')
            .select(
              '*, project:projects(id, name), cost_center:cost_centers(id, name, customer_po_number), activity_type:activity_types(id, name)'
            )
            .in('project_id', projectIds)
            .order('entry_date', { ascending: false }),
          supabase.from('users').select('id, full_name, email, role'),
        ])

        const userMap = new Map((usersData || []).map((u) => [u.id, u]))
        const enrichedTs = (tsData || []).map((ts: any) => ({
          ...ts,
          user: userMap.get(ts.user_id) || { full_name: 'Technician', email: '' },
        }))

        setCostCenters((ccData || []) as CostCenter[])
        setTimesheets(enrichedTs as Timesheet[])
      } else {
        setCostCenters([])
        setTimesheets([])
      }

      // 3. Fetch Invoices from Xero backend API or Supabase
      try {
        const invRes = await fetch('/api/admin/xero/invoices', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        if (invRes.ok) {
          const invList: Invoice[] = await invRes.json()
          if (Array.isArray(invList)) {
            const filtered = invList.filter(
              (inv) =>
                inv.client_id === id ||
                (client?.xero_contact_id && inv.client_id === client.xero_contact_id) ||
                (client?.name && inv.client_name?.toLowerCase() === client.name.toLowerCase())
            )
            setInvoices(filtered)
          }
        }
      } catch {
        // Invoices endpoint fallback
      }
    } catch (err) {
      console.error('Error loading client extras:', err)
    }
  }, [id, client?.xero_contact_id, client?.name])

  useEffect(() => {
    fetchClientExtraData()
  }, [fetchClientExtraData])

  const handleSaveEdit = async (data: ClientFormData) => {
    if (!id) return
    try {
      await updateClient(id, data)
      await refreshClient()
      setIsEditModalOpen(false)
      setToast({ type: 'success', message: 'Client details updated successfully' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update client' })
    }
  }

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="text-text-muted text-xs">Loading client profile...</p>
        </div>
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="text-center p-8 space-y-4">
        <p className="text-red-400 text-sm">{clientError || 'Client not found'}</p>
        <Button onClick={() => navigate('/app/clients')}>Back to Clients Directory</Button>
      </div>
    )
  }

  const totalContractBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)
  const totalLaborHours = timesheets.reduce((sum, ts) => sum + (Number(ts.hours) || 0), 0)
  const totalLaborValue = totalLaborHours * 85
  const totalInvoicedValue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate('/app/clients')}
              className="text-text-muted hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 font-display">
              <span className="material-symbols-outlined text-3xl text-primary">contacts</span>
              {client.name}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-text-muted flex-wrap">
            {client.contact_name && (
              <span>
                Contact: <strong className="text-white">{client.contact_name}</strong>
              </span>
            )}
            {client.email && (
              <>
                <span className="w-1 h-1 rounded-full bg-text-muted/40 inline-block shrink-0" />
                <span>{client.email}</span>
              </>
            )}
            {client.phone && (
              <>
                <span className="w-1 h-1 rounded-full bg-text-muted/40 inline-block shrink-0" />
                <span>{client.phone}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Contact Type Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              client.contact_type === 'vendor' || client.is_supplier
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-primary/10 text-primary border-primary/30'
            }`}
          >
            {client.contact_type === 'vendor' || client.is_supplier ? 'Vendor / Supplier' : 'Client / Customer'}
          </span>

          {/* Xero Badge */}
          {client.xero_contact_id ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">sync_alt</span>
              Xero Synced
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-background-dark text-text-muted border border-border-dark text-xs">
              Local Account
            </div>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
              client.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }`}
          >
            {client.status}
          </span>

          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            <span className="material-symbols-outlined text-base">edit</span>
            Edit Client
          </Button>

          <Button onClick={() => navigate('/app/projects')}>
            <span className="material-symbols-outlined text-base">add</span>
            New Project
          </Button>
        </div>
      </div>

      {/* Top 4 Client Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-[11px] uppercase font-semibold">Total Projects</p>
          <p className="text-white text-xl font-bold mt-1">{projects.length}</p>
          <p className="text-xs text-primary mt-1">
            {projects.filter((p) => p.status === 'Active').length} currently active
          </p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-[11px] uppercase font-semibold">Contract Budgets</p>
          <p className="text-white text-xl font-bold mt-1">${totalContractBudget.toLocaleString()}</p>
          <p className="text-xs text-text-muted mt-1">Across all jobs</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-[11px] uppercase font-semibold">Logged Labor</p>
          <p className="text-white text-xl font-bold mt-1">{totalLaborHours.toFixed(1)} hrs</p>
          <p className="text-xs text-text-muted mt-1">~${totalLaborValue.toLocaleString()} labor burn</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <p className="text-text-muted text-[11px] uppercase font-semibold">Invoiced & Billed</p>
          <p className="text-white text-xl font-bold mt-1">${totalInvoicedValue.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1">{invoices.length} Xero Invoices</p>
        </div>
      </div>

      {/* Xero & Contact Information Card */}
      {(client.address || client.billing_address || client.notes || client.xero_contact_id) && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">info</span>
            Account & Billing Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {client.address && (
              <div>
                <span className="text-text-muted font-medium block mb-1">Physical Site Address:</span>
                <span className="text-white">{client.address}</span>
              </div>
            )}
            {client.billing_address && (
              <div>
                <span className="text-text-muted font-medium block mb-1">Billing / Invoicing Address:</span>
                <span className="text-white">{client.billing_address}</span>
              </div>
            )}
            {client.xero_contact_id && (
              <div>
                <span className="text-text-muted font-medium block mb-1">Xero Integration Reference:</span>
                <span className="text-cyan-400 font-mono text-[11px]">{client.xero_contact_id}</span>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="mt-3 pt-3 border-t border-border-dark/60 text-xs">
              <span className="text-text-muted font-medium block mb-0.5">Account Notes:</span>
              <p className="text-white/90 leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">folder</span>
          Linked Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('cost_centers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'cost_centers'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">account_tree</span>
          Cost Centers & POs ({costCenters.length})
        </button>
        <button
          onClick={() => setActiveTab('timesheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'timesheets'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">schedule</span>
          Labor Timesheets ({timesheets.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          Xero Invoices ({invoices.length})
        </button>
      </div>

      {/* TAB 1: LINKED PROJECTS */}
      {activeTab === 'projects' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Client Projects & Jobs</h2>
              <p className="text-xs text-text-muted">All active, scheduled, and past jobs for {client.name}</p>
            </div>
            <Button onClick={() => navigate('/app/projects')}>+ Create Project</Button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">folder_off</span>
              <p className="text-white text-sm font-medium">No projects assigned to this client yet.</p>
              <p className="text-xs text-text-muted mt-1">Click "Create Project" to launch a new job.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Project Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Timeline</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-background-dark/40 transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        <div
                          onClick={() => navigate(`/app/projects/${p.id}`)}
                          className="hover:text-primary cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-primary text-base">folder</span>
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {p.start_date || 'TBD'} → {p.end_date || 'TBD'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {p.budget ? `$${p.budget.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/app/projects/${p.id}`)}
                          className="text-primary hover:underline font-medium"
                        >
                          View Hub →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COST CENTERS & CUSTOMER POS */}
      {activeTab === 'cost_centers' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Cost Centers & Customer PO Numbers</h2>
            <p className="text-xs text-text-muted">
              Purchase orders and work phase buckets associated with {client.name}
            </p>
          </div>

          {costCenters.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">account_tree</span>
              <p className="text-white text-sm font-medium">No cost centers found for this client's projects.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Cost Center Name</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Customer PO #</th>
                    <th className="px-4 py-3 text-right">Allocated Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {costCenters.map((cc: any) => (
                    <tr key={cc.id} className="hover:bg-background-dark/40 transition-colors">
                      <td className="px-4 py-3 font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base">account_tree</span>
                        <span>{cc.name}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{cc.project?.name || 'Project'}</td>
                      <td className="px-4 py-3 font-mono text-amber-300">
                        {cc.customer_po_number ? (
                          <span className="px-2 py-0.5 bg-background-dark rounded border border-border-dark">
                            {cc.customer_po_number}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {cc.budget ? `$${Number(cc.budget).toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMESHEETS & LABOR LOGS */}
      {activeTab === 'timesheets' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Field Labor Timesheets</h2>
            <p className="text-xs text-text-muted">All technician hours logged for {client.name}</p>
          </div>

          {timesheets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">schedule</span>
              <p className="text-white text-sm font-medium">No timesheets logged for this client's projects.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Project & Cost Center</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3 text-center">Hours</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {timesheets.map((ts) => {
                    const techName = ts.user?.full_name || ts.user?.email || 'Technician'
                    const techInitial = techName.charAt(0).toUpperCase()

                    return (
                      <tr key={ts.id} className="hover:bg-background-dark/40 transition-colors">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{ts.entry_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {techInitial}
                            </div>
                            <span className="text-text-muted font-medium">{techName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white truncate">{ts.project?.name || 'Project'}</div>
                          {ts.cost_center && (
                            <div className="text-[11px] text-amber-400 truncate mt-0.5">
                              {ts.cost_center.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{ts.activity_type?.name || 'Field Labor'}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span className="text-white bg-background-dark px-2 py-0.5 rounded border border-border-dark">
                            {Number(ts.hours).toFixed(1)} hrs
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {ts.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INVOICES & BILLING (XERO) */}
      {activeTab === 'invoices' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Xero Invoices & Accounts Receivable</h2>
              <p className="text-xs text-text-muted">Invoices synchronized with Xero Accounting</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/app/financials')}>
              Open Master Invoicing
            </Button>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">receipt_long</span>
              <p className="text-white text-sm font-medium">No invoices found for this client account.</p>
              <p className="text-xs text-text-muted mt-1">Invoices created in Xero will automatically sync here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-background-dark/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-text-muted">{inv.issue_date}</td>
                      <td className="px-4 py-3 text-text-muted">{inv.due_date}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        ${Number(inv.total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {inv.payment_status?.replace('_', ' ') || 'Sent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Client Modal */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        client={client}
        isLoading={isUpdating}
      />

      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
