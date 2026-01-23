import Card from './Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  className?: string
}

export default function StatCard({ title, value, icon, trend, subtitle, className = '' }: StatCardProps) {
  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Background Icon */}
      <div className="absolute -right-4 -top-4 opacity-5">
        <span className="material-symbols-outlined text-[120px]">
          {icon}
        </span>
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                {icon}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-muted font-medium">{title}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-xs text-text-muted">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <span className="material-symbols-outlined text-sm">
                {trend.isPositive ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
