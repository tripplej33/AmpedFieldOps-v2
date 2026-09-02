import { Timesheet } from '@/types'

interface TimesheetMetricsProps {
  timesheets: Timesheet[]
  isManager?: boolean
}

export default function TimesheetMetrics({ timesheets }: TimesheetMetricsProps) {
  const totalHours = timesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)

  const draftItems = timesheets.filter((t) => t.status === 'draft')
  const draftHours = draftItems.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)

  const submittedItems = timesheets.filter((t) => t.status === 'submitted')
  const submittedHours = submittedItems.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)

  const approvedItems = timesheets.filter((t) => t.status === 'approved' || t.status === 'invoiced')
  const approvedHours = approvedItems.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Hours */}
      <div className="bg-card-dark/90 backdrop-blur-md rounded-xl border border-border-dark p-4 shadow-sm hover:border-border-dark/80 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Logged</span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">timer</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white font-mono">{totalHours.toFixed(1)}</span>
          <span className="text-xs text-text-muted">hrs</span>
        </div>
        <p className="text-[11px] text-text-muted/70 mt-1">Across {timesheets.length} entries</p>
      </div>

      {/* 2. Draft Hours */}
      <div className="bg-card-dark/90 backdrop-blur-md rounded-xl border border-border-dark p-4 shadow-sm hover:border-amber-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">Drafts</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">edit_note</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-400 font-mono">{draftHours.toFixed(1)}</span>
          <span className="text-xs text-text-muted">hrs</span>
        </div>
        <p className="text-[11px] text-text-muted/70 mt-1">{draftItems.length} draft {draftItems.length === 1 ? 'entry' : 'entries'}</p>
      </div>

      {/* 3. Awaiting Approval */}
      <div className="bg-card-dark/90 backdrop-blur-md rounded-xl border border-border-dark p-4 shadow-sm hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-400/90 uppercase tracking-wider">Awaiting Approval</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">pending_actions</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-blue-400 font-mono">{submittedHours.toFixed(1)}</span>
          <span className="text-xs text-text-muted">hrs</span>
        </div>
        <p className="text-[11px] text-text-muted/70 mt-1">{submittedItems.length} submitted for review</p>
      </div>

      {/* 4. Approved / Invoiced */}
      <div className="bg-card-dark/90 backdrop-blur-md rounded-xl border border-border-dark p-4 shadow-sm hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider">Approved & Invoiced</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">verified</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-400 font-mono">{approvedHours.toFixed(1)}</span>
          <span className="text-xs text-text-muted">hrs</span>
        </div>
        <p className="text-[11px] text-text-muted/70 mt-1">{approvedItems.length} approved entries</p>
      </div>
    </div>
  )
}
