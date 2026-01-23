import StatCard from '@/components/ui/StatCard'
import { mockInvoicePipeline, mockXeroSyncStatus } from '@/mocks/dashboardData'

export default function FinancialsPage() {
  const invoicePipeline = mockInvoicePipeline
  const xeroSync = mockXeroSyncStatus

  // Calculate totals
  const totalInvoiceAmount = invoicePipeline.reduce((sum, item) => sum + item.amount, 0)
  const totalInvoiceCount = invoicePipeline.reduce((sum, item) => sum + item.count, 0)

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Financials</h1>
        <p className="text-text-muted">Revenue tracking and Xero integration status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Invoice Amount"
          value={`$${totalInvoiceAmount.toLocaleString()}`}
          icon="payments"
          subtitle={`${totalInvoiceCount} invoices`}
        />
        <StatCard
          title="Invoices This Month"
          value={invoicePipeline.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.count, 0).toString()}
          icon="receipt"
          subtitle="Pending processing"
        />
        <StatCard
          title="Overdue Amount"
          value={`$${invoicePipeline.find(i => i.status === 'overdue')?.amount || 0}`}
          icon="warning"
          subtitle="Requires attention"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invoice Pipeline - 2 columns */}
        <div className="lg:col-span-2 bg-card-dark rounded-xl border border-border-dark p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Invoice Pipeline</h2>
            <p className="text-sm text-text-muted mt-1">Status breakdown of all invoices</p>
          </div>

          <div className="space-y-4">
            {invoicePipeline.map(item => (
              <div key={item.status} className="flex items-center justify-between p-4 bg-background-dark rounded-lg hover:bg-background-dark/80 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'draft' ? 'bg-gray-400' :
                      item.status === 'sent' ? 'bg-blue-400' :
                      item.status === 'paid' ? 'bg-green-400' :
                      'bg-red-400'
                    }`} />
                    <span className="font-medium text-white capitalize">{item.status}</span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {item.count} invoice{item.count !== 1 ? 's' : ''} worth ${item.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{item.count}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-muted">Total</span>
              <span className="text-lg font-semibold text-white">${totalInvoiceAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Xero Sync Status */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-6">
            <h3 className="font-semibold text-white mb-4">Xero Integration Status</h3>
            
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 bg-background-dark rounded-lg">
                <span className="text-sm text-text-muted">Status:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    xeroSync.syncStatus === 'success' ? 'bg-green-400' :
                    xeroSync.syncStatus === 'pending' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <span className={`text-sm font-medium capitalize ${
                    xeroSync.syncStatus === 'success' ? 'text-green-400' :
                    xeroSync.syncStatus === 'pending' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>{xeroSync.syncStatus}</span>
                </div>
              </div>

              {/* Last Sync */}
              <div className="p-3 bg-background-dark rounded-lg">
                <p className="text-xs text-text-muted mb-1">Last Sync:</p>
                <p className="text-sm font-medium text-white">{formatTime(xeroSync.lastSyncTime)}</p>
              </div>

              {/* Items Synced */}
              <div className="p-3 bg-background-dark rounded-lg">
                <p className="text-xs text-text-muted mb-1">Items Synced:</p>
                <p className="text-sm font-medium text-white">{xeroSync.itemsSynced}</p>
              </div>

              {/* Error Message (if any) */}
              {xeroSync.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">Error:</p>
                  <p className="text-sm text-red-300 mt-1">{xeroSync.errorMessage}</p>
                </div>
              )}
            </div>

            {/* Manual Sync Button */}
            <button
              disabled={xeroSync.syncStatus === 'pending'}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <span className={`material-symbols-outlined ${xeroSync.syncStatus === 'pending' ? 'animate-spin' : ''}`}>
                sync
              </span>
              {xeroSync.syncStatus === 'pending' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-6">
            <h3 className="font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-left text-text-muted hover:text-white">
                <span className="material-symbols-outlined">file_download</span>
                <span className="text-sm">Export Invoices</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-left text-text-muted hover:text-white">
                <span className="material-symbols-outlined">open_in_new</span>
                <span className="text-sm">View in Xero</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-left text-text-muted hover:text-white">
                <span className="material-symbols-outlined">assessment</span>
                <span className="text-sm">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
