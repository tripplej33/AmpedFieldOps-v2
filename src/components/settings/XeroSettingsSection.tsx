import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

interface XeroStatus {
  connected: boolean
  tenantId: string | null
  tenantName: string | null
  lastTokenUpdate: string | null
  expiresAt: string | null
  credentialsSaved: boolean
  lastSync: {
    sync_type: string
    status: string
    completed_at: string
  } | null
}

interface XeroCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

interface SyncLog {
  id: string
  sync_type: string
  status: 'success' | 'failed' | 'running'
  started_at: string
  completed_at: string | null
  records_processed: number | null
  error_message: string | null
}

export default function XeroSettingsSection() {
  const [status, setStatus] = useState<XeroStatus | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [credentials, setCredentials] = useState<XeroCredentials>({
    clientId: '',
    clientSecret: '',
    redirectUri: `${window.location.origin}/api/xero/callback`,
  })

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/xero/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch Xero status:', err)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/xero/sync-log')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await fetchStatus()
        await fetchLogs()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fetchStatus, fetchLogs])

  const handleConnectXero = () => {
    window.location.href = '/api/xero/auth'
  }

  const handleSaveCredentials = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      setToast({ type: 'error', message: 'Client ID and Secret are required' })
      return
    }

    try {
      setSavingCredentials(true)
      const res = await fetch('/api/admin/settings/xero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!res.ok) throw new Error('Failed to save credentials')
      setToast({ type: 'success', message: 'Xero API credentials saved' })
      await fetchStatus()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error saving credentials' })
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect from Xero? OAuth tokens will be cleared.')) return
    try {
      setDisconnecting(true)
      await fetch('/api/xero/disconnect', { method: 'POST' })
      setToast({ type: 'success', message: 'Disconnected from Xero' })
      await fetchStatus()
    } finally {
      setDisconnecting(false)
    }
  }

  const handleManualSync = async (type: 'contacts' | 'timesheets' | 'cost_centers' | 'all') => {
    try {
      setSyncing(type)
      const res = await fetch(`/api/admin/xero/sync/${type}`, { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      setToast({ type: 'success', message: `Xero ${type} synchronization completed` })
      await fetchStatus()
      await fetchLogs()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Sync failed' })
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return <div className="text-center py-10 text-xs text-text-muted">Loading Xero configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <span className="material-symbols-outlined text-3xl">sync_alt</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Xero Cloud Accounting Integration
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Automated 2-way sync for Customers, Vendors, Timesheet Invoicing, and Cost Center Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status?.connected ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected: {status.tenantName || 'Amped Logix'}
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="h-[34px] px-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/30 text-xs font-semibold"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <Button onClick={handleConnectXero} className="h-[36px] text-xs">
              <span className="material-symbols-outlined text-base">link</span>
              Connect to Xero
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Credentials Form */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">vpn_key</span>
            OAuth 2.0 API Credentials
          </h3>
          <p className="text-xs text-text-muted">
            Configure your Xero Developer App keys from <a href="https://developer.xero.com/app/manage" target="_blank" rel="noreferrer" className="text-primary underline">developer.xero.com</a>
          </p>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Client ID</label>
              <input
                type="text"
                placeholder="32-character Xero Client ID"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Client Secret</label>
              <input
                type="password"
                placeholder="Xero Client Secret Key"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Authorized Redirect URI</label>
              <input
                type="text"
                readOnly
                value={credentials.redirectUri}
                className="w-full h-[38px] px-3 bg-background-dark/50 border border-border-dark/60 rounded-lg text-text-muted font-mono text-[11px]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveCredentials} disabled={savingCredentials}>
                {savingCredentials ? 'Saving...' : 'Save API Credentials'}
              </Button>
            </div>
          </div>
        </div>

        {/* Manual Sync Triggers */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">published_with_changes</span>
            Manual Synchronization Controls
          </h3>
          <p className="text-xs text-text-muted">
            Force an immediate data sync between AmpedFieldOps and your Xero organization
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleManualSync('contacts')}
              disabled={!status?.connected || syncing !== null}
              className="p-3.5 rounded-xl bg-background-dark border border-border-dark hover:border-primary/50 text-left transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-primary text-xl">groups</span>
              <h4 className="font-semibold text-white text-xs mt-1">Sync Clients & Vendors</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Pulls all active Xero contacts</p>
            </button>

            <button
              onClick={() => handleManualSync('timesheets')}
              disabled={!status?.connected || syncing !== null}
              className="p-3.5 rounded-xl bg-background-dark border border-border-dark hover:border-primary/50 text-left transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-primary text-xl">schedule</span>
              <h4 className="font-semibold text-white text-xs mt-1">Sync Timesheet Drafts</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Pushes approved labor hours</p>
            </button>

            <button
              onClick={() => handleManualSync('cost_centers')}
              disabled={!status?.connected || syncing !== null}
              className="p-3.5 rounded-xl bg-background-dark border border-border-dark hover:border-primary/50 text-left transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
              <h4 className="font-semibold text-white text-xs mt-1">Sync Tracking Categories</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Maps job cost centers</p>
            </button>

            <button
              onClick={() => handleManualSync('all')}
              disabled={!status?.connected || syncing !== null}
              className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 hover:border-primary text-left transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-primary text-xl">cloud_sync</span>
              <h4 className="font-semibold text-primary text-xs mt-1">Full Comprehensive Sync</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Executes all sync routines</p>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">history</span>
          Synchronization Audit History
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-muted border border-dashed border-border-dark rounded-xl">
            No recent synchronization events recorded.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border-dark rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Sync Operation</th>
                  <th className="px-4 py-3">Records Processed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark/60 text-white">
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-background-dark/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold capitalize">{log.sync_type}</td>
                    <td className="px-4 py-3 font-mono text-center">{log.records_processed ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize border ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted max-w-xs truncate">
                      {log.error_message || 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
