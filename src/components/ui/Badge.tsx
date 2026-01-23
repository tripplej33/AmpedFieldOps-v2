interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-600/30 text-gray-300 border-gray-500/30',
    success: 'bg-green-600/30 text-green-300 border-green-500/30',
    warning: 'bg-accent-amber/30 text-amber-300 border-accent-amber/30',
    danger: 'bg-red-600/30 text-red-300 border-red-500/30',
    info: 'bg-primary/30 text-blue-300 border-primary/30',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
