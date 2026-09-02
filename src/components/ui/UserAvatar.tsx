import { useState } from 'react'

interface UserAvatarProps {
  user?: {
    full_name?: string | null
    email?: string | null
    avatar_url?: string | null
    role?: string | null
  } | null
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showRoleBadge?: boolean
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-3xl font-black',
}

export default function UserAvatar({
  user,
  src,
  name,
  size = 'md',
  className = '',
  showRoleBadge = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const resolvedSrc = src || user?.avatar_url
  const displayName = name || user?.full_name || user?.email || 'User'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {resolvedSrc && !imageError ? (
        <img
          src={resolvedSrc}
          alt={displayName}
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-xl object-cover border border-border-dark bg-card-dark shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-xl bg-primary/20 border border-primary/40 text-primary font-bold flex items-center justify-center shadow-inner select-none`}
        >
          {initial}
        </div>
      )}

      {showRoleBadge && user?.role && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card-dark ${
            user.role === 'admin'
              ? 'bg-amber-400'
              : user.role === 'manager'
              ? 'bg-primary'
              : 'bg-emerald-400'
          }`}
          title={`Role: ${user.role}`}
        />
      )}
    </div>
  )
}
