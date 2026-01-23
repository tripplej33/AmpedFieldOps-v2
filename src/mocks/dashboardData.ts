// Mock data for Phase 5 Dashboard development


export interface DashboardStats {
  totalJobs: number
  completedToday: number
  pendingApprovals: number
  revenueToday: number
  completedTodayTrend: number
  pendingApprovalsTrend: number
  revenueTodayTrend: number
}

export interface ActivityFeedItem {
  id: string
  userId: string
  userName: string
  action: 'timesheet_submitted' | 'timesheet_approved' | 'job_created' | 'job_updated' | 'project_updated'
  resourceType: 'timesheet' | 'job' | 'project'
  resourceId: string
  resourceName: string
  details: Record<string, unknown>
  createdAt: string
}

export interface InvoicePipelineItem {
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  count: number
  amount: number
}

export interface XeroSyncStatus {
  lastSyncTime: string
  syncStatus: 'success' | 'pending' | 'error'
  errorMessage?: string
  itemsSynced: number
}

export const mockDashboardStats: DashboardStats = {
  totalJobs: 47,
  completedToday: 8,
  pendingApprovals: 12,
  revenueToday: 2450,
  completedTodayTrend: 3,
  pendingApprovalsTrend: -2,
  revenueTodayTrend: 520
}

export const mockActivityFeed: ActivityFeedItem[] = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'John Smith',
    action: 'timesheet_submitted',
    resourceType: 'timesheet',
    resourceId: 'ts-1',
    resourceName: 'Timesheet for Jan 23',
    details: { hours: 8, date: '2026-01-23' },
    createdAt: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Sarah Johnson',
    action: 'timesheet_approved',
    resourceType: 'timesheet',
    resourceId: 'ts-2',
    resourceName: 'Timesheet for Jan 22',
    details: { hours: 8, date: '2026-01-22' },
    createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: '3',
    userId: 'user-1',
    userName: 'John Smith',
    action: 'job_created',
    resourceType: 'job',
    resourceId: 'job-1',
    resourceName: 'HVAC Maintenance - Building A',
    details: { priority: 'high', estimatedHours: 4 },
    createdAt: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: '4',
    userId: 'user-3',
    userName: 'Mike Davis',
    action: 'job_updated',
    resourceType: 'job',
    resourceId: 'job-2',
    resourceName: 'Electrical Repair - Office B',
    details: { status: 'completed', completedAt: new Date().toISOString() },
    createdAt: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: '5',
    userId: 'user-2',
    userName: 'Sarah Johnson',
    action: 'project_updated',
    resourceType: 'project',
    resourceId: 'proj-1',
    resourceName: 'Building Maintenance Q1 2026',
    details: { status: 'Active', percentComplete: 45 },
    createdAt: new Date(Date.now() - 60 * 60000).toISOString()
  },
  {
    id: '6',
    userId: 'user-1',
    userName: 'John Smith',
    action: 'timesheet_submitted',
    resourceType: 'timesheet',
    resourceId: 'ts-3',
    resourceName: 'Timesheet for Jan 21',
    details: { hours: 8, date: '2026-01-21' },
    createdAt: new Date(Date.now() - 90 * 60000).toISOString()
  },
  {
    id: '7',
    userId: 'user-3',
    userName: 'Mike Davis',
    action: 'timesheet_approved',
    resourceType: 'timesheet',
    resourceId: 'ts-4',
    resourceName: 'Timesheet for Jan 20',
    details: { hours: 8, date: '2026-01-20' },
    createdAt: new Date(Date.now() - 120 * 60000).toISOString()
  },
  {
    id: '8',
    userId: 'user-2',
    userName: 'Sarah Johnson',
    action: 'job_created',
    resourceType: 'job',
    resourceId: 'job-3',
    resourceName: 'Plumbing Inspection - Warehouse',
    details: { priority: 'medium', estimatedHours: 2 },
    createdAt: new Date(Date.now() - 150 * 60000).toISOString()
  }
]

export const mockInvoicePipeline: InvoicePipelineItem[] = [
  { status: 'draft', count: 8, amount: 5200 },
  { status: 'sent', count: 5, amount: 3800 },
  { status: 'paid', count: 142, amount: 98450 },
  { status: 'overdue', count: 2, amount: 1200 }
]

export const mockXeroSyncStatus: XeroSyncStatus = {
  lastSyncTime: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  syncStatus: 'success',
  itemsSynced: 47
}
