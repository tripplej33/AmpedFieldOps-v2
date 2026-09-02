import { useState, useMemo } from 'react'
import type { Timesheet, Project } from '../types'

interface WeeklyTimesheetGridProps {
  timesheets: Timesheet[]
  projects: Project[]
  isLoading?: boolean
  onAddEntry?: (date: string, projectId?: string) => void
  onEditEntry?: (timesheet: Timesheet) => void
}

// Helpers for Week Calculations (Monday-Sunday)
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function WeeklyTimesheetGrid({
  timesheets,
  projects,
  isLoading,
  onAddEntry,
  onEditEntry,
}: WeeklyTimesheetGridProps) {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()))

  // 7 Days of Current Week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(currentMonday, i)
      return {
        date: d,
        dateKey: formatDateKey(d),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: formatDateKey(d) === formatDateKey(new Date()),
      }
    })
  }, [currentMonday])

  const weekEnd = useMemo(() => addDays(currentMonday, 6), [currentMonday])

  const handlePrevWeek = () => setCurrentMonday((prev) => addDays(prev, -7))
  const handleNextWeek = () => setCurrentMonday((prev) => addDays(prev, 7))
  const handleCurrentWeek = () => setCurrentMonday(getMonday(new Date()))

  // Group timesheets by Project + Activity for this week
  const gridRows = useMemo(() => {
    const activeDateKeys = new Set(weekDays.map((d) => d.dateKey))
    const weekTimesheets = timesheets.filter((t) => activeDateKeys.has(t.entry_date))

    const rowMap = new Map<
      string,
      {
        projectId: string
        projectName: string
        activityId?: string
        activityName: string
        costCenterName?: string
        entriesByDate: Record<string, Timesheet[]>
      }
    >()

    weekTimesheets.forEach((t) => {
      const pId = t.project_id || 'no_project'
      const aId = t.activity_type_id || 'no_activity'
      const key = `${pId}_${aId}`

      if (!rowMap.has(key)) {
        const proj = projects.find((p) => p.id === t.project_id)
        rowMap.set(key, {
          projectId: t.project_id,
          projectName: proj?.name || t.project?.name || 'General Operations',
          activityId: t.activity_type_id,
          activityName: t.activity_type?.name || 'Field Labor',
          costCenterName: t.cost_center?.name,
          entriesByDate: {},
        })
      }

      const row = rowMap.get(key)!
      if (!row.entriesByDate[t.entry_date]) {
        row.entriesByDate[t.entry_date] = []
      }
      row.entriesByDate[t.entry_date].push(t)
    })

    return Array.from(rowMap.values())
  }, [timesheets, projects, weekDays])

  // Calculate Column Daily Totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    weekDays.forEach((d) => {
      totals[d.dateKey] = timesheets
        .filter((t) => t.entry_date === d.dateKey)
        .reduce((sum, t) => sum + (Number(t.hours) || 0), 0)
    })
    return totals
  }, [timesheets, weekDays])

  const totalWeeklyHours = Object.values(dailyTotals).reduce((sum, h) => sum + h, 0)

  return (
    <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-sm">
      {/* Top Week Navigation Header */}
      <div className="p-4 border-b border-border-dark flex items-center justify-between flex-wrap gap-3 bg-background-dark/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-background-dark border border-border-dark rounded-lg p-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded text-text-muted hover:text-white hover:bg-card-dark transition-colors"
              title="Previous Week"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-white hover:bg-card-dark rounded transition-colors"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded text-text-muted hover:text-white hover:bg-card-dark transition-colors"
              title="Next Week"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          <span className="font-semibold text-white text-sm">
            {currentMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium text-primary">
            <span className="material-symbols-outlined text-sm">timelapse</span>
            <span>Week Total:</span>
            <span className="font-mono font-bold text-sm text-white">{totalWeeklyHours.toFixed(1)} hrs</span>
          </div>

          {onAddEntry && (
            <button
              type="button"
              onClick={() => onAddEntry(formatDateKey(new Date()))}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Log Hours
            </button>
          )}
        </div>
      </div>

      {/* Weekly Matrix Table */}
      <div className="overflow-x-auto touch-pan-x">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-background-dark/80 text-text-muted border-b border-border-dark font-semibold text-[11px]">
            <tr>
              <th className="px-4 py-3 min-w-[220px]">Project / Activity</th>
              {weekDays.map((day) => (
                <th
                  key={day.dateKey}
                  className={`px-3 py-3 text-center min-w-[95px] ${
                    day.isToday ? 'bg-primary/10 text-primary border-b-2 border-primary' : ''
                  }`}
                >
                  <div className="font-semibold uppercase tracking-wider">{day.dayName}</div>
                  <div className="text-white font-mono text-xs mt-0.5">
                    {day.monthName} {day.dayNum}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-bold text-white min-w-[100px]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-text-muted">
                  Loading weekly timesheets...
                </td>
              </tr>
            ) : gridRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-text-muted">
                  <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
                    calendar_view_week
                  </span>
                  <p className="text-white font-medium text-sm">No timesheet entries logged for this week</p>
                  <p className="text-xs text-text-muted mt-1">Click "Log Hours" or use the date columns to record work.</p>
                </td>
              </tr>
            ) : (
              gridRows.map((row, rIdx) => {
                let rowTotal = 0

                return (
                  <tr key={rIdx} className="hover:bg-background-dark/40 transition-colors">
                    {/* Project & Activity info */}
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-white truncate max-w-[220px]" title={row.projectName}>
                        {row.projectName}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{row.activityName}</span>
                        {row.costCenterName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-text-muted/40 inline-block shrink-0" />
                            <span className="text-text-muted/70">{row.costCenterName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 7 Days */}
                    {weekDays.map((day) => {
                      const dayEntries = row.entriesByDate[day.dateKey] || []
                      const daySum = dayEntries.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)
                      rowTotal += daySum

                      return (
                        <td
                          key={day.dateKey}
                          className={`px-3 py-3 text-center ${
                            day.isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          {daySum > 0 ? (
                            <button
                              type="button"
                              onClick={() => dayEntries[0] && onEditEntry?.(dayEntries[0])}
                              className="w-full p-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-primary text-white text-xs transition-colors shadow-sm group flex flex-col items-center gap-0.5"
                              title={`${daySum} hrs logged by ${dayEntries.map(e => e.user?.full_name || 'Staff').join(', ')} (${dayEntries[0]?.status})`}
                            >
                              <div className="flex items-center gap-1 font-mono font-bold">
                                <span className="group-hover:text-primary transition-colors">{daySum.toFixed(1)}</span>
                                {dayEntries.some((e) => e.status === 'approved') ? (
                                  <span className="material-symbols-outlined text-[12px] text-emerald-400" title="Approved (Hours locked)">
                                    lock
                                  </span>
                                ) : dayEntries.some((e) => e.status === 'submitted') ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Submitted for Approval" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="Draft" />
                                )}
                              </div>
                              {/* Technician Names / Chips */}
                              <span className="text-[9px] text-text-muted font-normal block truncate max-w-[85px] leading-tight">
                                {dayEntries.map((e) => e.user?.full_name?.split(' ')[0] || 'Staff').join(', ')}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddEntry?.(day.dateKey, row.projectId)}
                              className="w-full py-1.5 rounded-lg text-text-muted/30 hover:text-white hover:bg-background-dark hover:border hover:border-border-dark text-xs transition-colors"
                              title={`Log hours for ${row.projectName} on ${day.dayName}`}
                            >
                              +
                            </button>
                          )}
                        </td>
                      )
                    })}

                    {/* Row Total */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm text-primary">
                      {rowTotal.toFixed(1)} <span className="text-[11px] font-normal text-text-muted">hrs</span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {/* Daily Totals Footer */}
          {gridRows.length > 0 && (
            <tfoot className="bg-background-dark/90 border-t-2 border-border-dark font-semibold text-xs text-white">
              <tr>
                <td className="px-4 py-3 uppercase tracking-wider text-[11px] text-text-muted">Daily Totals</td>
                {weekDays.map((day) => (
                  <td key={day.dateKey} className="px-3 py-3 text-center font-mono font-bold">
                    {dailyTotals[day.dateKey] > 0 ? (
                      <span className="text-white">{dailyTotals[day.dateKey].toFixed(1)}</span>
                    ) : (
                      <span className="text-text-muted/40">—</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-mono font-bold text-base text-emerald-400">
                  {totalWeeklyHours.toFixed(1)} hrs
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
