import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function Modal({ isOpen, onClose, children, title, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.classList.add('overflow-hidden')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative bg-card-dark rounded-2xl border border-border-dark shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col z-10 animate-scaleUp`}>
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-border-dark flex items-center justify-between shrink-0 bg-background-dark/50 rounded-t-2xl">
            <h2 id="modal-title" className="text-base font-bold text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-text-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-border-dark flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
