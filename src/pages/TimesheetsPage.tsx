import { useState } from 'react'
import { useTimesheets, useDeleteTimesheet, useSubmitTimesheet, useApproveTimesheet, useBulkCreateTimesheets } from '@/hooks/useTimesheets'
import { useProjects } from '@/hooks/useProjects'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { useAuth } from '@/contexts/AuthContext'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useUsers } from '@/hooks/useUsers'
import type { Timesheet, BulkTimesheetFormData, TimesheetFilters } from '@/types'
import TimesheetTable from '@/components/TimesheetTable'
import TimesheetCard from '@/components/TimesheetCard'
import TimesheetFiltersComponent from '@/components/TimesheetFilters'
import TimesheetModal from '@/components/TimesheetModal'
import ApprovalModal from '@/components/ApprovalModal'
import Button from '@/components/ui/Button'

export default function TimesheetsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<TimesheetFilters>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<Timesheet | undefined>()
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [sort, setSort] = useState<{ key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' }>()
  const [view, setView] = useState<'all' | 'approvals'>('all')
  const { user } = useAuth()
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const effectiveFilters: TimesheetFilters = { ...filters, ...(view === 'approvals' ? { status: ['submitted'] as ('draft' | 'submitted' | 'approved' | 'invoiced')[] } : {}) }
  const { data: timesheets, isLoading, pageCount, refresh: refreshTimesheets } = useTimesheets(effectiveFilters, currentPage, sort)
  const { data: projects } = useProjects(undefined, 1)
  const { data: activityTypes } = useActivityTypes()
  const { data: costCenters } = useCostCenters()
  const { data: users } = useUsers()

  const { mutate: deleteTimesheet, isPending: isDeleting } = useDeleteTimesheet()
  const { mutate: submitTimesheet, isPending: isSubmitting } = useSubmitTimesheet()
  const { mutate: approveTimesheet, isPending: isApproving } = useApproveTimesheet()
  const { mutate: bulkCreateTimesheets, isPending: isBulkCreating } = useBulkCreateTimesheets()

  const handleAdd = () => {
    setSelected(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (t: Timesheet) => {
    setSelected(t)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete draft timesheet?')) {
      console.log('TimesheetsPage: Deleting timesheet', id)
      await deleteTimesheet(id)
      console.log('TimesheetsPage: Calling refreshTimesheets after delete')
      await refreshTimesheets()
    }
  }

  const handleSubmitDraft = async (id: string) => {
    if (confirm('Submit this timesheet for approval?')) {
      console.log('TimesheetsPage: Submitting timesheet', id)
      await submitTimesheet(id)
      console.log('TimesheetsPage: Calling refreshTimesheets after submit')
      await refreshTimesheets()
    }
  }

  const handleApprove = async (id: string) => {
    console.log('TimesheetsPage: Approving timesheet', id)
    await approveTimesheet(id)
    console.log('TimesheetsPage: Calling refreshTimesheets after approve')
    await refreshTimesheets()
  }

  const handleModalSaveDraft = async (data: BulkTimesheetFormData) => {
    console.log('TimesheetsPage: handleModalSaveDraft called with:', data)
    try {
      console.log('TimesheetsPage: Creating bulk timesheets')
      await bulkCreateTimesheets(data)
      
      // Refresh data after mutation
      console.log('TimesheetsPage: Calling refreshTimesheets')
      await refreshTimesheets()
      
      setIsModalOpen(false)
      setSelected(undefined)
      console.log('TimesheetsPage: Modal closed and data refreshed')
    } catch (error) {
      console.error('TimesheetsPage: Error saving timesheet:', error)
    }
  }

  const handleModalSubmitApproval = async (data: BulkTimesheetFormData) => {
    console.log('TimesheetsPage: handleModalSubmitApproval called with:', data)
    try {
      console.log('TimesheetsPage: Creating bulk timesheets and submitting')
      const created = await bulkCreateTimesheets(data)
      if (created && created.length > 0) {
        console.log('TimesheetsPage: Submitting', created.length, 'timesheets')
        for (const ts of created) {
          await submitTimesheet(ts.id)
        }
      }
      
      // Refresh data after mutations
      console.log('TimesheetsPage: Calling refreshTimesheets')
      await refreshTimesheets()
      
      setIsModalOpen(false)
      setSelected(undefined)
      console.log('TimesheetsPage: Modal closed and data refreshed')
    } catch (error) {
      console.error('TimesheetsPage: Error submitting timesheet:', error)
    }
  }

  const onSort = (_key: 'entry_date' | 'hours' | 'status') => {
    setSort((prev) => {
      if (!prev || prev.key !== _key) return { key: _key, direction: 'desc' }
      return { key: _key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  const disabled = isDeleting || isSubmitting || isApproving || isBulkCreating

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary">schedule</span>
            Timesheets
          </h1>
          <p className="text-text-muted">Log work and manage approvals</p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <div className="flex gap-1 bg-card-dark border border-border-dark rounded-lg p-1">
              <button
                onClick={() => { setView('all'); setCurrentPage(1) }}
                className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                  view === 'all' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
                }`}
                title="All Timesheets"
              >
                <span className="material-symbols-outlined text-xl">list_alt</span>
                <span className="hidden sm:inline text-sm font-medium">All</span>
              </button>
              <button
                onClick={() => { setView('approvals'); setCurrentPage(1) }}
                className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                  view === 'approvals' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
                }`}
                title="Pending Approvals"
              >
                <span className="material-symbols-outlined text-xl">task_alt</span>
                <span className="hidden sm:inline text-sm font-medium">Approvals</span>
              </button>
            </div>
          )}
          <Button onClick={handleAdd} disabled={disabled}>
            <span className="material-symbols-outlined">add</span>
            <span className="hidden sm:inline">Add Timesheet</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div>
          <TimesheetFiltersComponent onChange={setFilters} onClear={() => setFilters({})} />
          {isManager && (
            <div className="mt-4 bg-card-dark border border-border-dark rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">task_alt</span>
                <span className="text-white font-medium">Approvals View</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setView('all'); setCurrentPage(1) }}
                  className={`px-3 py-2 rounded transition-colors ${view === 'all' ? 'bg-primary text-white' : 'text-text-muted hover:text-white bg-nav-hover'}`}
                >All</button>
                <button
                  onClick={() => { setView('approvals'); setCurrentPage(1) }}
                  className={`px-3 py-2 rounded transition-colors ${view === 'approvals' ? 'bg-primary text-white' : 'text-text-muted hover:text-white bg-nav-hover'}`}
                >Pending</button>
              </div>
            </div>
          )}
        </div>
        {/* Table / Cards */}
        <div className="lg:col-span-3">
          <div className="hidden md:block bg-card-dark rounded-lg border border-border-dark overflow-hidden">
            <TimesheetTable
              items={timesheets}
              isLoading={isLoading}
              onEdit={handleEdit}
              onSubmit={handleSubmitDraft}
              onApprove={(id) => handleApprove(id)}
              onDelete={handleDelete}
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setCurrentPage}
              onSort={onSort}
              sort={sort}
              isManager={isManager}
            />
          </div>
          <div className="md:hidden space-y-3">
            {timesheets.map((t) => (
              <TimesheetCard
                key={t.id}
                item={t}
                onEdit={handleEdit}
                onSubmit={handleSubmitDraft}
                onApprove={(id) => handleApprove(id)}
                onDelete={handleDelete}
                isManager={isManager}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TimesheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveDraft={handleModalSaveDraft}
        onSubmitForApproval={handleModalSubmitApproval}
        projects={projects}
        costCenters={costCenters}
        activityTypes={activityTypes}
        users={users || []}
        isPending={isBulkCreating}
      />

      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        timesheet={selected}
        onApprove={async (id) => handleApprove(id)}
      />
    </div>
  )
}
