import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

export interface AuditLogEntry {
  id: string
  timestamp: string
  category: 'auth_users' | 'timesheets' | 'inventory_pos' | 'safety' | 'xero_billing' | 'photos'
  action: string
  severity: 'info' | 'warn' | 'error' | 'success'
  actorName: string
  actorRole?: string
  targetResource: string
  details?: Record<string, any>
}

const CATEGORY_TABS: { key: AuditLogEntry['category'] | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All Logs', icon: 'manage_history' },
  { key: 'timesheets', label: 'Timesheets & Labor', icon: 'schedule' },
  { key: 'inventory_pos', label: 'Inventory & POs', icon: 'shopping_cart' },
  { key: 'xero_billing', label: 'Xero & Invoicing', icon: 'sync_alt' },
  { key: 'safety', label: 'Safety & Sign-Ins', icon: 'shield_with_heart' },
  { key: 'auth_users', label: 'Team & Auth', icon: 'group' },
  { key: 'photos', label: 'Photos & Files', icon: 'photo_camera' },
]

export default function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AuditLogEntry['category'] | 'all'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [inspectingEntry, setInspectingEntry] = useState<AuditLogEntry | null>(null)

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)

      const [
        { data: xeroLogs },
        { data: inventoryTx },
        { data: safetySigns },
        { data: timesheets },
        { data: purchaseOrders },
        { data: sitePhotos },
        { data: invitations },
        { data: users },
      ] = await Promise.all([
        supabase.from('xero_sync_log').select('*').order('created_at', { ascending: false }).limit(40),
        supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false }).limit(40),
        supabase.from('safety_signins').select('*, user:users(id, full_name, role)').order('signed_in_at', { ascending: false }).limit(40),
        supabase.from('timesheets').select('*, user:users(id, full_name, role), project:projects(id, name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('purchase_orders').select('*, vendor:clients(id, name), project:projects(id, name)').order('created_at', { ascending: false }).limit(40),
        supabase.from('project_site_photos').select('*, uploader:users(id, full_name, role), project:projects(id, name)').order('created_at', { ascending: false }).limit(30),
        supabase.from('user_invitations').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('users').select('id, full_name, role, email'),
      ])

      const userMap = new Map((users || []).map((u) => [u.id, u]))
      const aggregated: AuditLogEntry[] = []

      // 1. Xero Sync Logs
      ;(xeroLogs || []).forEach((log: any) => {
        aggregated.push({
          id: `xero-${log.id}`,
          timestamp: log.created_at || new Date().toISOString(),
          category: 'xero_billing',
          action: `XERO_SYNC_${(log.sync_type || 'TRANSACTION').toUpperCase()}`,
          severity: log.status === 'success' ? 'success' : log.status === 'error' ? 'error' : 'warn',
          actorName: 'Xero Webhook / Sync Engine',
          actorRole: 'Integration Service',
          targetResource: `${log.entity_type || 'Invoice'} (${log.status})`,
          details: log,
        })
      })

      // 2. Inventory Transactions
      ;(inventoryTx || []).forEach((tx: any) => {
        const actor = tx.created_by ? userMap.get(tx.created_by) : null
        aggregated.push({
          id: `inv-${tx.id}`,
          timestamp: tx.created_at || new Date().toISOString(),
          category: 'inventory_pos',
          action: `STOCK_${(tx.transaction_type || 'MOVEMENT').toUpperCase()}`,
          severity: 'info',
          actorName: actor?.full_name || actor?.email || 'Storeman',
          actorRole: actor?.role || 'Staff',
          targetResource: `Item #${tx.item_id || 'Part'} (Qty: ${tx.quantity || 0})`,
          details: tx,
        })
      })

      // 3. Safety Sign-Ins
      ;(safetySigns || []).forEach((sign: any) => {
        aggregated.push({
          id: `safe-${sign.id}`,
          timestamp: sign.signed_in_at || sign.created_at || new Date().toISOString(),
          category: 'safety',
          action: sign.signed_out_at ? 'SITE_EVACUATION_SIGNOUT' : 'SITE_HAZARD_SIGNIN',
          severity: 'info',
          actorName: sign.user?.full_name || sign.visitor_name || 'Worker',
          actorRole: sign.user?.role || 'Field Crew',
          targetResource: `Project #${sign.project_id || 'General Site'}`,
          details: sign,
        })
      })

      // 4. Timesheet Submissions
      ;(timesheets || []).forEach((ts: any) => {
        const isApproved = ts.status === 'approved' || ts.status === 'invoiced'
        aggregated.push({
          id: `ts-${ts.id}`,
          timestamp: ts.created_at || new Date().toISOString(),
          category: 'timesheets',
          action: isApproved ? 'TIMESHEET_APPROVED' : 'TIMESHEET_SUBMITTED',
          severity: isApproved ? 'success' : 'info',
          actorName: ts.user?.full_name || 'Technician',
          actorRole: ts.user?.role || 'Technician',
          targetResource: `${ts.project?.name || 'Project'} (${Number(ts.hours || 0).toFixed(1)} hrs)`,
          details: ts,
        })
      })

      // 5. Purchase Orders
      ;(purchaseOrders || []).forEach((po: any) => {
        const isReceived = po.status === 'received'
        aggregated.push({
          id: `po-${po.id}`,
          timestamp: po.created_at || new Date().toISOString(),
          category: 'inventory_pos',
          action: isReceived ? 'PO_GOODS_RECEIVED' : 'PO_RAISED',
          severity: isReceived ? 'success' : 'warn',
          actorName: 'Procurement Officer',
          actorRole: 'Manager',
          targetResource: `PO ${po.po_number} • ${po.vendor?.name || 'Supplier'} ($${po.total || 0})`,
          details: po,
        })
      })

      // 6. Site Photos
      ;(sitePhotos || []).forEach((sp: any) => {
        aggregated.push({
          id: `sp-${sp.id}`,
          timestamp: sp.created_at || sp.taken_at || new Date().toISOString(),
          category: 'photos',
          action: 'SITE_PHOTO_CAPTURED',
          severity: 'info',
          actorName: sp.uploader?.full_name || 'Field Tech',
          actorRole: sp.uploader?.role || 'Technician',
          targetResource: `${sp.category?.toUpperCase() || 'PHOTO'} • ${sp.project?.name || 'Project'}`,
          details: sp,
        })
      })

      // 7. Invitations
      ;(invitations || []).forEach((inv: any) => {
        aggregated.push({
          id: `invit-${inv.id}`,
          timestamp: inv.created_at || new Date().toISOString(),
          category: 'auth_users',
          action: inv.status === 'revoked' ? 'USER_INVITATION_REVOKED' : 'USER_INVITATION_SENT',
          severity: inv.status === 'revoked' ? 'warn' : 'info',
          actorName: 'System Administrator',
          actorRole: 'Admin',
          targetResource: `${inv.email} (${inv.role || 'Staff'})`,
          details: inv,
        })
      })

      // Sort newest first
      aggregated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setLogs(aggregated)
    } catch (err) {
      console.error('[AuditLogsSection] Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const filteredLogs = logs.filter((log) => {
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false
    if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) return false

    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(term) ||
      log.actorName.toLowerCase().includes(term) ||
      log.targetResource.toLowerCase().includes(term) ||
      (log.actorRole && log.actorRole.toLowerCase().includes(term))
    )
  })

  const exportCSV = () => {
    const headers = ['Timestamp', 'Category', 'Action', 'Severity', 'Actor', 'Role', 'Target Resource']
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.category,
      l.action,
      l.severity,
      l.actorName,
      l.actorRole || '',
      `"${l.targetResource.replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `amped_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const exportJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `amped_audit_logs_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
  }

  const getSeverityBadge = (sev: AuditLogEntry['severity']) => {
    switch (sev) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'warn':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-lg flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
            <h2 className="text-base font-bold text-white font-display">System Audit Trail & Operational Logs</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Immutable tracking of user authentication, time entries, material dispatches, Xero sync transactions, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={exportCSV} className="text-xs h-[34px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={exportJSON} className="text-xs h-[34px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">code</span>
            Export JSON
          </Button>
          <Button onClick={fetchAuditLogs} className="text-xs h-[34px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 bg-card-dark border border-border-dark rounded-2xl p-4">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.key
            const count = tab.key === 'all' ? logs.length : logs.filter((l) => l.category === tab.key).length

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-black font-bold shadow-md'
                    : 'bg-background-dark/80 text-text-muted hover:text-white hover:bg-surface-dark border border-border-dark'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Search and Severity Filter Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search action code, actor name, role, or resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 bg-background-dark border border-border-dark rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-[36px] px-3 bg-background-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Severities</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12 border border-border-dark rounded-2xl bg-card-dark text-xs text-text-muted">
          Loading audit events and system sync logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-2xl bg-card-dark text-xs text-text-muted space-y-1">
          <span className="material-symbols-outlined text-3xl text-text-muted/40">manage_history</span>
          <p className="font-semibold text-white">No audit records match your filters</p>
          <p className="text-[11px]">Try adjusting your search criteria or category tabs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-2xl bg-card-dark shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Action Code</th>
                <th className="px-4 py-3">Actor / Operator</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {filteredLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })

                return (
                  <tr key={log.id} className="hover:bg-background-dark/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getSeverityBadge(
                          log.severity
                        )}`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary text-[11px]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-white block">{log.actorName}</span>
                        {log.actorRole && (
                          <span className="text-[10px] text-text-muted uppercase font-mono">
                            {log.actorRole}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted truncate max-w-xs">
                      {log.targetResource}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectingEntry(log)}
                        className="px-2 py-1 rounded-lg bg-background-dark hover:bg-surface-dark border border-border-dark text-text-muted hover:text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">code</span>
                        Payload
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON Payload Inspection Modal */}
      {inspectingEntry && (
        <Modal
          isOpen={!!inspectingEntry}
          onClose={() => setInspectingEntry(null)}
          title={`Audit Payload: ${inspectingEntry.action}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-background-dark border border-border-dark space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Event ID:</span>
                <span className="font-mono text-white">{inspectingEntry.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Actor:</span>
                <span className="text-white font-semibold">{inspectingEntry.actorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Timestamp:</span>
                <span className="font-mono text-text-muted">{inspectingEntry.timestamp}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-text-muted block mb-1">
                Raw Event Payload (JSON)
              </span>
              <pre className="p-3.5 rounded-xl bg-background-dark border border-border-dark text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[300px] custom-scrollbar">
                {JSON.stringify(inspectingEntry.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectingEntry(null)} className="text-xs">
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
