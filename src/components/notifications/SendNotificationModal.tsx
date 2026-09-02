import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/ui/UserAvatar'
import type { User } from '@/types'

interface SendNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  initialRecipientId?: string
  initialCategory?: string
  initialTitle?: string
  initialMessage?: string
  initialLinkUrl?: string
  onSent?: () => void
}

const TEMPLATES = [
  {
    id: 'timesheet_reminder',
    label: 'Timesheet Reminder',
    category: 'timesheets',
    icon: 'schedule',
    defaultTitle: 'Timesheet Submission Required',
    defaultMessage: 'Please submit your timesheet hours and tasks for the current work period.',
    defaultLink: '/app/timesheets',
  },
  {
    id: 'po_review',
    label: 'Purchase Order Review',
    category: 'procurement_stock',
    icon: 'shopping_cart',
    defaultTitle: 'PO Approval Requested',
    defaultMessage: 'Please review and approve the draft purchase order for project materials.',
    defaultLink: '/app/purchase-orders',
  },
  {
    id: 'van_stock_count',
    label: 'Van Stock Audit Request',
    category: 'procurement_stock',
    icon: 'local_shipping',
    defaultTitle: 'Mobile Van Stock Count Required',
    defaultMessage: 'Please perform your monthly mobile van stock count and record material levels.',
    defaultLink: '/app/van-stock',
  },
  {
    id: 'snag_action',
    label: 'Snag Item Action',
    category: 'qc_snags',
    icon: 'verified_user',
    defaultTitle: 'Site Snag Item Assigned',
    defaultMessage: 'A site defect / snag item requires your inspection and rectification.',
    defaultLink: '/app/projects',
  },
  {
    id: 'custom_request',
    label: 'Custom Operational Request',
    category: 'direct_tasks',
    icon: 'mail',
    defaultTitle: '',
    defaultMessage: '',
    defaultLink: '',
  },
]

export default function SendNotificationModal({
  isOpen,
  onClose,
  initialRecipientId,
  initialCategory,
  initialTitle,
  initialMessage,
  initialLinkUrl,
  onSent,
}: SendNotificationModalProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(() => {
    return initialRecipientId ? new Set([initialRecipientId]) : new Set()
  })
  const [userSearch, setUserSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('timesheet_reminder')
  const [category, setCategory] = useState(initialCategory || 'timesheets')
  const [title, setTitle] = useState(initialTitle || 'Timesheet Submission Required')
  const [message, setMessage] = useState(
    initialMessage || 'Please submit your timesheet hours and tasks for the current work period.'
  )
  const [linkUrl, setLinkUrl] = useState(initialLinkUrl || '/app/timesheets')
  const [actionType, setActionType] = useState<'acknowledge_decline' | 'view_only'>('acknowledge_decline')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTeamUsers()
      if (initialRecipientId) {
        setSelectedRecipientIds(new Set([initialRecipientId]))
      }
      if (initialTitle) setTitle(initialTitle)
      if (initialMessage) setMessage(initialMessage)
      if (initialLinkUrl) setLinkUrl(initialLinkUrl)
      if (initialCategory) setCategory(initialCategory)
    }
  }, [isOpen, initialRecipientId, initialTitle, initialMessage, initialLinkUrl, initialCategory])

  const fetchTeamUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, role, avatar_url')
      .order('full_name', { ascending: true })

    if (data) {
      const filtered = (data as any[]).filter((u) => u.id !== currentUser?.id)
      setUsers(filtered)
      if (!initialRecipientId && selectedRecipientIds.size === 0 && filtered.length > 0) {
        setSelectedRecipientIds(new Set([filtered[0].id]))
      }
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const tpl = TEMPLATES.find((t) => t.id === templateId)
    if (tpl) {
      setCategory(tpl.category)
      setTitle(tpl.defaultTitle)
      setMessage(tpl.defaultMessage)
      setLinkUrl(tpl.defaultLink)
    }
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedRecipientIds(new Set(users.map((u) => u.id)))
  }

  const selectAllStaff = () => {
    setSelectedRecipientIds(
      new Set(users.filter((u) => u.role !== 'admin').map((u) => u.id))
    )
  }

  const clearSelection = () => {
    setSelectedRecipientIds(new Set())
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const recipientList = Array.from(selectedRecipientIds)
    if (recipientList.length === 0) {
      setError('Please select at least one recipient')
      return
    }
    if (!title.trim() || !message.trim()) {
      setError('Please enter a title and message')
      return
    }

    try {
      setSending(true)
      setError(null)

      const { data, error: rpcErr } = await supabase.rpc('send_bulk_direct_notifications', {
        p_recipient_ids: recipientList,
        p_category: category,
        p_title: title.trim(),
        p_message: message.trim(),
        p_link_url: linkUrl.trim() || null,
        p_action_type: actionType,
      })

      if (rpcErr) throw rpcErr
      if (data && !data.success) throw new Error(data.error)

      if (onSent) onSent()
      onClose()
    } catch (err) {
      console.error('Failed to dispatch notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dispatch Team Task or Notification">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        {/* Multi-Recipient Selection Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-text-muted font-medium">
              Recipients ({selectedRecipientIds.size} selected)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-text-muted/40">•</span>
              <button
                type="button"
                onClick={selectAllStaff}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Technicians Only
              </button>
              <span className="text-text-muted/40">•</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] text-text-muted hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          {/* User Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-muted text-sm">
              search
            </span>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter teammates by name or role..."
              className="w-full h-[32px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-white text-[11px] focus:outline-none focus:border-primary"
            />
          </div>

          {/* Multi-Select User Chips Grid */}
          <div className="max-h-[140px] overflow-y-auto p-2 bg-background-dark/80 border border-border-dark rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredUsers.map((u) => {
              const isSelected = selectedRecipientIds.has(u.id)
              return (
                <div
                  key={u.id}
                  onClick={() => toggleRecipient(u.id)}
                  className={`p-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                      : 'bg-card-dark border-border-dark text-text-muted hover:text-white hover:border-border-dark/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-primary focus:ring-primary bg-background-dark"
                  />
                  <UserAvatar user={u} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[11px] text-white truncate">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-[9px] text-text-muted capitalize truncate">{u.role || 'Staff'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Template Quick Switcher */}
        <div className="space-y-1.5">
          <label className="block text-text-muted font-medium">Request Template Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateChange(t.id)}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                  selectedTemplate === t.id
                    ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                    : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base text-primary">{t.icon}</span>
                <span className="text-[11px] font-semibold truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notification Title */}
        <div className="space-y-1">
          <label className="block text-text-muted font-medium">Request Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Please submit timesheet for Project X"
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
          />
        </div>

        {/* Notification Message */}
        <div className="space-y-1">
          <label className="block text-text-muted font-medium">Detailed Instructions / Notes</label>
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Specify what needs to be done, deadlines, or relevant details..."
            className="w-full p-2.5 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Link & Interaction Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Target Page Link</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="e.g. /app/projects or /app/timesheets"
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Interaction Mode</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="acknowledge_decline">Require Acknowledge / Decline</option>
              <option value="view_only">Informational Notice (Click to View)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark">
          <span className="text-[11px] text-text-muted font-semibold">
            Sending to {selectedRecipientIds.size} recipient{selectedRecipientIds.size === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={sending || selectedRecipientIds.size === 0} className="text-xs">
              <span className="material-symbols-outlined text-base">send</span>
              {sending ? 'Dispatching...' : 'Dispatch Request'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
