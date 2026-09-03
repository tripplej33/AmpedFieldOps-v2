import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatLocalTime } from '@/lib/dateUtils'
import type { JobSchedule, ScheduleStatus } from '@/types/schedule'

interface TechnicianDailyAgendaProps {
  date: string
  schedules: JobSchedule[]
  currentUserId?: string
  onStatusUpdate: (scheduleId: string, status: ScheduleStatus) => Promise<void>
  onOpenSafetyDoc: (schedule: JobSchedule) => void
  onSelectSchedule: (schedule: JobSchedule) => void
}

const STATUS_BADGE: Record<ScheduleStatus, { label: string; bg: string; text: string; icon: string }> = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: 'event' },
  dispatched: { label: 'Dispatched', bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', icon: 'send' },
  en_route: { label: 'En Route', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: 'navigation' },
  on_site: { label: 'On Site', bg: 'bg-primary/20 border-primary/40', text: 'text-primary', icon: 'location_on' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: 'check_circle' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', icon: 'update' },
  cancelled: { label: 'Cancelled', bg: 'bg-zinc-800 border-zinc-700', text: 'text-zinc-400', icon: 'cancel' },
}

export default function TechnicianDailyAgenda({
  schedules,
  onStatusUpdate,
  onOpenSafetyDoc,
  onSelectSchedule,
}: TechnicianDailyAgendaProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [safetyGateSchedule, setSafetyGateSchedule] = useState<JobSchedule | null>(null)

  const handleStatusTransition = async (schedule: JobSchedule, targetStatus: ScheduleStatus) => {
    // Safety Gate Check when arriving on site
    if (targetStatus === 'on_site' && schedule.requires_safety_doc && !schedule.completed_safety_doc_id) {
      setSafetyGateSchedule(schedule)
      return
    }

    try {
      setUpdatingId(schedule.id)
      await onStatusUpdate(schedule.id, targetStatus)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleOpenMaps = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    window.open(url, '_blank')
  }

  const completedCount = schedules.filter((s) => s.status === 'completed').length

  if (schedules.length === 0) {
    return (
      <div className="bg-card-dark border border-border-dark rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center mx-auto text-primary">
          <span className="material-symbols-outlined text-3xl">event_available</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No Jobs Scheduled for Today</h3>
          <p className="text-xs text-text-muted mt-1">
            You currently have no site dispatches assigned for this date. Check the timeline view or reach out to dispatch.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progress Summary Card */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
            Today's Dispatch Schedule
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {schedules.length} assigned {schedules.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            {completedCount} / {schedules.length} Completed
          </span>
        </div>
      </div>

      {/* Chronological List of Job Cards */}
      <div className="space-y-3">
        {schedules.map((schedule, idx) => {
          const cfg = STATUS_BADGE[schedule.status] || STATUS_BADGE.scheduled
          const startTimeStr = formatLocalTime(schedule.start_time)
          const endTimeStr = formatLocalTime(schedule.end_time)

          return (
            <div
              key={schedule.id}
              className={`
                bg-card-dark border rounded-2xl p-5 space-y-4 shadow-md transition-all
                ${schedule.status === 'on_site' ? 'border-primary/60 shadow-primary/5 ring-1 ring-primary/30' : 'border-border-dark'}
              `}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-white/90 bg-surface-dark px-2 py-0.5 rounded border border-border-dark">
                      #{idx + 1} • {startTimeStr} - {endTimeStr}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                      <span className="material-symbols-outlined text-xs">{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </div>

                  <h4
                    onClick={() => onSelectSchedule(schedule)}
                    className="text-sm sm:text-base font-bold text-white hover:text-primary transition-colors cursor-pointer truncate"
                  >
                    {schedule.title}
                  </h4>

                  {schedule.project && (
                    <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-xs text-primary">work</span>
                      {schedule.project.name}
                      {schedule.cost_center?.name && (
                        <span className="text-[11px] font-mono text-text-muted/80">
                          • {schedule.cost_center.name}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Safety Status Pill */}
                {schedule.requires_safety_doc && (
                  <button
                    onClick={() => onOpenSafetyDoc(schedule)}
                    className={`
                      shrink-0 text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-colors font-medium
                      ${
                        schedule.completed_safety_doc_id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {schedule.completed_safety_doc_id ? 'verified_user' : 'shield_with_heart'}
                    </span>
                    {schedule.completed_safety_doc_id ? 'Safety Signed' : 'Safety Required'}
                  </button>
                )}
              </div>

              {/* Site Address & Directions Button */}
              {schedule.site_address && (
                <div className="p-3 bg-background-dark/80 rounded-xl border border-border-dark flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-text-muted text-base shrink-0">pin_drop</span>
                    <span className="text-xs text-text-muted truncate">{schedule.site_address}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenMaps(schedule.site_address!)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-surface-dark hover:bg-primary/20 text-text-muted hover:text-primary rounded-lg border border-border-dark text-xs transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined text-sm">navigation</span>
                    Directions
                  </button>
                </div>
              )}

              {/* Notes / Scope */}
              {schedule.notes && (
                <div className="p-3 bg-surface-dark/40 rounded-xl border border-border-dark/60 text-xs text-text-muted">
                  <span className="font-semibold text-white/90 block mb-0.5">Instructions:</span>
                  {schedule.notes}
                </div>
              )}

              {/* Status Stepper Actions */}
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-border-dark/60">
                <div className="text-[11px] text-text-muted font-mono">
                  {schedule.actual_start_time && (
                    <span>On Site: {formatLocalTime(schedule.actual_start_time)}</span>
                  )}
                  {schedule.actual_end_time && (
                    <span> • Done: {formatLocalTime(schedule.actual_end_time)}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {schedule.status === 'scheduled' || schedule.status === 'dispatched' ? (
                    <Button
                      onClick={() => handleStatusTransition(schedule, 'en_route')}
                      disabled={updatingId === schedule.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">directions_car</span>
                      Start Travel (En Route)
                    </Button>
                  ) : schedule.status === 'en_route' ? (
                    <Button
                      onClick={() => handleStatusTransition(schedule, 'on_site')}
                      disabled={updatingId === schedule.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary hover:bg-primary-hover text-black font-bold"
                    >
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      Arrive On Site
                    </Button>
                  ) : schedule.status === 'on_site' ? (
                    <Button
                      variant="primary"
                      onClick={() => handleStatusTransition(schedule, 'completed')}
                      disabled={updatingId === schedule.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Complete Work
                    </Button>
                  ) : schedule.status === 'completed' ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Work Completed
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Safety Gate Warning Modal */}
      {safetyGateSchedule && (
        <Modal
          isOpen={Boolean(safetyGateSchedule)}
          onClose={() => setSafetyGateSchedule(null)}
          title="Safety Compliance Gate"
          size="md"
        >
          <div className="space-y-4 text-xs text-center py-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">shield_with_heart</span>
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Safety Sign-Off Required</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Company policy and standard compliance regulations require a completed Job Safety Analysis (JSA) or Take 5 before commencing work at this site.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background-dark border border-border-dark text-left space-y-1">
              <p className="text-white font-semibold">{safetyGateSchedule.title}</p>
              <p className="text-text-muted text-[11px]">{safetyGateSchedule.site_address || 'Project Site'}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  // Bypass with warning
                  const s = safetyGateSchedule
                  setSafetyGateSchedule(null)
                  setUpdatingId(s.id)
                  await onStatusUpdate(s.id, 'on_site')
                  setUpdatingId(null)
                }}
              >
                Proceed Without JSA
              </Button>

              <Button
                onClick={() => {
                  const s = safetyGateSchedule
                  setSafetyGateSchedule(null)
                  onOpenSafetyDoc(s)
                }}
                className="bg-primary hover:bg-primary-hover text-black font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">draw</span>
                Open Safety Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
