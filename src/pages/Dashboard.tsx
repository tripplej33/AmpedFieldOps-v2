import { useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import ActivityFeed from '@/components/ActivityFeed'
import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardStats, mockActivityFeed } from '@/mocks/dashboardData'

export default function Dashboard() {
  const { user } = useAuth()
  const [activityOffset, setActivityOffset] = useState(0)

  // Mock data - will be replaced with real API calls
  const stats = mockDashboardStats
  const allActivities = mockActivityFeed
  const visibleActivities = allActivities.slice(0, activityOffset + 5)

  const handleLoadMore = () => {
    setActivityOffset(prev => prev + 5)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Operations Dashboard</h1>
        <p className="text-text-muted">Real-time status of field operations and activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs.toString()}
          icon="work"
          trend={{ value: stats.completedTodayTrend, isPositive: stats.completedTodayTrend >= 0 }}
          subtitle="Active operations"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday.toString()}
          icon="check_circle"
          trend={{ value: stats.completedTodayTrend, isPositive: stats.completedTodayTrend >= 0 }}
          subtitle="Jobs finished"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals.toString()}
          icon="schedule"
          trend={{ value: stats.pendingApprovalsTrend, isPositive: stats.pendingApprovalsTrend <= 0 }}
          subtitle="Awaiting review"
        />
        <StatCard
          title="Revenue Today"
          value={`$${stats.revenueToday.toLocaleString()}`}
          icon="trending_up"
          trend={{ value: stats.revenueTodayTrend, isPositive: stats.revenueTodayTrend >= 0 }}
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
