import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import ActivityFeed from '@/components/ActivityFeed'
import { useAuth } from '@/contexts/AuthContext'
import { useTerminology } from '@/hooks/useTerminology'
import { supabase } from '@/lib/supabase'
import { ActivityFeedItem } from '@/mocks/dashboardData'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalClients: number
  pendingTimesheets: number
  approvedTimesheets: number
  totalLaborHours: number
}

interface ProjectBurnSummary {
  id: string
  name: string
  clientName: string
  status: string
  budget: number
  loggedHours: number
  estimatedLaborCost: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTerminology()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalClients: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    totalLaborHours: 0,
  })
  const [projectBurnList, setProjectBurnList] = useState<ProjectBurnSummary[]>([])
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRealtimeActive, setIsRealtimeActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)

      // Fetch in parallel: Projects, Clients, Timesheets, Users, and Files
      const [
        { data: projectsData, error: projErr },
        { data: clientsData, error: clientErr },
        { data: timesheetsData, error: tsErr },
        { data: usersData },
        { data: filesData },
        { data: syncLogs },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, budget, end_date, created_at, client:clients(id, name, contact_name)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('clients').select('id, name, status, contact_type').limit(100),
        supabase
          .from('timesheets')
          .select(
            'id, user_id, project_id, cost_center_id, entry_date, hours, status, notes, created_at, project:projects(id, name), cost_center:cost_centers(id, name, customer_po_number)'
          )
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('users').select('id, full_name, email, role'),
        supabase.from('project_files').select('id, project_id, name, created_at').order('created_at', { ascending: false }).limit(10),
        supabase
          .from('xero_sync_log')
          .select('id, sync_type, status, error_message, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (projErr) throw projErr
      if (clientErr) throw clientErr
      if (tsErr) throw tsErr

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))

      // Calculate Stats
      const totalProjects = projectsData?.length || 0
      const activeProjects = (projectsData || []).filter((p) => p.status === 'Active').length
      const totalClients = clientsData?.length || 0
      const pendingTimesheets = (timesheetsData || []).filter(
        (t) => t.status === 'submitted' || t.status === 'draft'
      ).length
      const approvedTimesheets = (timesheetsData || []).filter(
        (t) => t.status === 'approved' || t.status === 'invoiced'
      ).length
      const totalLaborHours = (timesheetsData || []).reduce(
        (sum, t) => sum + (Number(t.hours) || 0),
        0
      )

      setStats({
        totalProjects,
        activeProjects,
        totalClients,
        pendingTimesheets,
        approvedTimesheets,
        totalLaborHours,
      })

      // Aggregate project burn calculations
      const burnList: ProjectBurnSummary[] = (projectsData || []).slice(0, 5).map((p: any) => {
        const clientName = p.client?.name || p.client?.contact_name || 'General Client'

        const projectTs = (timesheetsData || []).filter((t) => t.project_id === p.id)
        const loggedHours = projectTs.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)
        // TODO: Pull DEFAULT_LABOR_RATE_PER_HOUR from activity_types.default_rate or company settings
        const DEFAULT_LABOR_RATE_PER_HOUR = 85
        const estimatedLaborCost = loggedHours * DEFAULT_LABOR_RATE_PER_HOUR

        return {
          id: p.id,
          name: p.name,
          clientName,
          status: p.status,
          budget: Number(p.budget) || 0,
          loggedHours,
          estimatedLaborCost,
        }
      })
      setProjectBurnList(burnList)

      // Construct live activity items from real entities
      const combinedActivities: ActivityFeedItem[] = []

      // 1. Add recent timesheets with actual technician names
      ;(timesheetsData || []).slice(0, 10).forEach((t: any) => {
        const tech = userMap.get(t.user_id)
        const techName = tech?.full_name || tech?.email || 'Technician'
        const projName = t.project?.name || 'Project'
        const ccName = t.cost_center?.name

        combinedActivities.push({
          id: `ts-${t.id}`,
          userId: t.user_id || 'tech',
          userName: techName,
          action: t.status === 'approved' ? 'timesheet_approved' : 'timesheet_submitted',
          resourceType: 'timesheet',
          resourceId: t.id,
          resourceName: `${projName}${ccName ? ` • ${ccName}` : ''} (${Number(t.hours).toFixed(1)} hrs)`,
          details: { hours: t.hours, status: t.status, notes: t.notes },
          createdAt: t.created_at || new Date().toISOString(),
        })
      })

      // 2. Add recent projects
      ;(projectsData || []).slice(0, 6).forEach((p: any) => {
        combinedActivities.push({
          id: `proj-${p.id}`,
          userId: 'system',
          userName: 'Project Dispatch',
          action: 'job_created',
          resourceType: 'project',
          resourceId: p.id,
          resourceName: `Project: ${p.name}`,
          details: { status: p.status, budget: p.budget },
          createdAt: p.created_at || new Date().toISOString(),
        })
      })

      // 3. Add recent files
      ;(filesData || []).slice(0, 6).forEach((f: any) => {
        if (f.name === '.keep') return
        combinedActivities.push({
          id: `file-${f.id}`,
          userId: 'files',
          userName: 'Document Vault',
          action: 'project_updated',
          resourceType: 'project',
          resourceId: f.project_id,
          resourceName: `Uploaded Document: ${f.name}`,
          details: {},
          createdAt: f.created_at || new Date().toISOString(),
        })
      })

      // 4. Add sync logs
      ;(syncLogs || []).forEach((log: any) => {
        combinedActivities.push({
          id: `sync-${log.id}`,
          userId: 'xero',
          userName: 'Xero Accounting',
          action: 'project_updated',
          resourceType: 'project',
          resourceId: log.id,
          resourceName: `${log.entity_type || 'Xero'} sync status: ${log.status}`,
          details: { error: log.error_message },
          createdAt: log.created_at,
        })
      })

      combinedActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setActivities(combinedActivities.slice(0, 15))
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()

    // Realtime channel for live dashboard synchronization
    const channel = supabase
      .channel('dashboard-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timesheets' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_files' }, () => {
        fetchDashboardData()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDashboardData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-display">Operations Dashboard</h1>
          <p className="text-text-muted text-xs">Loading live operations data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-dark rounded-xl border border-border-dark h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1.5 flex items-center gap-3 font-display">
            <span className="material-symbols-outlined text-4xl text-primary">dashboard</span>
            Operations Dashboard
          </h1>
          <p className="text-text-muted text-xs">
            Live overview of field technician logs, active jobs, client accounts, and Xero sync status
          </p>
          {error && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              {error}
            </p>
          )}
        </div>

        {/* Live Realtime Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card-dark border border-border-dark text-xs shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-text-muted font-medium text-[11px]">
            {isRealtimeActive ? 'Live Realtime Connected' : 'Syncing Data...'}
          </span>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Active ${t('projects', 'Projects')}`}
          value={`${stats.activeProjects} / ${stats.totalProjects}`}
          icon="work"
          trend={{ value: stats.activeProjects, isPositive: true }}
          subtitle="In progress & scheduled"
        />
        <StatCard
          title={`Total ${t('clients', 'Clients')}`}
          value={stats.totalClients.toString()}
          icon="group"
          trend={{ value: stats.totalClients, isPositive: true }}
          subtitle="Customer & site accounts"
        />
        <StatCard
          title={`Pending ${t('timesheets', 'Timesheets')}`}
          value={stats.pendingTimesheets.toString()}
          icon="schedule"
          trend={{ value: stats.pendingTimesheets, isPositive: stats.pendingTimesheets === 0 }}
          subtitle="Awaiting review & approval"
        />
        <StatCard
          title="Logged Labor Hours"
          value={`${stats.totalLaborHours.toFixed(1)} hrs`}
          icon="timer"
          trend={{ value: stats.totalLaborHours, isPositive: true }}
          subtitle="Total recorded field hours"
        />
      </div>

      {/* Quick Action Bar */}
      <div className="flex items-center gap-3 flex-wrap bg-card-dark border border-border-dark/80 p-3 rounded-xl">
        <button
          onClick={() => navigate('/app/projects')}
          className="h-[38px] flex items-center gap-2 px-3.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Manage {t('projects', 'Projects')}
        </button>
        <button
          onClick={() => navigate('/app/timesheets')}
          className="h-[38px] flex items-center gap-2 px-3.5 bg-background-dark border border-border-dark hover:border-primary/50 text-white rounded-lg transition-colors text-xs font-medium"
        >
          <span className="material-symbols-outlined text-base text-primary">schedule</span>
          Record {t('timesheets', 'Timesheets')}
        </button>
        <button
          onClick={() => navigate('/app/clients')}
          className="h-[38px] flex items-center gap-2 px-3.5 bg-background-dark border border-border-dark hover:border-primary/50 text-white rounded-lg transition-colors text-xs font-medium"
        >
          <span className="material-symbols-outlined text-base text-primary">contacts</span>
          {t('clients', 'Clients')} Hub
        </button>
        <button
          onClick={() => fetchDashboardData()}
          className="h-[38px] flex items-center gap-1.5 px-3 border border-border-dark hover:bg-background-dark text-text-muted hover:text-white rounded-lg transition-colors text-xs ml-auto"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Refresh
        </button>
      </div>

      {/* Active Project Budget & Burn Progress */}
      {projectBurnList.length > 0 && (
        <div className="bg-card-dark rounded-xl border border-border-dark p-5 shadow-lg shadow-black/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">trending_up</span>
                Active {t('project', 'Project')} Budget & Labor Burn Tracking
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Comparison of contract budgets vs recorded {t('technician', 'technician').toLowerCase()} labor cost
              </p>
            </div>
            <button
              onClick={() => navigate('/app/projects')}
              className="text-xs text-primary hover:underline font-medium"
            >
              View All {t('projects', 'Projects')} →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {projectBurnList.map((p) => {
              const burnPct = p.budget > 0 ? Math.min(100, Math.round((p.estimatedLaborCost / p.budget) * 100)) : 0
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/app/projects/${p.id}`)}
                  className="bg-background-dark/80 rounded-xl p-3.5 border border-border-dark/80 hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">{p.clientName}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.status === 'Pending' || p.status === 'On Hold'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : p.status === 'Completed'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : p.status === 'Invoiced'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Labor Burn: ${p.estimatedLaborCost.toLocaleString()}</span>
                      <span className="font-mono font-medium text-white">
                        {p.budget > 0 ? `$${p.budget.toLocaleString()}` : `${p.loggedHours.toFixed(1)} hrs`}
                      </span>
                    </div>
                    <div className="w-full bg-card-dark rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          burnPct > 85 ? 'bg-red-500' : burnPct > 60 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${p.budget > 0 ? burnPct : Math.min(100, p.loggedHours * 5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content Grid: Activity Feed & Sidebar Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-card-dark rounded-xl border border-border-dark p-5 shadow-lg shadow-black/20">
          <div className="mb-4 flex items-center justify-between border-b border-border-dark/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">history</span>
                Live Operations Activity Feed
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Real-time stream of field timesheets, project status updates, and documents
              </p>
            </div>
            <span className="text-[11px] text-text-muted bg-background-dark px-2.5 py-1 rounded-full border border-border-dark">
              {activities.length} recent events
            </span>
          </div>
          <ActivityFeed items={activities} />
        </div>

        {/* Sidebar Status */}
        <div className="space-y-4">
          {/* User Session Profile Card */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-text-muted">
              <span className="material-symbols-outlined text-primary text-base">account_circle</span>
              Current Session
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Authenticated:</span>
                <span className="font-medium text-white">{user?.full_name || 'Duncan Woomack'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Permission Role:</span>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase text-[10px] font-bold">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Email:</span>
                <span className="font-medium text-white truncate max-w-[150px]">{user?.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Quick Module Navigation Links */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-text-muted">
              <span className="material-symbols-outlined text-primary text-base">apps</span>
              Operations Center
            </h3>
            <div className="space-y-1.5">
              <button
                onClick={() => navigate('/app/projects')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base">folder</span>
                  <span>Projects & Kanban</span>
                </div>
                <span className="material-symbols-outlined text-xs text-text-muted/60">chevron_right</span>
              </button>
              <button
                onClick={() => navigate('/app/timesheets')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base">schedule</span>
                  <span>Timesheet Approvals</span>
                </div>
                <span className="material-symbols-outlined text-xs text-text-muted/60">chevron_right</span>
              </button>
              <button
                onClick={() => navigate('/app/clients')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base">contacts</span>
                  <span>Client 360° Profiles</span>
                </div>
                <span className="material-symbols-outlined text-xs text-text-muted/60">chevron_right</span>
              </button>
              <button
                onClick={() => navigate('/app/financials')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base">payments</span>
                  <span>Financials & Xero Billing</span>
                </div>
                <span className="material-symbols-outlined text-xs text-text-muted/60">chevron_right</span>
              </button>
              <button
                onClick={() => navigate('/app/settings')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base">settings</span>
                  <span>Admin Settings & Team</span>
                </div>
                <span className="material-symbols-outlined text-xs text-text-muted/60">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
