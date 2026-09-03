import { useMemo } from 'react'
import type { JobSchedule, ScheduleStatus } from '@/types/schedule'

interface TechnicianUser {
  id: string
  full_name: string
  email: string
  role?: string
}

interface ScheduleResourceTimelineProps {
  date: string
  schedules: JobSchedule[]
  technicians: TechnicianUser[]
  onSelectSchedule: (schedule: JobSchedule) => void
  onAddScheduleSlot: (techId: string, startTime: string) => void
}

const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 20
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR
const TOTAL_MINUTES = TOTAL_HOURS * 60

const STATUS_CONFIG: Record<
  ScheduleStatus,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    icon: 'event',
  },
  dispatched: {
    label: 'Dispatched',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/40',
    text: 'text-indigo-400',
    icon: 'send',
  },
  en_route: {
    label: 'En Route',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: 'navigation',
  },
  on_site: {
    label: 'On Site',
    bg: 'bg-primary/20',
    border: 'border-primary/50',
    text: 'text-primary',
    icon: 'location_on',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    icon: 'check_circle',
  },
  rescheduled: {
    label: 'Rescheduled',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    icon: 'update',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-700',
    text: 'text-zinc-400',
    icon: 'cancel',
  },
}

export default function ScheduleResourceTimeline({
  date,
  schedules,
  technicians,
  onSelectSchedule,
  onAddScheduleSlot,
}: ScheduleResourceTimelineProps) {
  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = TIMELINE_START_HOUR; h < TIMELINE_END_HOUR; h++) {
      list.push(h)
    }
    return list
  }, [])

  // Calculate current time line position if viewing today
  const now = new Date()
  const isToday = now.toISOString().slice(0, 10) === date
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowMinutesFromStart = nowMinutes - TIMELINE_START_HOUR * 60
  const nowPercent = Math.max(0, Math.min(100, (nowMinutesFromStart / TOTAL_MINUTES) * 100))

  // Map schedules by technician
  const schedulesByTech = useMemo(() => {
    const map = new Map<string, JobSchedule[]>()
    // Initialize for every tech
    technicians.forEach((t) => map.set(t.id, []))
    // Special 'unassigned' bucket
    map.set('unassigned', [])

    schedules.forEach((s) => {
      const key = s.technician_id || 'unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })

    return map
  }, [schedules, technicians])

  const calculatePosition = (startIso: string, endIso: string) => {
    const start = new Date(startIso)
    const end = new Date(endIso)

    const startMin = start.getHours() * 60 + start.getMinutes()
    const endMin = end.getHours() * 60 + end.getMinutes()

    const fromStart = Math.max(0, startMin - TIMELINE_START_HOUR * 60)
    const durationMin = Math.max(30, endMin - startMin)

    const leftPercent = Math.max(0, Math.min(100, (fromStart / TOTAL_MINUTES) * 100))
    const widthPercent = Math.min(100 - leftPercent, (durationMin / TOTAL_MINUTES) * 100)

    return { left: `${leftPercent}%`, width: `${Math.max(4, widthPercent)}%` }
  }

  // Calculate total scheduled hours for tech
  const getTechTotalHours = (techSchedules: JobSchedule[]) => {
    let totalMinutes = 0
    techSchedules.forEach((s) => {
      if (s.status === 'cancelled') return
      const start = new Date(s.start_time).getTime()
      const end = new Date(s.end_time).getTime()
      totalMinutes += (end - start) / (1000 * 60)
    })
    return (totalMinutes / 60).toFixed(1)
  }

  const handleCellClick = (techId: string, hour: number) => {
    const timeStr = `${String(hour).padStart(2, '0')}:00`
    onAddScheduleSlot(techId === 'unassigned' ? '' : techId, timeStr)
  }

  return (
    <div className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl shadow-black/20 flex flex-col">
      {/* Scrollable Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* Timeline Header (Hours) */}
          <div className="flex border-b border-border-dark bg-surface-dark/80 sticky top-0 z-20">
            {/* Tech Name Column Header */}
            <div className="w-56 p-3 shrink-0 border-r border-border-dark text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
              <span>Technician & Crew</span>
              <span className="text-[10px] font-mono text-text-muted/70">Hours</span>
            </div>

            {/* Time Columns */}
            <div className="flex-1 grid grid-cols-14 relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="py-2.5 px-1 border-r border-border-dark/60 text-center text-[11px] font-mono text-text-muted font-medium"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Technician Rows */}
          <div className="divide-y divide-border-dark relative">
            {/* Current Time Red Vertical Line */}
            {isToday && nowPercent > 0 && nowPercent < 100 && (
              <div
                className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
                style={{ left: `calc(14rem + (100% - 14rem) * ${nowPercent / 100})` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                <div className="w-0.5 flex-1 bg-red-500/70"></div>
              </div>
            )}

            {/* Tech List */}
            {technicians.map((tech) => {
              const techSchedules = schedulesByTech.get(tech.id) || []
              const totalHours = getTechTotalHours(techSchedules)

              return (
                <div key={tech.id} className="flex hover:bg-white/[0.01] transition-colors group">
                  {/* Tech Profile Column */}
                  <div className="w-56 p-3 shrink-0 border-r border-border-dark flex items-center justify-between bg-card-dark/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-xs font-bold text-primary shrink-0 uppercase">
                        {tech.full_name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{tech.full_name}</p>
                        <p className="text-[10px] text-text-muted capitalize truncate">
                          {tech.role || 'Technician'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        Number(totalHours) > 8
                          ? 'bg-amber-500/20 text-amber-400'
                          : Number(totalHours) > 0
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {totalHours}h
                    </span>
                  </div>

                  {/* Timeline Track Grid */}
                  <div className="flex-1 grid grid-cols-14 relative h-16">
                    {/* Hour slots background (clickable to add schedule) */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        onClick={() => handleCellClick(tech.id, h)}
                        className="border-r border-border-dark/40 hover:bg-primary/[0.04] cursor-pointer transition-colors"
                        title={`Click to schedule for ${tech.full_name} at ${h}:00`}
                      />
                    ))}

                    {/* Schedule Event Blocks */}
                    {techSchedules.map((s) => {
                      const pos = calculatePosition(s.start_time, s.end_time)
                      const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.scheduled

                      return (
                        <div
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectSchedule(s)
                          }}
                          style={{ left: pos.left, width: pos.width }}
                          className={`
                            absolute top-2 bottom-2 rounded-xl border p-2
                            cursor-pointer transition-all duration-150 select-none shadow-md
                            hover:scale-[1.01] hover:shadow-lg hover:z-20
                            flex flex-col justify-between overflow-hidden
                            ${cfg.bg} ${cfg.border}
                          `}
                        >
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className={`text-xs font-bold truncate flex items-center gap-1 ${cfg.text}`}>
                              <span className="material-symbols-outlined text-[13px] shrink-0">
                                {cfg.icon}
                              </span>
                              {s.title}
                            </span>

                            {s.requires_safety_doc && (
                              <span
                                className={`material-symbols-outlined text-xs shrink-0 ${
                                  s.completed_safety_doc_id ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                                title={
                                  s.completed_safety_doc_id
                                    ? 'Safety Document Completed'
                                    : 'Safety Sign-Off Required'
                                }
                              >
                                {s.completed_safety_doc_id ? 'verified' : 'shield_with_heart'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-text-muted truncate gap-1 mt-0.5">
                            <span className="truncate">{s.project?.name || s.site_address || 'Site Job'}</span>
                            <span className="font-mono shrink-0">
                              {new Date(s.start_time).toTimeString().slice(0, 5)} -{' '}
                              {new Date(s.end_time).toTimeString().slice(0, 5)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Unassigned Dispatch Pool Row */}
            {schedulesByTech.get('unassigned')?.length ? (
              <div className="flex bg-surface-dark/30">
                <div className="w-56 p-3 shrink-0 border-r border-border-dark flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">pending_actions</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Unassigned Pool</p>
                      <p className="text-[10px] text-text-muted">Awaiting Tech Dispatch</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-14 relative h-16">
                  {hours.map((h) => (
                    <div
                      key={h}
                      onClick={() => handleCellClick('unassigned', h)}
                      className="border-r border-border-dark/40 hover:bg-white/[0.02] cursor-pointer"
                    />
                  ))}

                  {schedulesByTech.get('unassigned')!.map((s) => {
                    const pos = calculatePosition(s.start_time, s.end_time)
                    return (
                      <div
                        key={s.id}
                        onClick={() => onSelectSchedule(s)}
                        style={{ left: pos.left, width: pos.width }}
                        className="absolute top-2 bottom-2 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 p-2 cursor-pointer hover:bg-amber-500/20 transition-all flex flex-col justify-between overflow-hidden"
                      >
                        <span className="text-xs font-bold text-amber-400 truncate flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          {s.title}
                        </span>
                        <span className="text-[10px] text-text-muted truncate">
                          Click to assign technician
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
