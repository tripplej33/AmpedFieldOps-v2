import { ActivityFeedItem } from '@/mocks/dashboardData'

interface ActivityFeedProps {
  items: ActivityFeedItem[]
  isLoading?: boolean
  onLoadMore?: () => void
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    timesheet_submitted: 'Submitted timesheet',
    timesheet_approved: 'Approved timesheet',
    job_created: 'Created job',
    job_updated: 'Updated job',
    project_updated: 'Updated project'
  }
  return labels[action] || action
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    timesheet_submitted: 'schedule',
    timesheet_approved: 'check_circle',
    job_created: 'work',
    job_updated: 'edit',
    project_updated: 'folder'
  }
  return icons[action] || 'info'
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

  return date.toLocaleDateString()
}

export default function ActivityFeed({ items, isLoading = false, onLoadMore }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin">
          <span className="material-symbols-outlined text-primary">sync</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">inbox</span>
          <p className="text-text-muted">No activity yet</p>
        </div>
      ) : (
        <>
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/20 p-2 border border-primary/40">
                  <span className="material-symbols-outlined text-sm text-primary">{getActionIcon(item.action)}</span>
                </div>
                {index < items.length - 1 && <div className="h-12 w-0.5 bg-border-dark mt-2" />}
              </div>

              {/* Content */}
              <div className="pt-1 pb-4 flex-1 cursor-pointer hover:bg-card-dark/50 rounded-lg px-3 py-2 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      <span className="font-semibold">{item.userName}</span> {getActionLabel(item.action)}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{item.resourceName}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">{formatTime(item.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}

          {onLoadMore && (
            <button
              onClick={onLoadMore}
              className="w-full py-2 text-center text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  )
}
