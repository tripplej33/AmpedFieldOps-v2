import { useState, useMemo, useRef } from 'react'
import type { Timesheet, Project } from '@/types'
import type { User } from '@/hooks/useUsers'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface DayTimesheetTimelineProps {
  date: string
  onDateChange: (newDate: string) => void
  timesheets: Timesheet[]
  projects: Project[]
  users: User[]
  isLoading?: boolean
  isAdmin?: boolean
  onAddEntry: (date: string, userId?: string, startTime?: string) => void
  onEditEntry: (timesheet: Timesheet) => void
  onUpdateTimesheet: (id: string, updates: { user_id?: string; start_time?: string; end_time?: string; hours?: number }) => Promise<void>
  onDuplicateTimesheet: (timesheetId: string, targetUserId: string, startTime?: string, endTime?: string) => Promise<void>
  onUnapproveTimesheet?: (id: string) => Promise<void>
  onDeleteTimesheet?: (id: string) => Promise<void>
}

// Timeline covers 06:00 to 20:00 (14 hours)
const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 20
const TOTAL_TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR
const TOTAL_TIMELINE_MINUTES = TOTAL_TIMELINE_HOURS * 60

// Format helpers
function timeStringToMinutes(timeStr?: string | null, fallbackHour = 8): number {
  if (!timeStr) return (fallbackHour - TIMELINE_START_HOUR) * 60
  const [h, m] = timeStr.split(':').map(Number)
  const totalMin = (h || 0) * 60 + (m || 0)
  return Math.max(0, Math.min(TOTAL_TIMELINE_MINUTES, totalMin - TIMELINE_START_HOUR * 60))
}

