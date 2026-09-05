import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export interface DashboardWidgetConfig {
  id: string
  label: string
  description: string
  icon: string
  enabled: boolean
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'kpi_summary',
    label: 'KPI Summary Cards',
    description: 'Top stat cards for active projects, clients, pending timesheets, and field labor hours.',
    icon: 'monitoring',
    enabled: true,
  },
  {
    id: 'quick_actions',
    label: 'Quick Operations Action Bar',
    description: 'Fast-access launcher buttons to create jobs, record timesheets, and view client accounts.',
    icon: 'bolt',
    enabled: true,
  },
  {
    id: 'project_burn',
    label: 'Budget & Labor Burn Tracking',
    description: 'Visual progress bars comparing project contract budgets against accumulated technician labor costs.',
    icon: 'trending_up',
    enabled: true,
  },
  {
    id: 'activity_feed',
    label: 'Live Operations Activity Feed',
    description: 'Real-time timeline of field technician timesheets, Xero sync events, and uploaded documents.',
    icon: 'history',
    enabled: true,
  },
  {
    id: 'fleet_status',
    label: 'Fleet & Heavy Plant Snapshot',
    description: 'Quick status of vans, trucks, diggers, and machinery equipment with active service alerts.',
    icon: 'directions_car',
    enabled: true,
  },
  {
    id: 'low_stock',
    label: 'Low Stock & Restock Queue',
    description: 'Inventory items below minimum threshold and pending van restock purchase orders.',
    icon: 'inventory_2',
    enabled: true,
  },
  {
    id: 'operations_nav',
    label: 'Operations Center Shortcuts',
    description: 'Direct navigation panel to Kanban, timesheet approvals, and client 360° profiles.',
    icon: 'apps',
    enabled: true,
  },
  {
    id: 'session_profile',
    label: 'Current Session Profile',
    description: 'Active user authentication details, assigned RBAC role, and email status.',
    icon: 'account_circle',
    enabled: true,
  },
]

interface DashboardCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
  widgets: DashboardWidgetConfig[]
  onSave: (newWidgets: DashboardWidgetConfig[]) => void
}

export default function DashboardCustomizerModal({
  isOpen,
  onClose,
  widgets,
  onSave,
}: DashboardCustomizerModalProps) {
  const [currentWidgets, setCurrentWidgets] = useState<DashboardWidgetConfig[]>(widgets)

  const handleToggleWidget = (id: string) => {
    setCurrentWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setCurrentWidgets((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleMoveDown = (index: number) => {
    if (index === currentWidgets.length - 1) return
    setCurrentWidgets((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleResetToDefault = () => {
    setCurrentWidgets(DEFAULT_DASHBOARD_WIDGETS)
  }

  const handleSave = () => {
    onSave(currentWidgets)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Operations Dashboard" size="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border-dark">
          <div>
            <p className="text-xs text-text-muted">
              Select which modular widgets appear on your Operations Dashboard and arrange their display order.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Reset Default
          </button>
        </div>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {currentWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                widget.enabled
                  ? 'bg-card-dark border-border-dark'
                  : 'bg-background-dark/60 border-border-dark/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                    widget.enabled
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-surface-dark text-text-muted border-border-dark'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{widget.icon}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{widget.label}</h4>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                        widget.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {widget.enabled ? 'Enabled' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{widget.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Reorder Up/Down */}
                <div className="flex items-center gap-0.5 bg-background-dark p-0.5 rounded-lg border border-border-dark">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="p-1 rounded text-text-muted hover:text-white hover:bg-card-dark disabled:opacity-30 transition-colors"
                    title="Move Up"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === currentWidgets.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="p-1 rounded text-text-muted hover:text-white hover:bg-card-dark disabled:opacity-30 transition-colors"
                    title="Move Down"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                  </button>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleWidget(widget.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    widget.enabled
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                      : 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {widget.enabled ? 'visibility_off' : 'visibility'}
                  </span>
                  <span>{widget.enabled ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border-dark flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="text-xs">
            Save Dashboard Layout
          </Button>
        </div>
      </div>
    </Modal>
  )
}
