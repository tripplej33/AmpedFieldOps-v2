import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { SafetyDocument } from '@/types/safety'

interface EmailSafetyDocModalProps {
  isOpen: boolean
  onClose: () => void
  document: SafetyDocument
}

export default function EmailSafetyDocModal({
  isOpen,
  onClose,
  document,
}: EmailSafetyDocModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && document) {
      const projName = document.project?.name || 'Project Site'
      setSubject(`[Safety Compliance] ${document.title} - ${projName}`)
      setMessage(
        `Hi,\n\nPlease find attached the signed safety compliance document for ${projName}:\n\n` +
          `• Document: ${document.title}\n` +
          `• Category: ${document.category.toUpperCase()}\n` +
          `• Date: ${new Date(document.created_at).toLocaleDateString()}\n` +
          `• Signatures: ${document.signatures?.length || 0} crew members signed\n` +
          (document.pdf_url ? `• Document PDF Link: ${document.pdf_url}\n\n` : '\n') +
          `Kind regards,\nAmpedFieldOps Safety Management`
      )
    }
  }, [isOpen, document])

  const handleSendMail = () => {
    if (!recipientEmail.trim()) return

    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`

    window.open(mailtoUrl, '_blank')
    onClose()
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Safety Document" size="md">
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-white mb-0.5">{document.title}</h4>
          <p className="text-[11px] text-text-muted">
            Send completed safety compliance record and PDF link directly to stakeholders.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-white/90">
            Recipient Email Address <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="client@example.com, manager@ampedlogix.com"
            autoFocus
            className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-white/90">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none font-medium"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/90">Message Content</label>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <textarea
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none leading-relaxed font-mono text-[11px]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendMail}
            disabled={!recipientEmail.trim()}
            className="flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            <span>Open in Email App</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
