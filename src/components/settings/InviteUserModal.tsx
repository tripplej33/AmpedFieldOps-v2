import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Role, InviteUserFormData, UserInvitation } from '@/types'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
  onInvite: (data: InviteUserFormData) => Promise<UserInvitation>
  isPending?: boolean
}

export default function InviteUserModal({
  isOpen,
  onClose,
  roles,
  onInvite,
  isPending = false,
}: InviteUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id || 'technician')
  const [createdInvite, setCreatedInvite] = useState<UserInvitation | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !roleId) return

    const inv = await onInvite({
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      role_id: roleId,
    })

    setCreatedInvite(inv)
  }

  const inviteLink = createdInvite
    ? `${window.location.origin}/accept-invite?token=${createdInvite.token}`
    : ''

  const handleCopyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleReset = () => {
    setFullName('')
    setEmail('')
    setCreatedInvite(null)
    setCopied(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite New Team Member">
      {!createdInvite ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-text-muted">
            Send a secure registration invitation. The user will be invited to set up their password and access their designated operational permissions.
          </p>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Full Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cameron Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Email Address <span className="text-primary">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="cameron@ampedlogix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Designated System Role <span className="text-primary">*</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.permissions?.length || 0} permissions)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
            <button
              type="button"
              onClick={handleClose}
              className="h-[38px] px-4 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white font-medium"
            >
              Cancel
            </button>
            <Button type="submit" disabled={isPending || !email.trim() || !fullName.trim()}>
              {isPending ? 'Generating Invite...' : 'Generate Invite Link'}
            </Button>
          </div>
        </form>
      ) : (
        /* Invite Link Generated State */
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="material-symbols-outlined text-emerald-400">check_circle</span>
              Invitation Ready for {createdInvite.full_name}
            </div>
            <p className="text-xs text-emerald-200/90">
              An onboarding token has been generated. Share this link with {createdInvite.email} so they can activate their account.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-text-muted">Unique Activation Link (Valid 7 Days)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full h-[40px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-[11px] focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="h-[40px] px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {copied ? 'done' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-dark">
            <button
              type="button"
              onClick={handleReset}
              className="text-primary hover:underline text-xs font-semibold"
            >
              + Invite Another Member
            </button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
