import { useEffect } from 'react'

interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
  duration?: number
}

export default function Toast({
  type,
  message,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = {
    success: 'bg-green-900/20 border-green-500/30',
    error: 'bg-red-900/20 border-red-500/30',
    info: 'bg-primary/20 border-primary/30',
  }[type]

  const textColor = {
    success: 'text-green-200',
    error: 'text-red-200',
    info: 'text-primary',
  }[type]

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-primary',
  }[type]

  const iconNames = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`rounded-lg border p-4 ${bgColor} flex items-center gap-3 max-w-sm`}>
        <div className={`${iconColor} flex-shrink-0 flex items-center justify-center`}>
          <span className="material-symbols-outlined text-xl">
            {iconNames[type]}
          </span>
        </div>
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
        >
          <svg className={`h-5 w-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
