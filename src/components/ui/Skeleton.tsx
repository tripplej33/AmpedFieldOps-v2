interface SkeletonProps {
  className?: string
  count?: number
}

export function SkeletonLoader({ className = 'h-4 w-full', count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${className} bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded`}
        />
      ))}
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 pb-4 border-b border-border-dark">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="h-4 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border-dark bg-card-dark p-6 space-y-4">
      <div className="h-6 w-1/2 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
      <div className="h-4 w-full bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
      <div className="h-4 w-3/4 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
    </div>
  )
}

export function SkeletonKanban() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="space-y-3">
          {/* Column header */}
          <div className="h-6 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
          {/* Cards */}
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="h-24 bg-gradient-to-r from-border-dark via-card-dark to-border-dark animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}
