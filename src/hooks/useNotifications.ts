import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification, DirectNotification } from '@/types'

const READ_STORAGE_KEY = 'amped_read_notifications_v1'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [sentNotifications, setSentNotifications] = useState<DirectNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(READ_STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const fetchLiveAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const alerts: AppNotification[] = []
      const now = new Date()
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000)

      if (user?.id) {
        // 1. Direct Inter-User Received Notifications (where not recipient_cleared)
        const { data: directNotifs } = await supabase
          .from('direct_notifications')
          .select(`
            id, sender_id, recipient_id, category, title, message, link_url, action_type, status, response_note, sender_cleared, recipient_cleared, created_at, actioned_at,
            sender:users!direct_notifications_sender_id_fkey(id, full_name, email, avatar_url)
          `)
          .eq('recipient_id', user.id)
          .eq('recipient_cleared', false)
          .order('created_at', { ascending: false })
          .limit(30)

        if (directNotifs) {
          directNotifs.forEach((dn: any) => {
            const sender = Array.isArray(dn.sender) ? dn.sender[0] : dn.sender
            const isPending = dn.status === 'pending'
            alerts.push({
              id: `direct-${dn.id}`,
              title: dn.title,
              message: `${sender?.full_name || 'Team member'}: ${dn.message}`,
              category: 'direct_tasks',
              priority: isPending ? 'urgent' : 'info',
              timestamp: dn.created_at,
              linkUrl: dn.link_url || '/app/dashboard',
              read: !isPending,
              actionLabel: isPending ? 'Action Required' : dn.status === 'acknowledged' ? 'Acknowledged' : 'Declined',
              directNotification: { ...dn, sender },
            })
          })
        }

        // 2. Direct Inter-User Sent Notifications Tracker (where not sender_cleared)
        const { data: sentNotifs } = await supabase
          .from('direct_notifications')
          .select(`
            id, sender_id, recipient_id, category, title, message, link_url, action_type, status, response_note, sender_cleared, recipient_cleared, created_at, actioned_at,
            recipient:users!direct_notifications_recipient_id_fkey(id, full_name, email, avatar_url)
          `)
          .eq('sender_id', user.id)
          .eq('sender_cleared', false)
          .order('created_at', { ascending: false })
          .limit(30)

        if (sentNotifs) {
          const mapped = (sentNotifs as any[]).map((sn) => ({
            ...sn,
            recipient: Array.isArray(sn.recipient) ? sn.recipient[0] : sn.recipient,
          }))
          setSentNotifications(mapped as DirectNotification[])
        }

        // 3. Check User Credentials & Licences Expiry
        const { data: credentials } = await supabase
          .from('user_credentials')
          .select('id, document_name, document_number, category, expiry_date, user:users(full_name)')
          .not('expiry_date', 'is', null)

        if (credentials) {
          credentials.forEach((c: any) => {
            if (c.expiry_date) {
              const exp = new Date(c.expiry_date)
              if (exp < now) {
                const daysAgo = Math.ceil((now.getTime() - exp.getTime()) / 86400000)
                alerts.push({
                  id: `cred-exp-${c.id}`,
                  title: `Licence Expired: ${c.document_name}`,
                  message: `${c.user?.full_name || 'Technician'} licence (${c.document_number || 'No number'}) expired ${daysAgo} days ago!`,
                  category: 'credentials',
                  priority: 'urgent',
                  timestamp: c.expiry_date,
                  linkUrl: '/app/settings',
                  read: false,
                  actionLabel: 'Update Licence',
                })
              } else if (exp <= thirtyDaysAhead) {
                const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
                alerts.push({
                  id: `cred-due-${c.id}`,
                  title: `Licence Expiring (${daysLeft}d): ${c.document_name}`,
                  message: `${c.user?.full_name || 'Technician'} licence expires on ${exp.toLocaleDateString()}`,
                  category: 'credentials',
                  priority: 'warning',
                  timestamp: c.expiry_date,
                  linkUrl: '/app/settings',
                  read: false,
                  actionLabel: 'Renew Licence',
                })
              }
            }
          })
        }
      }

      // 4. QC Snags from Projects (Fix query to fetch all open/in_progress snags)
      const { data: snags } = await supabase
        .from('project_snags')
        .select(`
          id, project_id, title, priority, status, due_date, location,
          project:projects(id, name)
        `)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (snags && snags.length > 0) {
        snags.forEach((s: any) => {
          const isUrgent = s.priority === 'urgent'
          let isOverdue = false
          if (s.due_date) {
            isOverdue = new Date(s.due_date) < now
          }

          const projectName = s.project?.name || 'Project Site'
          const locationText = s.location ? ` (${s.location})` : ''

          alerts.push({
            id: `snag-${s.id}`,
            title: isOverdue ? `Overdue Snag: ${s.title}` : `QC Punch Item: ${s.title}`,
            message: `${projectName}${locationText} - Status: ${s.status.toUpperCase()} ${
              isOverdue ? '- Passed due date' : isUrgent ? '- High Priority' : ''
            }`,
            category: 'qc_snags',
            priority: isUrgent || isOverdue ? 'urgent' : 'warning',
            timestamp: s.due_date || now.toISOString(),
            linkUrl: `/app/projects/${s.project_id}`,
            read: false,
            actionLabel: 'View Snag',
          })
        })
      }

      // 5. Fleet Compliance (WOF & Rego)
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, registration_number, make_model, wof_expiry_date, rego_expiry_date, status')
        .eq('status', 'active')

      if (vehicles) {
        vehicles.forEach((v) => {
          if (v.wof_expiry_date) {
            const exp = new Date(v.wof_expiry_date)
            if (exp < now) {
              alerts.push({
                id: `wof-exp-${v.id}`,
                title: `WOF Expired: ${v.registration_number}`,
                message: `${v.make_model} Warrant of Fitness expired on ${exp.toLocaleDateString()}`,
                category: 'safety_fleet',
                priority: 'urgent',
                timestamp: v.wof_expiry_date,
                linkUrl: '/app/fleet',
                read: false,
                actionLabel: 'Inspect Fleet',
              })
            } else if (exp <= thirtyDaysAhead) {
              const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
              alerts.push({
                id: `wof-due-${v.id}`,
                title: `WOF Expiring Soon (${daysLeft}d): ${v.registration_number}`,
                message: `${v.make_model} WOF due in ${daysLeft} days on ${exp.toLocaleDateString()}`,
                category: 'safety_fleet',
                priority: 'warning',
                timestamp: v.wof_expiry_date,
                linkUrl: '/app/fleet',
                read: false,
                actionLabel: 'Inspect Fleet',
              })
            }
          }

          if (v.rego_expiry_date) {
            const exp = new Date(v.rego_expiry_date)
            if (exp < now) {
              alerts.push({
                id: `rego-exp-${v.id}`,
                title: `Rego Expired: ${v.registration_number}`,
                message: `${v.make_model} Registration expired on ${exp.toLocaleDateString()}`,
                category: 'safety_fleet',
                priority: 'urgent',
                timestamp: v.rego_expiry_date,
                linkUrl: '/app/fleet',
                read: false,
                actionLabel: 'Inspect Fleet',
              })
            } else if (exp <= thirtyDaysAhead) {
              const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
              alerts.push({
                id: `rego-due-${v.id}`,
                title: `Rego Due in ${daysLeft} Days: ${v.registration_number}`,
                message: `${v.make_model} Vehicle registration expires ${exp.toLocaleDateString()}`,
                category: 'safety_fleet',
                priority: 'warning',
                timestamp: v.rego_expiry_date,
                linkUrl: '/app/fleet',
                read: false,
                actionLabel: 'Inspect Fleet',
              })
            }
          }
        })
      }

      // 6. Pending Timesheets Needing Approval
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('id, user_id, entry_date, hours, status')
        .eq('status', 'submitted')
        .limit(10)

      if (timesheets && timesheets.length > 0) {
        alerts.push({
          id: 'timesheets-pending-batch',
          title: `${timesheets.length} Timesheets Pending Approval`,
          message: `Field technicians have submitted ${timesheets.length} timesheets awaiting manager sign-off.`,
          category: 'timesheets',
          priority: 'warning',
          timestamp: timesheets[0].entry_date || now.toISOString(),
          linkUrl: '/app/timesheets',
          read: false,
          actionLabel: 'Review Timesheets',
        })
      }

      // 7. Purchase Orders Awaiting Delivery
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, po_number, order_type, expected_delivery_date, vendor:clients(name)')
        .eq('status', 'ordered')
        .limit(8)

      if (pos && pos.length > 0) {
        alerts.push({
          id: 'pos-ordered-batch',
          title: `${pos.length} Purchase Orders Awaiting Delivery`,
          message: `Active supplier orders from ${pos.map((p: any) => p.vendor?.name || 'Suppliers').slice(0, 3).join(', ')} pending arrival.`,
          category: 'procurement_stock',
          priority: 'info',
          timestamp: pos[0].expected_delivery_date || now.toISOString(),
          linkUrl: '/app/purchase-orders',
          read: false,
          actionLabel: 'Track Orders',
        })
      }

      setNotifications(alerts)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLiveAlerts()

    if (!user?.id) return
    const channel = supabase
      .channel(`user-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_notifications' },
        () => {
          fetchLiveAlerts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLiveAlerts, user?.id])

  const acknowledgeNotification = useCallback(async (notifId: string) => {
    try {
      await supabase.rpc('update_notification_status', {
        p_notification_id: notifId,
        p_status: 'acknowledged',
      })
      await fetchLiveAlerts()
    } catch (err) {
      console.error('Failed to acknowledge notification:', err)
    }
  }, [fetchLiveAlerts])

  const declineNotification = useCallback(async (notifId: string, responseNote?: string) => {
    try {
      await supabase.rpc('update_notification_status', {
        p_notification_id: notifId,
        p_status: 'declined',
        p_response_note: responseNote || 'Declined by recipient',
      })
      await fetchLiveAlerts()
    } catch (err) {
      console.error('Failed to decline notification:', err)
    }
  }, [fetchLiveAlerts])

  const clearNotificationHistory = useCallback(async (notifId: string, asSender = false) => {
    try {
      await supabase.rpc('clear_notification_history', {
        p_notification_id: notifId,
        p_as_sender: asSender,
      })
      await fetchLiveAlerts()
    } catch (err) {
      console.error('Failed to clear notification history:', err)
    }
  }, [fetchLiveAlerts])

  const enrichedNotifications = useMemo(() => {
    return notifications.map((n) => ({
      ...n,
      read: n.directNotification?.status === 'pending' ? false : readIds.has(n.id),
    }))
  }, [notifications, readIds])

  const unreadCount = useMemo(() => {
    return enrichedNotifications.filter((n) => !n.read).length
  }, [enrichedNotifications])

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(allIds)))
    } catch {}
  }, [notifications])

  return {
    notifications: enrichedNotifications,
    sentNotifications,
    unreadCount,
    loading,
    refresh: fetchLiveAlerts,
    markAsRead,
    markAllAsRead,
    acknowledgeNotification,
    declineNotification,
    clearNotificationHistory,
  }
}
