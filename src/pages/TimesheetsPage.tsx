import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useTimesheets,
  useDeleteTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useBulkCreateTimesheets,
  useUpdateTimesheet,
  useDuplicateTimesheet,
  useUnapproveTimesheet,
} from '@/hooks/useTimesheets'
import { useProjects } from '@/hooks/useProjects'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { useAuth } from '@/contexts/AuthContext'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useUsers } from '@/hooks/useUsers'
import type { Timesheet, BulkTimesheetFormData, TimesheetFilters } from '@/types'
import TimesheetMetrics from '@/components/TimesheetMetrics'
import TimesheetTable from '@/components/TimesheetTable'
import WeeklyTimesheetGrid from '@/components/WeeklyTimesheetGrid'
import DayTimesheetTimeline from '@/components/timesheets/DayTimesheetTimeline'
import TimesheetFiltersComponent from '@/components/TimesheetFilters'
import TimesheetModal from '@/components/TimesheetModal'
import ApprovalModal from '@/components/ApprovalModal'
import DocumentScannerModal from '@/components/DocumentScannerModal'
import GenerateInvoiceModal from '@/components/invoicing/GenerateInvoiceModal'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

export default function TimesheetsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view') as 'day' | 'weekly' | 'table' | 'approvals' | null
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<TimesheetFilters>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'weekly' | 'table' | 'approvals'>(() => {
    if (viewParam && ['day', 'weekly', 'table', 'approvals'].includes(viewParam)) {
      return viewParam
    }
    return 'day'
  })

  useEffect(() => {
    if (viewParam && ['day', 'weekly', 'table', 'approvals'].includes(viewParam)) {
      setViewMode(viewParam)
    } else if (!viewParam) {
      setViewMode('day')
    }
  }, [viewParam])

  const handleViewChange = (mode: 'day' | 'weekly' | 'table' | 'approvals') => {
    setViewMode(mode)
    setCurrentPage(1)
    setSearchParams(mode === 'day' ? {} : { view: mode })
  }

  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selected, setSelected] = useState<Timesheet | undefined>()
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>()
  const [modalInitialProjectId, setModalInitialProjectId] = useState<string | undefined>()
  const [modalInitialUserId, setModalInitialUserId] = useState<string | undefined>()
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string | undefined>()
  const [sort, setSort] = useState<{ key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' }>()

  const { user } = useAuth()
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const effectiveFilters: TimesheetFilters = {
    ...filters,
    ...(viewMode === 'approvals'
      ? { status: ['submitted'] as ('draft' | 'submitted' | 'approved' | 'invoiced')[] }
      : {}),
  }

  const pageSize = viewMode === 'day' || viewMode === 'weekly' ? 100 : 25

  const { data: timesheets, isLoading, pageCount, refresh: refreshTimesheets } = useTimesheets(
    effectiveFilters,
    currentPage,
    sort,
    pageSize
  )
  const { data: projects } = useProjects(undefined, 1)
  const { data: activityTypes } = useActivityTypes()
  const { data: costCenters } = useCostCenters()
  const { data: users } = useUsers()

  const { mutate: deleteTimesheet, isPending: isDeleting } = useDeleteTimesheet()
  const { mutate: submitTimesheet, isPending: isSubmitting } = useSubmitTimesheet()
  const { mutate: approveTimesheet, isPending: isApproving } = useApproveTimesheet()
  const { mutate: unapproveTimesheet } = useUnapproveTimesheet()
  const { mutate: bulkCreateTimesheets, isPending: isBulkCreating } = useBulkCreateTimesheets()
  const { mutate: updateTimesheet } = useUpdateTimesheet()
  const { duplicate: duplicateTimesheet } = useDuplicateTimesheet()

  const activeFilterCount =
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    (filters.userId ? 1 : 0) +
    (filters.status && filters.status.length > 0 ? 1 : 0)

  const handleAdd = (
    initialDate?: string,
    initialProjectId?: string,
    initialUserId?: string,
    initialStartTime?: string
  ) => {
    setSelected(undefined)
    setModalInitialDate(initialDate)
    setModalInitialProjectId(initialProjectId)
    setModalInitialUserId(initialUserId)
    setModalInitialStartTime(initialStartTime)
    setIsModalOpen(true)
  }

  const handleEdit = (t: Timesheet) => {
    setSelected(t)
    setModalInitialDate(t.entry_date)
    setModalInitialProjectId(t.project_id)
    setModalInitialUserId(t.user_id)
    setModalInitialStartTime(t.start_time || undefined)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteTimesheet(id)
    await refreshTimesheets()
  }

  const handleSubmitDraft = async (id: string) => {
    await submitTimesheet(id)
    await refreshTimesheets()
  }

  const handleApprove = async (id: string) => {
    await approveTimesheet(id)
    await refreshTimesheets()
  }

  const handleUnapprove = async (id: string) => {
    await unapproveTimesheet(id)
    await refreshTimesheets()
  }

  const handleBatchSubmit = async (ids: string[]) => {
    await Promise.all(ids.map(id => submitTimesheet(id)))
    await refreshTimesheets()
  }

  const handleBatchApprove = async (ids: string[]) => {
    await Promise.all(ids.map(id => approveTimesheet(id)))
    await refreshTimesheets()
  }

  const handleBatchDelete = async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteTimesheet(id)))
    await refreshTimesheets()
  }

  const handleModalSaveDraft = async (data: BulkTimesheetFormData) => {
    if (selected) {
      // Update existing record
      const entry = data.entries[0]
      await updateTimesheet(selected.id, {
        project_id: data.project_id,
        cost_center_id: data.cost_center_id,
        entry_date: data.entry_date,
        activity_type_id: entry?.activity_type_id,
        user_id: entry?.user_id,
        hours: entry?.hours,
        start_time: entry?.start_time,
        end_time: entry?.end_time,
        break_minutes: entry?.break_minutes,
        notes: entry?.notes,
      })
    } else {
      await bulkCreateTimesheets(data)
    }
    await refreshTimesheets()
    setIsModalOpen(false)
    setSelected(undefined)
  }

  const handleModalSubmitApproval = async (data: BulkTimesheetFormData) => {
    if (selected) {
      // Update existing record and submit
      const entry = data.entries[0]
      await updateTimesheet(selected.id, {
        project_id: data.project_id,
        cost_center_id: data.cost_center_id,
        entry_date: data.entry_date,
        activity_type_id: entry?.activity_type_id,
        user_id: entry?.user_id,
        hours: entry?.hours,
        start_time: entry?.start_time,
        end_time: entry?.end_time,
        break_minutes: entry?.break_minutes,
        notes: entry?.notes,
      })
      if (selected.status === 'draft') {
        await submitTimesheet(selected.id)
      }
    } else {
      const created = await bulkCreateTimesheets(data)
      if (created && created.length > 0) {
        for (const t of created) {
          await submitTimesheet(t.id)
        }
      }
    }
    await refreshTimesheets()
    setIsModalOpen(false)
    setSelected(undefined)
  }

  const handleUpdateTimesheet = async (
    id: string,
    updates: { user_id?: string; start_time?: string; end_time?: string; hours?: number }
  ) => {
    await updateTimesheet(id, updates)
    await refreshTimesheets()
  }

  const handleDuplicateTimesheet = async (
    timesheetId: string,
    targetUserId: string,
    customStartTime?: string,
    customEndTime?: string
  ) => {
    await duplicateTimesheet(timesheetId, targetUserId, dayDate, customStartTime, customEndTime)
    await refreshTimesheets()
  }

  const onSort = (key: 'entry_date' | 'hours' | 'status') => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const disabled = isDeleting || isSubmitting || isApproving || isBulkCreating

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Timesheet Intelligence</h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time technician labor scheduling, hourly timeline allocation, and automated approval pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-card-dark p-1 rounded-xl border border-border-dark shadow-sm">
            <button
              type="button"
              onClick={() => handleViewChange('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'day'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Hourly Schedule Timeline (X: Time, Y: Tech)"
            >
              <span className="material-symbols-outlined text-base">view_timeline</span>
              <span>Day Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'weekly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Weekly Calendar Matrix"
            >
              <span className="material-symbols-outlined text-base">calendar_view_week</span>
              <span>Weekly Grid</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Audit Table View"
            >
              <span className="material-symbols-outlined text-base">view_list</span>
              <span>Table</span>
            </button>

            {isManager && (
              <button
                type="button"
                onClick={() => handleViewChange('approvals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'approvals'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
                title="Pending Approvals Workspace"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                <span>Approvals</span>
              </button>
            )}
          </div>

          {/* Toggle Filter Toolbar */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card-dark border-border-dark text-text-muted hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">filter_list</span>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Scanner Button */}
          <Button variant="secondary" onClick={() => setIsScannerOpen(true)} disabled={disabled}>
            <span className="material-symbols-outlined text-base">document_scanner</span>
            <span className="hidden sm:inline">Scan Receipt</span>
          </Button>

          {isManager && (
            <Button
              variant="secondary"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="text-xs font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>Generate Invoice</span>
            </Button>
          )}

          {/* Add Timesheet Button */}
          <Button onClick={() => handleAdd()} disabled={disabled}>
            <span className="material-symbols-outlined text-base">add</span>
            <span>Add Timesheet</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Metrics */}
      <TimesheetMetrics timesheets={timesheets} isManager={isManager} />

      {/* 3. Collapsible Filter Toolbar */}
      {showFilters && (
        <TimesheetFiltersComponent
          onChange={(newFilters) => {
            setFilters(newFilters)
            setCurrentPage(1)
          }}
          onClear={() => {
            setFilters({})
            setCurrentPage(1)
          }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* 4. Active View Display */}
      {viewMode === 'day' && (
        <DayTimesheetTimeline
          date={dayDate}
          onDateChange={setDayDate}
          timesheets={timesheets}
          projects={projects || []}
          users={users || []}
          isLoading={isLoading}
          isAdmin={isManager}
          onAddEntry={(d, uId, startTime) => handleAdd(d, undefined, uId, startTime)}
          onEditEntry={handleEdit}
          onUpdateTimesheet={handleUpdateTimesheet}
          onDuplicateTimesheet={handleDuplicateTimesheet}
          onUnapproveTimesheet={handleUnapprove}
          onDeleteTimesheet={handleDelete}
        />
      )}

      {viewMode === 'weekly' && (
        <WeeklyTimesheetGrid
          timesheets={timesheets}
          projects={projects || []}
          isLoading={isLoading}
          onAddEntry={(date, pId) => handleAdd(date, pId)}
          onEditEntry={handleEdit}
        />
      )}

      {viewMode === 'table' && (
        <TimesheetTable
          items={timesheets}
          isLoading={isLoading}
          onEdit={handleEdit}
          onSubmit={handleSubmitDraft}
          onApprove={handleApprove}
          onUnapprove={handleUnapprove}
          onDelete={handleDelete}
          onBatchSubmit={handleBatchSubmit}
          onBatchApprove={handleBatchApprove}
          onBatchDelete={handleBatchDelete}
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setCurrentPage}
          onSort={onSort}
          sort={sort}
          isManager={isManager}
        />
      )}

      {viewMode === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">fact_check</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Manager Approvals Queue</h3>
                <p className="text-xs text-text-muted">
                  Review submitted technician entries. Batch approve selected or inspect details before payroll sync.
                </p>
              </div>
            </div>
          </div>

          <TimesheetTable
            items={timesheets}
            isLoading={isLoading}
            onEdit={handleEdit}
            onSubmit={handleSubmitDraft}
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            onDelete={handleDelete}
            onBatchSubmit={handleBatchSubmit}
            onBatchApprove={handleBatchApprove}
            onBatchDelete={handleBatchDelete}
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setCurrentPage}
            onSort={onSort}
            sort={sort}
            isManager={true}
          />
        </div>
      )}

      {/* Modals */}
      <TimesheetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalInitialDate(undefined)
          setModalInitialProjectId(undefined)
          setModalInitialUserId(undefined)
          setModalInitialStartTime(undefined)
        }}
        onSaveDraft={handleModalSaveDraft}
        onSubmitForApproval={handleModalSubmitApproval}
        projects={projects || []}
        costCenters={costCenters || []}
        activityTypes={activityTypes || []}
        users={users || []}
        isPending={isBulkCreating}
        initialDate={modalInitialDate}
        initialProjectId={modalInitialProjectId}
        initialUserId={modalInitialUserId}
        initialStartTime={modalInitialStartTime}
        timesheet={selected}
        isAdmin={isManager}
        onUnapprove={handleUnapprove}
      />

      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        timesheet={selected}
        onApprove={async (id) => handleApprove(id)}
      />

      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApply={(data) => {
          setToast({ type: 'info', message: `Scanned receipt from ${data.vendor} ($${data.totalAmount.toFixed(2)}) ready for attachment!` })
          setIsModalOpen(true)
        }}
      />

      {isInvoiceModalOpen && (
        <GenerateInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onInvoiceCreated={() => {
            refreshTimesheets()
            setToast({ type: 'success', message: 'Invoice generated and timesheets updated!' })
          }}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
