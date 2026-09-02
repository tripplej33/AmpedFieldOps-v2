import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'primary'
  icon?: string
  isPending?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  isPending: externalPending = false,
}: ConfirmDialogProps) {
  const [internalPending, setInternalPending] = useState(false)
  const isPending = externalPending || internalPending

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.classList.add('overflow-hidden')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen, onClose, isPending])

  if (!isOpen) return null

  const handleConfirm = async () => {
    try {
      setInternalPending(true)
      await onConfirm()
      onClose()
    } finally {
      setInternalPending(false)
    }
  }

  const defaultIcons = {
    danger: 'delete_forever',
    warning: 'warning',
    info: 'info',
    primary: 'check_circle',
  }

  const iconColors = {
    danger: 'bg-red-500/15 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    primary: 'bg-primary/15 text-primary border-primary/30',
  }

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary'

  const dialogContent = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal Dialog Box */}
      <div className="relative bg-card-dark rounded-2xl border border-border-dark shadow-2xl w-full max-w-md p-6 flex flex-col z-10 animate-scaleUp">
        <div className="flex items-start gap-4">
          {/* Leading Icon with Accent Background */}
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
              iconColors[variant]
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {icon || defaultIcons[variant]}
            </span>
          </div>

          {/* Text Content */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-white leading-tight">{title}</h3>
            <div id="confirm-dialog-desc" className="text-xs text-text-muted leading-relaxed">{message}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-border-dark/60 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="text-xs"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={confirmButtonVariant}
            onClick={handleConfirm}
            disabled={isPending}
            className="text-xs"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
