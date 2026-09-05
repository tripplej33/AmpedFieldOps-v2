import { useState, useMemo } from 'react'
import { ActivityFeedItem } from '@/mocks/dashboardData'

interface ActivityFeedProps {
  items: ActivityFeedItem[]
  isLoading?: boolean
  onLoadMore?: () => void
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    timesheet_submitted: 'Submitted timesheet for review',
    timesheet_approved: 'Approved technician timesheet',
    job_created: 'Dispatched new project job',
    job_updated: 'Updated project specifications',
    project_updated: 'Updated project record',
    po_raised: 'Raised purchase order',
    goods_received: 'Received PO stock delivery',
    photo_uploaded: 'Uploaded structured site photo',
    safety_signed: 'Signed into project site',
  }
  return labels[action] || action.replace(/_/g, ' ')
}

function getActionIcon(action: string, resourceType?: string): string {
  if (action.includes('timesheet')) return 'schedule'
  if (action.includes('photo')) return 'photo_camera'
  if (action.includes('safety') || action.includes('hazard')) return 'shield_with_heart'
  if (action.includes('po_') || action.includes('goods_') || action.includes('stock')) return 'shopping_cart'
  if (resourceType === 'project' || action.includes('job') || action.includes('project')) return 'work'
  return 'notifications'
}

function getActionColor(action: string): string {
  if (action.includes('approved') || action.includes('received')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  }
  if (action.includes('submitted')) {
    return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  }
  if (action.includes('photo')) {
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
  }
  return 'bg-primary/20 text-primary border-primary/40'
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ActivityFeed({ items, isLoading = false, onLoadMore }: ActivityFeedProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'timesheets' | 'projects' | 'sync' | 'files'>('all')

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory === 'all') return true
      if (filterCategory === 'timesheets') return item.resourceType === 'timesheet' || item.action.includes('timesheet')
      if (filterCategory === 'projects') return item.resourceType === 'project' && !item.userId.includes('files') && !item.userId.includes('xero')
      if (filterCategory === 'files') return item.userId === 'files' || item.action.includes('photo')
      if (filterCategory === 'sync') return item.userId === 'xero' || item.action.includes('sync')
      return true
    })
  }, [items, filterCategory])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-primary">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filterCategory === 'all'
              ? 'bg-primary text-black font-bold shadow-sm'
              : 'bg-background-dark/80 text-text-muted hover:text-white border border-border-dark'
          }`}
        >
          All Events ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('timesheets')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filterCategory === 'timesheets'
              ? 'bg-primary text-black font-bold shadow-sm'
              : 'bg-background-dark/80 text-text-muted hover:text-white border border-border-dark'
          }`}
        >
          Timesheets
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('projects')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filterCategory === 'projects'
              ? 'bg-primary text-black font-bold shadow-sm'
              : 'bg-background-dark/80 text-text-muted hover:text-white border border-border-dark'
          }`}
        >
          Projects
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('files')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filterCategory === 'files'
              ? 'bg-primary text-black font-bold shadow-sm'
              : 'bg-background-dark/80 text-text-muted hover:text-white border border-border-dark'
          }`}
        >
          Documents & Vault
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('sync')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filterCategory === 'sync'
              ? 'bg-primary text-black font-bold shadow-sm'
              : 'bg-background-dark/80 text-text-muted hover:text-white border border-border-dark'
          }`}
        >
          Xero Sync
        </button>
      </div>

      {/* Events Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-3xl text-text-muted/40 mb-1 block">inbox</span>
          <p className="text-xs text-text-muted">No activity events in this channel</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3 group">
              {/* Timeline Connector Icon */}
              <div className="flex flex-col items-center pt-0.5">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${getActionColor(
                    item.action
                  )}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {getActionIcon(item.action, item.resourceType)}
                  </span>
                </div>
                {index < filtered.length - 1 && (
                  <div className="w-0.5 h-full min-h-[20px] bg-border-dark/60 mt-1.5" />
                )}
              </div>

              {/* Event Content Card */}
              <div className="flex-1 bg-background-dark/70 group-hover:bg-background-dark border border-border-dark/70 rounded-xl p-3 transition-colors min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      <span className="text-primary font-bold">{item.userName}</span>{' '}
                      <span className="text-text-muted font-normal">• {getActionLabel(item.action)}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 truncate font-medium">
                      {item.resourceName}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono whitespace-nowrap shrink-0">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {onLoadMore && (
            <button
              onClick={onLoadMore}
              className="w-full py-2 text-center text-xs text-primary font-semibold hover:bg-primary/10 rounded-xl transition-colors"
            >
              Load more events
            </button>
          )}
        </div>
      )}
    </div>
  )
}