function minutesToTimeString(minutesFromStart: number): string {
  const totalMin = Math.max(0, TIMELINE_START_HOUR * 60 + Math.round(minutesFromStart))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function shiftTimeString(timeStr: string | null | undefined, offsetMinutes: number, fallbackHour = 8): string {
  const currentMin = timeStringToMinutes(timeStr, fallbackHour) + TIMELINE_START_HOUR * 60
  const newMin = Math.max(TIMELINE_START_HOUR * 60, Math.min(23 * 60 + 59, currentMin + offsetMinutes))
  const h = Math.floor(newMin / 60)
  const m = newMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function DayTimesheetTimeline({
  date,
  onDateChange,
  timesheets,
  projects: _projects,
  users,
  isLoading,
  isAdmin = false,
  onAddEntry,
  onEditEntry,
  onUpdateTimesheet,
  onDuplicateTimesheet,
  onUnapproveTimesheet,
  onDeleteTimesheet,
}: DayTimesheetTimelineProps) {
  const [draggedTimesheet, setDraggedTimesheet] = useState<Timesheet | null>(null)
  const [copyingTimesheetId, setCopyingTimesheetId] = useState<string | null>(null)
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<Timesheet | null>(null)
  const [entryToUnapprove, setEntryToUnapprove] = useState<Timesheet | null>(null)
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Current Date display objects
  const currentDateObj = useMemo(() => new Date(date + 'T00:00:00'), [date])
  const formattedDate = useMemo(() => {
    return currentDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [currentDateObj])

  const isToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return date === todayStr
  }, [date])

  // Hourly slots array: 06:00, 07:00, ..., 19:00 (14 slots)
  const hoursArray = useMemo(() => {
    return Array.from({ length: TOTAL_TIMELINE_HOURS }, (_, i) => TIMELINE_START_HOUR + i)
  }, [])

  // Filter timesheets for this specific day
  const dayTimesheets = useMemo(() => {
    return timesheets.filter((t) => t.entry_date === date)
  }, [timesheets, date])

  // Group timesheets by technician
  const timesheetsByUser = useMemo(() => {
    const map = new Map<string, Timesheet[]>()
    users.forEach((u) => map.set(u.id, []))
    dayTimesheets.forEach((t) => {
      const list = map.get(t.user_id) || []
      list.push(t)
      map.set(t.user_id, list)
    })
    return map
  }, [users, dayTimesheets])

  // Aggregate daily KPI
  const totalCrewHours = useMemo(() => {
    return dayTimesheets.reduce((acc, t) => acc + (Number(t.hours) || 0), 0)
  }, [dayTimesheets])

  const activeTechniciansCount = useMemo(() => {
    const active = new Set(dayTimesheets.map((t) => t.user_id))
    return active.size
  }, [dayTimesheets])

  // Date Navigation handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDateObj)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const next = new Date(currentDateObj)
    next.setDate(next.getDate() + 1)
    onDateChange(next.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    onDateChange(new Date().toISOString().slice(0, 10))
  }

  // Calculate live current time marker percentage
  const currentTimePercentage = useMemo(() => {
    if (!isToday) return null
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const timelineMinutes = nowMinutes - TIMELINE_START_HOUR * 60
    if (timelineMinutes < 0 || timelineMinutes > TOTAL_TIMELINE_MINUTES) return null
    return (timelineMinutes / TOTAL_TIMELINE_MINUTES) * 100
  }, [isToday])

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, t: Timesheet) => {
    if (t.status === 'approved' && !isAdmin) {
      e.preventDefault()
      return
    }
    setDraggedTimesheet(t)
    e.dataTransfer.setData('text/plain', t.id)
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const handleDragOver = (e: React.DragEvent, userId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'
    if (dragOverUserId !== userId) setDragOverUserId(userId)
  }

  // Calculate dropped start and stop times from mouse position on timeline track
  const calculateDroppedTimes = (e: React.DragEvent, userId: string, dragged: Timesheet) => {
    const trackEl = trackRefs.current.get(userId)
    if (!trackEl) {
      return { startTime: dragged.start_time || '08:00', endTime: dragged.end_time || '16:30' }
    }

    const rect = trackEl.getBoundingClientRect()
    const dropX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = dropX / rect.width
    const rawMinutesFromStart = ratio * TOTAL_TIMELINE_MINUTES
    // Snap to nearest 30 mins
    const snappedMinutesFromStart = Math.floor(rawMinutesFromStart / 30) * 30

    const startTotalMin = TIMELINE_START_HOUR * 60 + snappedMinutesFromStart
    const startHour = Math.floor(startTotalMin / 60)
    const startMin = startTotalMin % 60
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`

    // Compute duration preserving original logged hours
    const durationHours = Number(dragged.hours) || 8
    const breakMins = dragged.break_minutes || 0
    const durationTotalMinutes = Math.round(durationHours * 60 + breakMins)
    const endTotalMin = Math.min(23 * 60 + 59, startTotalMin + durationTotalMinutes)
    const endHour = Math.floor(endTotalMin / 60)
    const endMin = endTotalMin % 60
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

    return { startTime: startTimeStr, endTime: endTimeStr }
  }

  const handleDropOnTrack = async (e: React.DragEvent, targetUserId: string) => {
    e.preventDefault()
    setDragOverUserId(null)
    if (!draggedTimesheet) return

    const isCopy = e.altKey
    const { startTime, endTime } = calculateDroppedTimes(e, targetUserId, draggedTimesheet)

    if (isCopy) {
      await onDuplicateTimesheet(draggedTimesheet.id, targetUserId, startTime, endTime)
      showToast('Shift duplicated to technician!')
    } else {
      await onUpdateTimesheet(draggedTimesheet.id, {
        user_id: targetUserId,
        start_time: startTime,
        end_time: endTime,
      })
      showToast('Shift rescheduled successfully!')
    }
    setDraggedTimesheet(null)
  }

  // Quick Nudge Buttons: Shift +/- 1 Hour along timeline
  const handleNudgeTime = async (entry: Timesheet, offsetMinutes: number) => {
    if (entry.status === 'approved' && !isAdmin) return
    const newStart = shiftTimeString(entry.start_time, offsetMinutes, 8)
    const newEnd = shiftTimeString(entry.end_time, offsetMinutes, 16)
    await onUpdateTimesheet(entry.id, {
      start_time: newStart,
      end_time: newEnd,
    })
    showToast(`Shift adjusted to ${newStart} - ${newEnd}`)
  }

  const handleQuickCopyToCrew = async (timesheetId: string, targetUserId: string) => {
    await onDuplicateTimesheet(timesheetId, targetUserId)
    setCopyingTimesheetId(null)
    const targetUser = users.find((u) => u.id === targetUserId)
    showToast(`Copied to ${targetUser?.full_name || 'crew member'}!`)
  }

  const handleConfirmDelete = async () => {
    if (entryToDelete && onDeleteTimesheet) {
      await onDeleteTimesheet(entryToDelete.id)
      showToast('Timesheet deleted successfully')
      setEntryToDelete(null)
    }
  }

  const handleConfirmUnapprove = async () => {
    if (entryToUnapprove && onUnapproveTimesheet) {
      await onUnapproveTimesheet(entryToUnapprove.id)
      showToast('Timesheet unapproved and unlocked')
      setEntryToUnapprove(null)
    }
  }

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg)
    setTimeout(() => setActionSuccessMsg(null), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-card-dark border border-primary/40 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs text-white animate-scaleUp">
          <span className="material-symbols-outlined text-base text-primary">check_circle</span>
          <span className="font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. Day Navigation Bar & KPI summary */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 shadow-md">
        {/* Left: Date Switchers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-background-dark hover:bg-border-dark text-text-muted hover:text-white border border-border-dark transition-colors flex items-center justify-center"
            title="Previous Day"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>

          <div className="flex items-center gap-2 bg-background-dark px-3 py-1.5 rounded-xl border border-border-dark">
            <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            />
            <span className="text-xs font-bold text-white hidden sm:inline">
              ({formattedDate})
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-background-dark hover:bg-border-dark text-text-muted hover:text-white border border-border-dark transition-colors flex items-center justify-center"
            title="Next Day"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-bold transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Center: Daily Stats Pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-dark/80 border border-border-dark">
            <span className="material-symbols-outlined text-sm text-cyan-400">timer</span>
            <span className="text-text-muted">Total Hours:</span>
            <strong className="text-white">{totalCrewHours.toFixed(1)} hrs</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-dark/80 border border-border-dark">
            <span className="material-symbols-outlined text-sm text-emerald-400">group</span>
            <span className="text-text-muted">Crew On-Site:</span>
            <strong className="text-white">
              {activeTechniciansCount} / {users.length}
            </strong>
          </div>
        </div>

        {/* Right: Quick Instructions */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-text-muted font-mono">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Click slot to log • Drag along time to reschedule • Alt+Drag to clone</span>
        </div>
      </div>

      {/* 2. Interactive Schedule Timeline Grid */}
      <div className="bg-card-dark border border-border-dark rounded-2xl shadow-xl overflow-x-auto touch-pan-x">
        <div className="min-w-[1000px]">
          {/* Header Row: Timeline Hours (X-Axis) */}
          <div className="grid grid-cols-[220px_1fr] border-b border-border-dark bg-background-dark/95 sticky top-0 z-20">
            {/* Left Header Column */}
            <div className="p-3 border-r border-border-dark text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between shrink-0 w-[220px]">
              <span>Technician</span>
              <span className="text-[10px] text-text-muted font-normal">Daily Sum</span>
            </div>

            {/* X-Axis Horizontal Hours (14 Columns) */}
            <div
              className="grid relative divide-x divide-border-dark/40 text-center w-full"
              style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
            >
              {hoursArray.map((hour) => (
                <div key={hour} className="py-2.5 px-1 text-[11px] font-bold text-slate-300">
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Technicians Swimlanes */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-text-muted flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading daily technician timesheets...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">No technicians found</div>
          ) : (
            <div className="divide-y divide-border-dark/50 relative">
              {/* Current Time Marker Line */}
              {currentTimePercentage !== null && (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: `calc(220px + (100% - 220px) * ${currentTimePercentage / 100})` }}
                >
                  <div className="w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] relative">
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  </div>
                </div>
              )}

              {users.map((tech) => {
                const userEntries = timesheetsByUser.get(tech.id) || []
                const userTotalHours = userEntries.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)
                const isDragOver = dragOverUserId === tech.id

                return (
                  <div
                    key={tech.id}
                    className={`grid grid-cols-[220px_1fr] min-h-[76px] transition-colors relative ${
                      isDragOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'hover:bg-background-dark/30'
                    }`}
                  >
                    {/* Left: Technician Info (Y-Axis) */}
                    <div className="p-3 border-r border-border-dark flex items-center justify-between gap-2 bg-card-dark/60 shrink-0 w-[220px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {tech.full_name
                            ? tech.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : tech.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {tech.full_name || tech.email.split('@')[0]}
                          </p>
                          <p className="text-[10px] text-text-muted capitalize truncate">
                            {tech.role || 'Technician'}
                          </p>
                        </div>
                      </div>

                      {/* Total Daily Hours Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                          userTotalHours > 0
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-card-dark text-text-muted/60 border border-border-dark'
                        }`}
                      >
                        {userTotalHours.toFixed(1)}h
                      </span>
                    </div>

                    {/* Right: Horizontal Hourly Lane Track & Timeblocks */}
                    <div
                      ref={(el) => {
                        if (el) trackRefs.current.set(tech.id, el)
                        else trackRefs.current.delete(tech.id)
                      }}
                      onDragOver={(e) => handleDragOver(e, tech.id)}
                      onDrop={(e) => handleDropOnTrack(e, tech.id)}
                      className="relative h-full flex items-center w-full min-h-[76px]"
                    >
                      {/* Background Hourly Clickable Grid Slots (14 Columns) */}
                      <div
                        className="absolute inset-0 grid divide-x divide-border-dark/30 pointer-events-auto w-full h-full"
                        style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
                      >
                        {hoursArray.map((hour) => (
                          <div
                            key={hour}
                            onDragOver={(e) => handleDragOver(e, tech.id)}
                            onDrop={(e) => handleDropOnTrack(e, tech.id)}
                            onClick={() =>
                              onAddEntry(date, tech.id, `${String(hour).padStart(2, '0')}:00`)
                            }
                            className="h-full hover:bg-primary/5 transition-colors cursor-pointer group flex items-end justify-center pb-1"
                            title={`Click to log timesheet for ${tech.full_name} at ${String(hour).padStart(2, '0')}:00`}
                          >
                            <span className="material-symbols-outlined text-xs text-text-muted/0 group-hover:text-primary/60 transition-colors">
                              add
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Render Timesheet Blocks */}
                      {userEntries.map((entry) => {
                        // Calculate start minutes and duration
                        let startMin = timeStringToMinutes(entry.start_time, 8)
                        let endMin = entry.end_time
                          ? timeStringToMinutes(entry.end_time, 16)
                          : startMin + (Number(entry.hours) || 8) * 60

                        if (endMin <= startMin) endMin = startMin + 60

                        const leftPercent = Math.max(0, (startMin / TOTAL_TIMELINE_MINUTES) * 100)
                        const widthPercent = Math.min(
                          100 - leftPercent,
                          Math.max(6, ((endMin - startMin) / TOTAL_TIMELINE_MINUTES) * 100)
                        )

                        const isApproved = entry.status === 'approved'
                        const isSubmitted = entry.status === 'submitted'
                        const isCopyingThis = copyingTimesheetId === entry.id

                        const startTimeDisplay = entry.start_time || minutesToTimeString(startMin)
                        const endTimeDisplay = entry.end_time || minutesToTimeString(endMin)

                        return (
                          <div
                            key={entry.id}
                            draggable={!isApproved || isAdmin}
                            onDragStart={(e) => handleDragStart(e, entry)}
                            className={`absolute top-2 bottom-2 rounded-xl p-2.5 shadow-lg border flex items-center justify-between gap-2 z-10 transition-all cursor-grab active:cursor-grabbing group ${
                              isApproved
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : isSubmitted
                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                : 'bg-primary/25 border-primary/50 text-white hover:border-primary'
                            }`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              minWidth: '170px',
                            }}
                          >
                            {/* Timeblock Details */}
                            <div className="min-w-0 flex-1 space-y-0.5 select-none">
                              <div className="flex items-center gap-1.5">
                                {isApproved && (
                                  <span className="material-symbols-outlined text-[12px] text-emerald-400" title="Locked Approved">
                                    lock
                                  </span>
                                )}
                                <p className="text-xs font-bold truncate text-white leading-none">
                                  {entry.project?.name || 'General Operations'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-text-muted truncate">
                                <span>{entry.activity_type?.name || 'Field Labor'}</span>
                                <span>•</span>
                                <span className="font-mono text-cyan-300 font-semibold">
                                  {startTimeDisplay} - {endTimeDisplay}
                                </span>
                              </div>
                            </div>

                            {/* Badge & Quick Action Toolbar */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="px-1.5 py-0.5 rounded bg-background-dark/80 text-[10px] font-bold font-mono text-white border border-border-dark/60">
                                {Number(entry.hours).toFixed(1)}h
                              </span>

                              {/* Action Buttons on Hover */}
                              <div className="hidden group-hover:flex items-center gap-0.5 bg-background-dark/95 p-0.5 rounded-lg border border-border-dark shadow-md">
                                {/* Nudge Earlier 1 Hour */}
                                {(!isApproved || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleNudgeTime(entry, -60)
                                    }}
                                    className="p-1 text-text-muted hover:text-amber-400 rounded transition-colors"
                                    title="Move 1 hour earlier"
                                  >
                                    <span className="material-symbols-outlined text-xs">arrow_back</span>
                                  </button>
                                )}

                                {/* Nudge Later 1 Hour */}
                                {(!isApproved || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleNudgeTime(entry, 60)
                                    }}
                                    className="p-1 text-text-muted hover:text-amber-400 rounded transition-colors"
                                    title="Move 1 hour later"
                                  >
                                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                  </button>
                                )}

                                {/* Copy Shift to Another Crew Member */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCopyingTimesheetId(isCopyingThis ? null : entry.id)
                                  }}
                                  className="p-1 text-text-muted hover:text-cyan-400 rounded transition-colors"
                                  title="Copy shift to another technician"
                                >
                                  <span className="material-symbols-outlined text-xs">content_copy</span>
                                </button>

                                {/* Edit Timesheet */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditEntry(entry)
                                  }}
                                  className="p-1 text-text-muted hover:text-white rounded transition-colors"
                                  title="Edit timesheet details"
                                >
                                  <span className="material-symbols-outlined text-xs">edit</span>
                                </button>

                                {/* Unapprove (Admin Only) */}
                                {isApproved && isAdmin && onUnapproveTimesheet && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEntryToUnapprove(entry)
                                    }}
                                    className="p-1 text-text-muted hover:text-amber-400 rounded transition-colors"
                                    title="Unapprove & unlock timesheet"
                                  >
                                    <span className="material-symbols-outlined text-xs">lock_open</span>
                                  </button>
                                )}

                                {/* Delete Draft or Admin Delete */}
                                {(!isApproved || isAdmin) && onDeleteTimesheet && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEntryToDelete(entry)
                                    }}
                                    className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
                                    title="Delete timesheet entry"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Copy Popover Menu */}
                            {isCopyingThis && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-56 bg-card-dark border border-border-dark rounded-xl shadow-2xl z-30 p-2 space-y-1 animate-scaleUp"
                              >
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 py-1 border-b border-border-dark flex items-center justify-between">
                                  <span>Copy to Technician</span>
                                  <button
                                    type="button"
                                    onClick={() => setCopyingTimesheetId(null)}
                                    className="text-text-muted hover:text-white"
                                  >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-border-dark/30">
                                  {users
                                    .filter((u) => u.id !== entry.user_id)
                                    .map((u) => (
                                      <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => handleQuickCopyToCrew(entry.id, u.id)}
                                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-primary/20 text-xs text-text-muted hover:text-white flex items-center gap-2 transition-colors group/item"
                                      >
                                        <span className="material-symbols-outlined text-xs text-primary group-hover/item:scale-110 transition-transform">
                                          person_add
                                        </span>
                                        <div className="min-w-0">
                                          <p className="font-semibold text-white truncate">
                                            {u.full_name || u.email}
                                          </p>
                                          <p className="text-[10px] text-text-muted capitalize">
                                            {u.role || 'Technician'}
                                          </p>
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Native Confirm Dialog: Delete */}
      <ConfirmDialog
        isOpen={Boolean(entryToDelete)}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Timesheet Entry?"
        message={
          entryToDelete ? (
            <p>
              Are you sure you want to permanently delete this timesheet for{' '}
              <strong className="text-white">
                {entryToDelete.user?.full_name || entryToDelete.user?.email || 'Technician'}
              </strong>{' '}
              ({Number(entryToDelete.hours).toFixed(1)} hrs on {entryToDelete.entry_date})?
            </p>
          ) : (
            ''
          )
        }
        confirmText="Delete Entry"
        variant="danger"
        icon="delete"
      />

      {/* Native Confirm Dialog: Unapprove */}
      <ConfirmDialog
        isOpen={Boolean(entryToUnapprove)}
        onClose={() => setEntryToUnapprove(null)}
        onConfirm={handleConfirmUnapprove}
        title="Unapprove Timesheet Entry?"
        message={
          entryToUnapprove ? (
            <p>
              This will revert the timesheet status from <strong className="text-emerald-400">Approved</strong> to <strong className="text-blue-400">Submitted</strong> so hours, activities, or notes can be corrected.
            </p>
          ) : (
            ''
          )
        }
        confirmText="Unapprove & Unlock"
        variant="warning"
        icon="lock_open"
      />
    </div>
  )
}
