import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
  
  const variants = {
    primary: 'bg-primary hover:bg-[#0f6a8a] text-white shadow-sm hover:shadow-md',
    secondary: 'bg-card-dark hover:bg-nav-hover text-white border border-border-dark',
    ghost: 'bg-transparent hover:bg-nav-hover text-text-muted hover:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin text-lg">
          progress_activity
        </span>
      )}
      {children}
    </button>
  )
}
