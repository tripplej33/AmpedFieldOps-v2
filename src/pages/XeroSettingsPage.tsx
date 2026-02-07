import { useState, useEffect } from 'react'
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

interface ToastState {
  type: 'success' | 'error' | 'info'
  message: string
}

export default function XeroSettingsPage() {
  const [status, setStatus] = useState<XeroStatus | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Credentials form state
  const [credentials, setCredentials] = useState<XeroCredentials>({
    clientId: '',
    clientSecret: '',
    redirectUri: `${window.location.origin}/api/xero/callback`,
  })
  const [validationErrors, setValidationErrors] = useState<{
    clientId?: string
    clientSecret?: string
  }>({})


  const fetchStatus = async () => {
    try {
      console.log('[XeroSettings] Fetching status from:', '/api/admin/xero/status')
      const res = await fetch('/api/admin/xero/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      console.log('[XeroSettings] Status response:', res.status, res.statusText)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch status: ${res.status} - ${text}`)
      }
      const data = await res.json()
      console.log('[XeroSettings] Status fetched:', data)
      setStatus(data)
    } catch (err: any) {
      console.error('[XeroSettings] Failed to fetch status:', err.message || err)
      // Don't show error toast on initial load - just use defaults
      if (status) {
        setToast({ type: 'error', message: err.message || 'Failed to load Xero status' })
      }
    }
  }

  const fetchLogs = async () => {
    try {
      console.log('[XeroSettings] Fetching logs from:', '/api/admin/xero/sync-log')
      const res = await fetch('/api/admin/xero/sync-log', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      console.log('[XeroSettings] Logs response:', res.status, res.statusText)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch logs: ${res.status} - ${text}`)
      }
      const data = await res.json()
      console.log('[XeroSettings] Logs fetched:', data)
      setLogs(data.logs || [])
    } catch (err: any) {
      console.error('[XeroSettings] Failed to fetch logs:', err.message || err)
      // Don't show error toast - logs are optional
    }
  }

  useEffect(() => {
    const loadData = async () => {
      console.log('[XeroSettings] Starting to load data...')
      setLoading(true)
      try {
        // First check if credentials are saved (quick check)
        console.log('[XeroSettings] Checking if credentials are saved...')
        const statusRes = await fetch('/api/admin/xero/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!statusRes.ok) {
          throw new Error(`Failed to fetch status: ${statusRes.status}`)
        }

        const statusData = await statusRes.json()
        console.log('[XeroSettings] Status fetched:', statusData)
        setStatus(statusData)

        // Only load sync logs if credentials are saved
        if (statusData.credentialsSaved) {
          console.log('[XeroSettings] Credentials saved, loading sync logs...')
          await fetchLogs()
        } else {
          console.log('[XeroSettings] No credentials saved yet, skipping sync logs')
          setLogs([])
        }
      } catch (err) {
        console.error('[XeroSettings] Error in loadData:', err)
        // Set default status on error
        setStatus({
          connected: false,
          credentialsSaved: false,
          tenantId: null,
          tenantName: null,
          lastTokenUpdate: null,
          expiresAt: null,
          lastSync: null
        })
        setLogs([])
      } finally {
        console.log('[XeroSettings] Setting loading to false')
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleConnectXero = () => {
    if (!status?.credentialsSaved) {
      return
    }
    window.location.href = '/api/xero/auth'
  }

  const validateCredentials = (): boolean => {
    const errors: { clientId?: string; clientSecret?: string } = {}

    // Client ID must be exactly 32 characters
    if (!credentials.clientId) {
      errors.clientId = 'Client ID is required'
    } else if (credentials.clientId.length !== 32) {
      errors.clientId = 'Client ID must be exactly 32 characters'
    } else if (!/^[a-fA-F0-9]{32}$/.test(credentials.clientId)) {
      errors.clientId = 'Client ID must be hexadecimal (0-9, A-F)'
    }

    // Client Secret is required
    if (!credentials.clientSecret) {
      errors.clientSecret = 'Client Secret is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveCredentials = async () => {
    if (!validateCredentials()) return

    setSavingCredentials(true)
    try {
      console.log('[XeroSettings] Saving credentials to:', '/api/admin/settings/xero')
      const res = await fetch('/api/admin/settings/xero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      console.log('[XeroSettings] Save response:', res.status, res.statusText)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || `Failed to save credentials (${res.status})`)
      }

      const result = await res.json()
      console.log('[XeroSettings] Credentials saved:', result)
      setToast({ type: 'success', message: 'Credentials saved successfully' })

      // Refresh status after saving credentials
      console.log('[XeroSettings] Refreshing status after save...')
      const statusRes = await fetch('/api/admin/xero/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        console.log('[XeroSettings] Status refreshed:', statusData)
        setStatus(statusData)

        // Load logs if credentials are now saved
        if (statusData.credentialsSaved) {
          await fetchLogs()
        }
      }
    } catch (err: any) {
      console.error('[XeroSettings] Failed to save credentials:', err)
      setToast({ type: 'error', message: err.message || 'Failed to save credentials' })
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Xero? This will clear the OAuth tokens.')) {
      return
    }

    setDisconnecting(true)
    try {
      const res = await fetch('/api/xero/disconnect', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to disconnect')

      setToast({ type: 'success', message: 'Disconnected from Xero' })
      await fetchStatus()
    } catch (err) {
      console.error('[XeroSettings] Failed to disconnect:', err)
      setToast({ type: 'error', message: 'Failed to disconnect from Xero' })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSync = async (syncType: 'clients' | 'items' | 'payments' | 'pull-clients' | 'all') => {
    setSyncing(syncType)
    try {
      const res = await fetch(`/api/admin/xero/sync-${syncType}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`Failed to trigger ${syncType} sync`)
      const data = await res.json()
      setToast({ type: 'success', message: `${data.message} (Job ID: ${data.jobId})` })

      // Refresh logs after 2 seconds
      setTimeout(() => {
        fetchLogs()
        fetchStatus()
      }, 2000)
    } catch (err) {
      console.error(`[XeroSettings] Failed to sync ${syncType}:`, err)
      setToast({ type: 'error', message: `Failed to trigger ${syncType} sync` })
    } finally {
      setSyncing(null)
    }
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'Running...'
    const start = new Date(started).getTime()
    const end = new Date(completed).getTime()
    const durationSec = Math.floor((end - start) / 1000)
    if (durationSec < 60) return `${durationSec}s`
    return `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading Xero settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-4xl text-primary">sync</span>
          <h1 className="text-3xl font-bold text-white">Xero Integration</h1>
        </div>
        <p className="text-text-muted">Manage Xero connection and synchronization</p>
      </div>

      {/* Credentials Configuration */}
      {!status?.connected && (
        <div className="bg-card-dark rounded-xl border border-border-dark p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Xero Credentials</h2>
          <p className="text-sm text-text-muted mb-6">
            Enter your Xero application credentials to enable integration. You can obtain these from the{' '}
            <a
              href="https://developer.xero.com/myapps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Xero Developer Portal
            </a>.
          </p>

          <div className="space-y-4">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Client ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="32-character hexadecimal string"
                className={`w-full px-4 py-2 bg-background-dark border rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 ${validationErrors.clientId
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border-dark focus:ring-primary'
                  }`}
                maxLength={32}
              />
              {validationErrors.clientId && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.clientId}</p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                {credentials.clientId.length}/32 characters
              </p>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Client Secret <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Your Xero client secret"
                className={`w-full px-4 py-2 bg-background-dark border rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 ${validationErrors.clientSecret
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border-dark focus:ring-primary'
                  }`}
              />
              {validationErrors.clientSecret && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.clientSecret}</p>
              )}
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Redirect URI
              </label>
              <input
                type="text"
                value={credentials.redirectUri}
                onChange={(e) => setCredentials({ ...credentials, redirectUri: e.target.value })}
                className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-muted">
                This URI must be configured in your Xero app settings
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveCredentials}
                loading={savingCredentials}
                disabled={savingCredentials}
              >
                <span className="material-symbols-outlined">save</span>
                Save Credentials
              </Button>
              {status?.credentialsSaved && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Credentials saved
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-card-dark rounded-xl border border-border-dark p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Connection Status</h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-text-muted">
                {status?.connected
                  ? `Connected${status.tenantName ? ` to ${status.tenantName}` : ''}`
                  : 'Not connected'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {!status?.connected ? (
              <Button
                onClick={handleConnectXero}
                disabled={!status?.credentialsSaved}
              >
                <span className="material-symbols-outlined">link</span>
                Connect to Xero
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={handleConnectXero}>
                  <span className="material-symbols-outlined">refresh</span>
                  Reconnect
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                  disabled={disconnecting}
                >
                  <span className="material-symbols-outlined">link_off</span>
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>

        {status?.connected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background-dark rounded-lg">
              <p className="text-xs text-text-muted mb-1">Tenant ID</p>
              <p className="text-sm text-white font-mono">{status.tenantId?.slice(0, 16)}...</p>
            </div>
            <div className="p-4 bg-background-dark rounded-lg">
              <p className="text-xs text-text-muted mb-1">Last Token Update</p>
              <p className="text-sm text-white">{formatTime(status.lastTokenUpdate)}</p>
            </div>
            <div className="p-4 bg-background-dark rounded-lg">
              <p className="text-xs text-text-muted mb-1">Last Sync</p>
              <p className="text-sm text-white">
                {status.lastSync ? `${status.lastSync.sync_type} (${status.lastSync.status})` : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Sync Actions */}
      {status?.connected && (
        <div className="bg-card-dark rounded-xl border border-border-dark p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Manual Synchronization</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleSync('pull-clients')}
              disabled={syncing !== null}
              className="flex flex-col items-start p-4 bg-background-dark hover:bg-nav-hover rounded-lg border border-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">download</span>
                <span className="font-medium text-white">Pull Contacts</span>
              </div>
              <p className="text-xs text-text-muted text-left">
                Import contacts from Xero into your local database
              </p>
              {syncing === 'pull-clients' && (
                <div className="mt-2 text-xs text-primary">Pulling...</div>
              )}
            </button>

            <button
              onClick={() => handleSync('clients')}
              disabled={syncing !== null}
              className="flex flex-col items-start p-4 bg-background-dark hover:bg-nav-hover rounded-lg border border-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">upload</span>
                <span className="font-medium text-white">Push Clients</span>
              </div>
              <p className="text-xs text-text-muted text-left">
                Export local clients to Xero contacts
              </p>
              {syncing === 'clients' && (
                <div className="mt-2 text-xs text-primary">Pushing...</div>
              )}
            </button>

            <button
              onClick={() => handleSync('items')}
              disabled={syncing !== null}
              className="flex flex-col items-start p-4 bg-background-dark hover:bg-nav-hover rounded-lg border border-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">inventory</span>
                <span className="font-medium text-white">Sync Products</span>
              </div>
              <p className="text-xs text-text-muted text-left">
                Import Xero products as activity types
              </p>
              {syncing === 'items' && (
                <div className="mt-2 text-xs text-primary">Syncing...</div>
              )}
            </button>

            <button
              onClick={() => handleSync('payments')}
              disabled={syncing !== null}
              className="flex flex-col items-start p-4 bg-background-dark hover:bg-nav-hover rounded-lg border border-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                <span className="font-medium text-white">Sync Payments</span>
              </div>
              <p className="text-xs text-text-muted text-left">
                Update invoice payment statuses
              </p>
              {syncing === 'payments' && (
                <div className="mt-2 text-xs text-primary">Syncing...</div>
              )}
            </button>

            <button
              onClick={() => handleSync('all')}
              disabled={syncing !== null}
              className="flex flex-col items-start p-4 bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-1 md:col-span-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">sync_all</span>
                <span className="font-medium text-white text-lg">Sync Everything</span>
              </div>
              <p className="text-sm text-text-muted text-left">
                Sequentially pull all contacts, update products, pull invoices, and sync payments.
              </p>
              {syncing === 'all' && (
                <div className="mt-2 text-sm text-primary animate-pulse">Running Master Sync...</div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sync History */}
      <div className="bg-card-dark rounded-xl border border-border-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Sync History</h2>
          <Button variant="secondary" onClick={fetchLogs}>
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </Button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <span className="material-symbols-outlined text-4xl mb-2">history</span>
            <p>No sync history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-dark">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Sync Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Records</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="hover:bg-nav-hover">
                    <td className="px-4 py-3 text-sm text-white font-medium capitalize">
                      {log.sync_type.replace('-', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${log.status === 'success' ? 'bg-green-500/10 text-green-400' :
                        log.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                        {log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⟳'} {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatTime(log.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatDuration(log.started_at, log.completed_at)}</td>
                    <td className="px-4 py-3 text-sm text-white">{log.records_processed ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-muted truncate max-w-xs">
                      {log.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
