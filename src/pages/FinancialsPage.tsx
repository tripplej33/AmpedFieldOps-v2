
import { useState, useEffect } from 'react'
import StatCard from '@/components/ui/StatCard'
import { Invoice } from '../types'

interface XeroSyncStatus {
  lastSyncTime: string
  syncStatus: 'success' | 'pending' | 'error'
  errorMessage?: string
  itemsSynced: number
}

export default function FinancialsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [xeroSync, setXeroSync] = useState<XeroSyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'overdue' | 'paid' | 'void'>('all')

  useEffect(() => {
    fetchFinancialsData()
  }, [])

  const fetchFinancialsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all invoices
      const invoiceRes = await fetch('/api/admin/xero/invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      if (invoiceRes.ok) {
        const invoiceData: Invoice[] = await invoiceRes.json()
        setInvoices(invoiceData)
      }

      // Fetch Xero sync status
      const syncRes = await fetch('/api/admin/xero/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      if (syncRes.ok) {
        const syncData = await syncRes.json()
        setXeroSync({
          lastSyncTime: syncData.lastTokenUpdate || new Date().toISOString(),
          syncStatus: syncData.connected ? 'success' : 'pending',
          itemsSynced: 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financials')
    } finally {
      setLoading(false)
    }
  }

  // Helper to filter and calculate totals
  const nonVoidInvoices = invoices.filter(inv => inv.payment_status !== 'void')

  const awaitingPaymentTotal = nonVoidInvoices
    .filter(inv => inv.payment_status === 'awaiting_payment' || inv.payment_status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const overdueTotal = nonVoidInvoices
    .filter(inv => inv.payment_status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const invoicesThisMonthCount = nonVoidInvoices
    .filter(inv => {
      const date = new Date(inv.issue_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length

  const totalPaidAmount = nonVoidInvoices
    .filter(inv => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-400'
      case 'overdue': return 'bg-red-500/10 text-red-400'
      case 'awaiting_payment': return 'bg-blue-500/10 text-blue-400'
      case 'awaiting_approval': return 'bg-yellow-500/10 text-yellow-400'
      case 'draft': return 'bg-gray-500/10 text-gray-400'
      case 'void': return 'bg-orange-500/10 text-orange-400'
      default: return 'bg-gray-500/10 text-gray-400'
    }
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'awaiting_approval', label: 'Approval' },
    { id: 'awaiting_payment', label: 'Pending' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'paid', label: 'Paid' },
    { id: 'void', label: 'Voided' }
  ] as const;

  const filteredInvoices = activeTab === 'all'
    ? invoices
    : invoices.filter(inv => inv.payment_status === activeTab)

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Financials</h1>
          <p className="text-text-muted">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card-dark rounded-xl border border-border-dark h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Financials</h1>
        <p className="text-text-muted">Unified revenue tracking across all Xero invoices</p>
        {error && <p className="text-red-400 text-sm mt-2">⚠️ {error}</p>}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Awaiting Payment"
          value={formatCurrency(awaitingPaymentTotal)}
          icon="pending_actions"
          subtitle="Awaiting + Overdue"
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(overdueTotal)}
          icon="warning"
          subtitle="Action required"
          trend={overdueTotal > 0 ? { value: 100, isPositive: false } : undefined}
        />
        <StatCard
          title="Invoices This Month"
          value={invoicesThisMonthCount.toString()}
          icon="receipt_long"
          subtitle="Issued this month"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaidAmount)}
          icon="check_circle"
          subtitle="Successfully reconciled"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden">
        <div className="p-6 border-b border-border-dark">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Invoice Detail</h2>
              <p className="text-sm text-text-muted mt-1">Synchronized Xero ledger records</p>
            </div>

            {/* Tabs Filter */}
            <div className="flex flex-wrap gap-1 p-1 bg-background-dark rounded-lg self-start">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                  {tab.label}
                  <span className="ml-2 opacity-50">
                    ({tab.id === 'all' ? invoices.length : invoices.filter(i => i.payment_status === tab.id).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background-dark/50 text-text-muted text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Invoice #</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Due</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    No invoices found. Use Xero Sync to pull data.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{inv.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-text-muted">{inv.client_name || 'Unknown Client'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(inv.payment_status)}`}>
                        {inv.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {formatCurrency(inv.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Breakdown and Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Breakdown */}
        <div className="lg:col-span-1 bg-card-dark rounded-xl border border-border-dark p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Status Breakdown</h3>
          <div className="space-y-4">
            {['draft', 'awaiting_approval', 'awaiting_payment', 'overdue', 'paid', 'void'].map(status => {
              const count = invoices.filter(i => i.payment_status === status).length
              const amount = invoices.filter(i => i.payment_status === status).reduce((sum, i) => sum + Number(i.total), 0)
              if (count === 0 && status === 'void') return null

              return (
                <div key={status} className="flex items-center justify-between p-3 bg-background-dark/50 rounded-lg">
                  <div>
                    <span className="text-xs text-text-muted uppercase font-bold tracking-wider block mb-1">
                      {status.replace('_', ' ')}
                    </span>
                    <span className="text-lg font-semibold text-white">{count}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">{formatCurrency(amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sync Status */}
        <div className="lg:col-span-2 bg-card-dark rounded-xl border border-border-dark p-6">
          <h3 className="font-semibold text-white mb-6 px-1">Sync Intelligence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-background-dark/50 border border-border-dark rounded-xl">
              <p className="text-xs text-text-muted mb-2 uppercase tracking-wide font-bold">Xero Connection</p>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${xeroSync?.syncStatus === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
                <span className="text-white font-medium">{xeroSync?.syncStatus === 'success' ? 'Synchronized' : 'Disconnected'}</span>
              </div>
            </div>
            <div className="p-4 bg-background-dark/50 border border-border-dark rounded-xl">
              <p className="text-xs text-text-muted mb-2 uppercase tracking-wide font-bold">Last Activity</p>
              <span className="text-white font-medium">{xeroSync?.lastSyncTime ? new Date(xeroSync.lastSyncTime).toLocaleString() : 'Never'}</span>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => fetchFinancialsData()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-semibold shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">refresh</span>
              Refresh Financial Data
            </button>
            <p className="text-center text-[10px] text-text-muted mt-3 uppercase tracking-tighter">
              Synchronizing with Xero primary ledger via background job worker
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
