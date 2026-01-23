 
import type { ActivityType } from '../types'

interface ActivityTypeSelectorProps {
  items: ActivityType[]
  selectedId?: string
  onSelect: (id: string) => void
}

export default function ActivityTypeSelector({ items, selectedId, onSelect }: ActivityTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((a) => {
        const isSelected = a.id === selectedId
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`p-3 rounded-lg border transition-colors text-left ${
              isSelected ? 'border-primary bg-primary/10 text-white' : 'border-border-dark bg-card-dark text-text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{a.name}</span>
              {a.default_rate != null && (
                <span className="text-xs text-text-muted">${a.default_rate?.toFixed(2)}</span>
              )}
            </div>
          </button>
        )
      })}
      {items.length === 0 && (
        <div className="col-span-full text-center text-text-muted text-sm">No activity types available</div>
      )}
    </div>
  )
}
