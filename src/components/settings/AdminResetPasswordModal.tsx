import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { User } from '@/types'

interface AdminResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  targetUser: User | null
}

export default function AdminResetPasswordModal({
  isOpen,
  onClose,
  targetUser,
}: AdminResetPasswordModalProps) {
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  // Direct temporary password state
  const [tempPassword, setTempPassword] = useState('')
  const [settingDirectPassword, setSettingDirectPassword] = useState(false)

  // Email dispatch state
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!targetUser) return null

  const handleGenerateLink = async () => {
    try {
      setGeneratingLink(true)
      setMessage(null)

      const { data, error } = await supabase.rpc('generate_password_reset_token', {
        target_user_id: targetUser.id,
      })

      if (error) throw error

      if (data?.token) {
        const link = `${window.location.origin}/reset-password?token=${data.token}`
        setResetLink(link)
        setMessage({ type: 'success', text: 'Secure reset link generated' })
      }
    } catch (err) {
      console.error('Failed to generate reset token:', err)
      setMessage({ type: 'error', text: 'Failed to generate reset link' })
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleCopy = () => {
    if (!resetLink) return
    navigator.clipboard.writeText(resetLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true)
      setMessage(null)

      const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setEmailSent(true)
      setMessage({ type: 'success', text: `Password recovery email dispatched to ${targetUser.email}` })
    } catch (err) {
      console.error('Failed to send reset email:', err)
      setMessage({ type: 'error', text: 'Failed to send recovery email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSetDirectPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempPassword || tempPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      setSettingDirectPassword(true)
      setMessage(null)

      const { data, error } = await supabase.rpc('admin_set_user_password', {
        target_user_id: targetUser.id,
        new_password: tempPassword,
      })

      if (error) throw error

      if (data?.success) {
        setMessage({ type: 'success', text: `Password updated immediately for ${targetUser.full_name || targetUser.email}` })
        setTempPassword('')
      }
    } catch (err) {
      console.error('Failed to set password:', err)
      setMessage({ type: 'error', text: 'Failed to update user password' })
    } finally {
      setSettingDirectPassword(false)
    }
  }

  const handleClose = () => {
    setResetLink(null)
    setTempPassword('')
    setEmailSent(false)
    setMessage(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Reset Password: ${targetUser.full_name || targetUser.email}`}
      size="md"
    >
      <div className="space-y-5 text-xs">
        {/* User Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background-dark border border-border-dark">
          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
            {(targetUser.full_name || targetUser.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{targetUser.full_name || 'Technician'}</p>
            <p className="text-text-muted font-mono text-[11px] truncate">{targetUser.email}</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl border text-xs ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Method 1: Generate & Copy 1-Click Link */}
        <div className="bg-background-dark/80 border border-border-dark rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Generate Direct Reset Link</h4>
              <p className="text-text-muted text-[11px]">
                Create a 48-hour secure link to copy and send via WhatsApp, SMS, or Slack.
              </p>
            </div>
            {!resetLink && (
              <Button
                onClick={handleGenerateLink}
                loading={generatingLink}
                className="h-[32px] text-xs shrink-0"
              >
                Generate Link
              </Button>
            )}
          </div>

          {resetLink && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetLink}
                  className="flex-1 h-[34px] px-2.5 bg-card-dark border border-primary/40 rounded-lg text-white font-mono text-[11px]"
                />
                <Button onClick={handleCopy} className="h-[34px] text-xs shrink-0">
                  <span className="material-symbols-outlined text-sm">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Method 2: Send Recovery Email */}
        <div className="bg-background-dark/80 border border-border-dark rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-white">Send Password Recovery Email</h4>
            <p className="text-text-muted text-[11px]">
              Dispatches an automated reset link directly to {targetUser.email}.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleSendEmail}
            loading={sendingEmail}
            disabled={emailSent}
            className="h-[32px] text-xs shrink-0"
          >
            <span className="material-symbols-outlined text-sm">mail</span>
            {emailSent ? 'Email Sent' : 'Send Email'}
          </Button>
        </div>

        {/* Method 3: Instant Admin Password Override */}
        <div className="bg-background-dark/80 border border-border-dark rounded-xl p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-white">Direct Password Override</h4>
            <p className="text-text-muted text-[11px]">
              Instantly set a new temporary password for this user.
            </p>
          </div>

          <form onSubmit={handleSetDirectPassword} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Welcome2026!"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="flex-1 h-[34px] px-3 bg-card-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
            <Button
              type="submit"
              variant="secondary"
              loading={settingDirectPassword}
              disabled={!tempPassword}
              className="h-[34px] text-xs shrink-0"
            >
              Set Password
            </Button>
          </form>
        </div>

        <div className="flex justify-end pt-2 border-t border-border-dark">
          <Button variant="secondary" onClick={handleClose} className="h-[34px] text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
