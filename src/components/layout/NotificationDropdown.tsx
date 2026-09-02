import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '@/components/ui/UserAvatar'
import SendNotificationModal from '@/components/notifications/SendNotificationModal'
import type { AppNotification, DirectNotification, NotificationCategory } from '@/types'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: AppNotification[]
  sentNotifications?: DirectNotification[]
  loading: boolean
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onAcknowledge?: (id: string) => Promise<void>
  onDecline?: (id: string, reason?: string) => Promise<void>
  onClearHistory?: (id: string, asSender?: boolean) => Promise<void>
  placement?: 'sidebar' | 'sidebar-collapsed' | 'header'
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  sentNotifications = [],
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onAcknowledge,
  onDecline,
  onClearHistory,
  placement = 'sidebar',
}: NotificationDropdownProps) {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [filter, setFilter] = useState<NotificationCategory>('all')
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Close when clicking outside (unless send modal is open)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !isSendModalOpen
      ) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, isSendModalOpen])

  if (!isOpen) return null

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true
    return n.category === filter
  })

  const handleActionClick = (n: AppNotification) => {
    onMarkAsRead(n.id)
    onClose()
    if (n.linkUrl) {
      navigate(n.linkUrl)
    }
  }

  const handleAcknowledge = async (n: AppNotification) => {
    if (!n.directNotification || !onAcknowledge) return
    try {
      setActioningId(n.directNotification.id)
      await onAcknowledge(n.directNotification.id)
      onMarkAsRead(n.id)
    } finally {
      setActioningId(null)
    }
  }

  const handleDecline = async (n: AppNotification) => {
    if (!n.directNotification || !onDecline) return
    try {
      setActioningId(n.directNotification.id)
      await onDecline(n.directNotification.id, 'Declined by recipient')
      onMarkAsRead(n.id)
    } finally {
      setActioningId(null)
    }
  }

  const handleClear = async (id: string, asSender = false) => {
    if (onClearHistory) {
      await onClearHistory(id, asSender)
    }
  }

  const getPriorityIcon = (n: AppNotification) => {
    if (n.category === 'direct_tasks') return 'forum'
    if (n.category === 'credentials') return 'badge'
    if (n.category === 'safety_fleet') return 'directions_car'
    if (n.category === 'timesheets') return 'schedule'
    if (n.category === 'qc_snags') return 'verified_user'
    if (n.category === 'procurement_stock') return 'shopping_cart'
    return 'notifications'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    }
  }

  const getPlacementClasses = () => {
    switch (placement) {
      case 'sidebar':
        return 'left-2 bottom-16 w-[320px] sm:w-[420px]'
      case 'sidebar-collapsed':
        return 'left-16 bottom-4 w-[320px] sm:w-[420px]'
      default:
        return 'right-0 top-12 w-[340px] sm:w-[440px]'
    }
  }

  return (
    <>
      <div
        ref={dropdownRef}
        className={`absolute ${getPlacementClasses()} h-[460px] flex flex-col bg-card-dark border border-border-dark rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn`}
      >
        {/* Top Header */}
        <div className="p-3.5 border-b border-border-dark flex items-center justify-between bg-background-dark/80 shrink-0">
          {/* Inbox vs Sent Switcher */}
          <div className="flex items-center gap-1 bg-background-dark p-0.5 rounded-lg border border-border-dark">
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'inbox'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <span>Inbox</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[9px]">
                {notifications.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'sent'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <span>Sent Tasks</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[9px]">
                {sentNotifications.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSendModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm"
              title="Dispatch Task to Teammates"
            >
              <span className="material-symbols-outlined text-xs">send</span>
              Send Task
            </button>

            {activeTab === 'inbox' && notifications.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[10px] text-text-muted hover:text-white transition-colors"
              >
                Mark read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs (Only for Inbox) */}
        {activeTab === 'inbox' && (
          <div className="flex gap-1 p-2 border-b border-border-dark/60 bg-background-dark/40 overflow-x-auto text-[11px] no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'all'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('direct_tasks')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'direct_tasks'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              Direct Tasks
            </button>
            <button
              type="button"
              onClick={() => setFilter('qc_snags')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'qc_snags'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              QC Snags
            </button>
            <button
              type="button"
              onClick={() => setFilter('credentials')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'credentials'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              Licences
            </button>
            <button
              type="button"
              onClick={() => setFilter('timesheets')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'timesheets'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              Timesheets
            </button>
            <button
              type="button"
              onClick={() => setFilter('safety_fleet')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filter === 'safety_fleet'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              Fleet
            </button>
          </div>
        )}

        {/* Notifications List Content */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border-dark/40">
          {loading ? (
            <div className="text-center py-8 text-xs text-text-muted">Scanning field alerts...</div>
          ) : activeTab === 'sent' ? (
            /* Sent Tasks & History Tracker */
            sentNotifications.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2">
                <span className="material-symbols-outlined text-4xl text-text-muted/40 block">
                  outbox
                </span>
                <p className="text-xs font-semibold text-white">No Dispatched Tasks in History</p>
                <p className="text-[11px] text-text-muted">
                  Use "Send Task" to dispatch operational reminders and requests to your crew.
                </p>
              </div>
            ) : (
              sentNotifications.map((sn) => {
                const isPending = sn.status === 'pending'
                const isAcknowledged = sn.status === 'acknowledged'
                const isDeclined = sn.status === 'declined'

                return (
                  <div key={sn.id} className="p-3 bg-card-dark hover:bg-background-dark/60 transition-colors flex items-start gap-3">
                    <UserAvatar user={sn.recipient} size="sm" />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{sn.title}</h4>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                            isAcknowledged
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isDeclined
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {isPending ? 'Pending Action' : isAcknowledged ? 'Acknowledged' : 'Declined'}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                        To <strong className="text-white">{sn.recipient?.full_name || sn.recipient?.email || 'Teammate'}</strong>: {sn.message}
                      </p>

                      {sn.response_note && (
                        <p className="text-[10px] text-amber-300/90 italic">
                          Note: "{sn.response_note}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-text-muted font-mono">
                          {new Date(sn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(sn.created_at).toLocaleDateString()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleClear(sn.id, true)}
                          className="text-[10px] text-text-muted hover:text-red-400 transition-colors"
                          title="Clear from Sent History"
                        >
                          Clear from History
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )
          ) : filtered.length === 0 ? (
            /* Empty Inbox */
            <div className="text-center py-10 px-4 space-y-2">
              <span className="material-symbols-outlined text-4xl text-emerald-400/80 block">
                verified
              </span>
              <p className="text-xs font-semibold text-white">All Clear & Compliant</p>
              <p className="text-[11px] text-text-muted">
                No pending tasks, open snags, or unread approvals for this filter.
              </p>
            </div>
          ) : (
            /* Inbox Notifications */
            filtered.map((n) => {
              const icon = getPriorityIcon(n)
              const colorClass = getPriorityColor(n.priority)
              const directNotif = n.directNotification
              const isDirect = !!directNotif
              const isPending = isDirect && directNotif.status === 'pending'
              const isActioning = isDirect && actioningId === directNotif.id

              return (
                <div
                  key={n.id}
                  className={`p-3 transition-colors flex items-start gap-3 hover:bg-background-dark/60 ${
                    n.read ? 'opacity-70 bg-transparent' : 'bg-primary/[0.04]'
                  }`}
                >
                  {/* Avatar or Icon */}
                  {isDirect && directNotif.sender ? (
                    <UserAvatar user={directNotif.sender} size="sm" />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${colorClass}`}
                    >
                      <span className="material-symbols-outlined text-base">{icon}</span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                      {n.message}
                    </p>

                    {/* Direct Action Buttons */}
                    {isDirect && isPending ? (
                      <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handleAcknowledge(n)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handleDecline(n)}
                          className="px-2.5 py-1 rounded-lg bg-background-dark hover:bg-border-dark text-text-muted hover:text-red-400 border border-border-dark text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                          Decline
                        </button>
                        {n.linkUrl && (
                          <button
                            type="button"
                            onClick={() => handleActionClick(n)}
                            className="text-[10px] text-primary hover:underline ml-auto"
                          >
                            Open Link →
                          </button>
                        )}
                      </div>
                    ) : isDirect && directNotif.status !== 'pending' ? (
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            directNotif.status === 'acknowledged'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {directNotif.status}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleClear(directNotif.id, false)}
                            className="text-[10px] text-text-muted hover:text-white"
                          >
                            Clear
                          </button>
                          {n.linkUrl && (
                            <button
                              type="button"
                              onClick={() => handleActionClick(n)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              View →
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Standard Action Link */
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-text-muted font-mono">
                          {n.priority.toUpperCase()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleActionClick(n)}
                          className="px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>{n.actionLabel || 'View'}</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </>
  )
}
