import { useState, useEffect } from 'react'
import StatCard from '@/components/ui/StatCard'
import ActivityFeed from '@/components/ActivityFeed'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityFeedItem } from '@/mocks/dashboardData'

interface DashboardStats {
  totalJobs: number
  completedToday: number
  pendingApprovals: number
  revenueToday: number
  completedTodayTrend: number
  pendingApprovalsTrend: number
  revenueTodayTrend: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [activityOffset, setActivityOffset] = useState(0)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allActivities, setAllActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dashboard stats
      const statsRes = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      if (!statsRes.ok) throw new Error('Failed to fetch dashboard stats')
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch activity feed
      const activityRes = await fetch('/api/admin/dashboard/activity-feed?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      if (!activityRes.ok) throw new Error('Failed to fetch activity feed')
      const activityData = await activityRes.json()
      setAllActivities(activityData.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      // Keep UI functional even if API fails
      setStats({
        totalJobs: 0,
        completedToday: 0,
        pendingApprovals: 0,
        revenueToday: 0,
        completedTodayTrend: 0,
        pendingApprovalsTrend: 0,
        revenueTodayTrend: 0,
      })
      setAllActivities([])
    } finally {
      setLoading(false)
    }
  }

  const visibleActivities = allActivities.slice(0, activityOffset + 5)

  const handleLoadMore = () => {
    setActivityOffset(prev => prev + 5)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Operations Dashboard</h1>
          <p className="text-text-muted">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card-dark rounded-xl border border-border-dark h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Operations Dashboard</h1>
        <p className="text-text-muted">Real-time status of field operations and activities</p>
        {error && <p className="text-red-400 text-sm mt-2">⚠️ {error}</p>}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats?.totalJobs.toString() || '0'}
          icon="work"
          trend={{ value: stats?.completedTodayTrend || 0, isPositive: (stats?.completedTodayTrend || 0) >= 0 }}
          subtitle="Active operations"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday.toString() || '0'}
          icon="check_circle"
          trend={{ value: stats?.completedTodayTrend || 0, isPositive: (stats?.completedTodayTrend || 0) >= 0 }}
          subtitle="Jobs finished"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingApprovals.toString() || '0'}
          icon="schedule"
          trend={{ value: stats?.pendingApprovalsTrend || 0, isPositive: (stats?.pendingApprovalsTrend || 0) <= 0 }}
          subtitle="Awaiting review"
        />
        <StatCard
          title="Revenue Today"
          value={`$${(stats?.revenueToday || 0).toLocaleString()}`}
          icon="trending_up"
          trend={{ value: stats?.revenueTodayTrend || 0, isPositive: (stats?.revenueTodayTrend || 0) >= 0 }}
          subtitle="Daily total"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 flex-wrap">
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-lg">add</span>
          New Job
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-lg">schedule</span>
          New Timesheet
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border-dark hover:bg-card-dark text-white rounded-lg transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2 bg-card-dark rounded-xl border border-border-dark p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <p className="text-sm text-text-muted mt-1">Latest operations and updates</p>
          </div>
          <ActivityFeed
            items={visibleActivities}
            onLoadMore={visibleActivities.length < allActivities.length ? handleLoadMore : undefined}
          />
        </div>

        {/* Sidebar - Quick Stats and Status */}
        <div className="space-y-6">
          {/* Role-based Summary */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-6">
            <h3 className="font-semibold text-white mb-4">Your Role</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Role:</span>
                <span className="text-sm font-medium text-white capitalize">{user?.role || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Email:</span>
                <span className="text-sm font-medium text-white truncate">{user?.email || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-card-dark rounded-xl border border-border-dark p-6">
            <h3 className="font-semibold text-white mb-4">Quick Navigation</h3>
            <div className="space-y-2">
              <a
                href="/app/projects"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white"
              >
                <span className="material-symbols-outlined">folder</span>
                <span className="text-sm">Projects</span>
              </a>
              <a
                href="/app/timesheets"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white"
              >
                <span className="material-symbols-outlined">schedule</span>
                <span className="text-sm">Timesheets</span>
              </a>
              <a
                href="/app/financials"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-dark transition-colors text-text-muted hover:text-white"
              >
                <span className="material-symbols-outlined">payments</span>
                <span className="text-sm">Financials</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
