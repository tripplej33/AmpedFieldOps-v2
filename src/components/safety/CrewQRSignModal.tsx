import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { SafetyDocument } from '@/types/safety'

interface CrewQRSignModalProps {
  isOpen: boolean
  onClose: () => void
  document: SafetyDocument
}

export default function CrewQRSignModal({ isOpen, onClose, document }: CrewQRSignModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    if (isOpen && document) {
      // Build public crew sign-on URL
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://admin.ampedlogix.com'
      const signUrl = `${origin}/safety-sign/${document.id}`
      setQrUrl(signUrl)

      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          signUrl,
          {
            width: 240,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) console.error('[QRCode] Error rendering canvas:', err)
          }
        )
      }
    }
  }, [isOpen, document])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sign Safety Document: ${document.title}`,
          text: `Please review hazards and sign the safety document for ${document.project?.name || document.title}:`,
          url: qrUrl,
        })
      } catch {
        // User dismissed
      }
    } else {
      handleCopyLink()
    }
  }

  const signaturesCount = document.signatures?.length || 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Touchless Crew QR Sign-On" size="md">
      <div className="space-y-4 text-center">
        <div>
          <h3 className="text-sm font-bold text-white mb-0.5 truncate">{document.title}</h3>
          <p className="text-xs text-text-muted">
            {document.project?.name ? `Project: ${document.project.name}` : 'Field Safety Sign-Off'}
          </p>
        </div>

        {/* QR Code Canvas Card */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-border-dark/60 shadow-xl shadow-black/30 mx-auto max-w-[260px]">
          <canvas ref={canvasRef} className="rounded-lg" />
          <p className="text-[11px] font-bold text-gray-800 mt-2 text-center select-none">
            Scan with phone camera to sign
          </p>
        </div>

        {/* Live Signers Tally */}
        <div className="p-3 rounded-xl bg-background-dark/90 border border-border-dark flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="material-symbols-outlined text-primary text-base">how_to_reg</span>
            <span>Recorded Signatures:</span>
          </div>
          <span className="font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            {signaturesCount} {signaturesCount === 1 ? 'Worker' : 'Workers'} Signed
          </span>
        </div>

        {/* Direct Link & Share Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={qrUrl}
              className="flex-1 px-3 py-2 bg-background-dark border border-border-dark rounded-xl text-xs text-white/90 font-mono truncate focus:outline-none select-all"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyLink}
              className="shrink-0 text-xs py-2"
            >
              <span className="material-symbols-outlined text-sm mr-1">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border-dark">
            <Button
              type="button"
              variant="primary"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Send Link via WhatsApp / SMS / Email</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
