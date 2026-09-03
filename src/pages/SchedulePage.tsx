import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedule } from '@/hooks/useSchedule'
import { useProjects } from '@/hooks/useProjects'
import { useSafetyDocuments, useSafetyTemplates } from '@/hooks/useSafety'
import { supabase } from '@/lib/supabase'
import ScheduleResourceTimeline from '@/components/schedule/ScheduleResourceTimeline'
import TechnicianDailyAgenda from '@/components/schedule/TechnicianDailyAgenda'
import UnassignedJobsDrawer from '@/components/schedule/UnassignedJobsDrawer'
import ScheduleModal from '@/components/schedule/ScheduleModal'
import SafetyDocumentModal from '@/components/safety/SafetyDocumentModal'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { JobSchedule, ScheduleStatus, ScheduleCreatePayload, ScheduleUpdatePayload } from '@/types/schedule'
import type { Project } from '@/types'
import type { SafetyDocument } from '@/types/safety'

export default function SchedulePage() {
  const { user } = useAuth()
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline')

  // Filter state
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('all')
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ScheduleStatus | 'all'>('all')

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<JobSchedule | null>(null)
  const [initialSlotData, setInitialSlotData] = useState<{ techId?: string; startTime?: string }>({})

  // Safety Modal Integration State
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false)
  const [activeSafetyDoc, setActiveSafetyDoc] = useState<SafetyDocument | null>(null)
  const [safetyScheduleTarget, setSafetyScheduleTarget] = useState<JobSchedule | null>(null)

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Fetch Schedules for selected date
  const {
    schedules,
    loading: schedulesLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    linkSafetyDocument,
  } = useSchedule({
    startDate: `${selectedDate}T00:00:00.000Z`,
    endDate: `${selectedDate}T23:59:59.999Z`,
    technicianId: selectedTechFilter,
    projectId: selectedProjectFilter,
    status: selectedStatusFilter,
  })

  // Fetch Projects and Users for assignments
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string; email: string; role?: string }[]>([])

  // Safety hooks
  const { templates: safetyTemplates } = useSafetyTemplates()
  const { createDocument: createSafetyDoc, archiveDocumentPdf } = useSafetyDocuments()

  // Load Technicians List
  useMemo(() => {
    async function loadTechs() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name')
      if (data) setTechnicians(data)
    }
    loadTechs()
  }, [])

  // Date Navigation
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toISOString().slice(0, 10))
  }

  // Handle Event Creation from slot click
  const handleOpenAddModal = (techId?: string, startTime?: string) => {
    setSelectedSchedule(null)
    setInitialSlotData({ techId, startTime })
    setIsScheduleModalOpen(true)
  }

  // Handle Schedule Project from Drawer
  const handleScheduleProjectFromDrawer = (_project: Project) => {
    setSelectedSchedule(null)
    setInitialSlotData({
      startTime: '08:00',
    })
    setIsScheduleModalOpen(true)
  }

  // Handle Save Event
  const handleSaveSchedule = async (data: ScheduleCreatePayload | ScheduleUpdatePayload) => {
    if (selectedSchedule?.id) {
      await updateSchedule(selectedSchedule.id, data)
      setToast({ type: 'success', message: 'Job schedule updated successfully' })
    } else {
      await createSchedule(data as ScheduleCreatePayload)
      setToast({ type: 'success', message: 'New job scheduled successfully' })
    }
  }

  // Handle Delete Event
  const handleDeleteSchedule = async (id: string) => {
    await deleteSchedule(id)
    setToast({ type: 'info', message: 'Job schedule removed' })
  }

  // Handle Status Update
  const handleStatusUpdate = async (scheduleId: string, newStatus: ScheduleStatus) => {
    await updateScheduleStatus(scheduleId, newStatus)
    setToast({ type: 'success', message: `Status updated to ${newStatus.replace('_', ' ')}` })
  }

  // Handle Opening Safety Document Modal
  const handleOpenSafetyDoc = (schedule: JobSchedule) => {
    setSafetyScheduleTarget(schedule)
    setActiveSafetyDoc(null)
    setIsSafetyModalOpen(true)
  }

  // Handle Saving Safety Document and linking to Schedule
  const handleSaveSafetyDoc = async (docData: any) => {
    const saved = await createSafetyDoc(docData)
    if (safetyScheduleTarget?.id) {
      await linkSafetyDocument(safetyScheduleTarget.id, saved.id)
    }
    setToast({ type: 'success', message: 'Safety document linked to scheduled job!' })
    return saved
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card-dark border border-border-dark rounded-2xl p-4 shadow-lg">
        {/* Title & Date Navigator */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            <h1 className="text-lg font-bold text-white hidden sm:block">Schedule & Dispatch</h1>
          </div>

          <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-xl p-1">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors"
              title="Previous Day"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>

            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                selectedDate === todayStr
                  ? 'bg-primary text-black font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => handleShiftDate(1)}
              className="p-1 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors"
              title="Next Day"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white px-2 py-1 font-mono focus:outline-none cursor-pointer"
            />
          </div>

          {(schedulesLoading || projectsLoading) && (
            <span className="material-symbols-outlined text-sm text-primary animate-spin">progress_activity</span>
          )}
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTechFilter}
            onChange={(e) => setSelectedTechFilter(e.target.value)}
            className="h-8 px-2.5 bg-surface-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>

          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="h-8 px-2.5 bg-surface-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary max-w-[160px] truncate"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 bg-surface-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="dispatched">Dispatched</option>
            <option value="en_route">En Route</option>
            <option value="on_site">On Site</option>
            <option value="completed">Completed</option>
          </select>

          <div className="flex bg-surface-dark border border-border-dark rounded-xl p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary text-black font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_timeline</span>
              Timeline
            </button>

            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-primary text-black font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_agenda</span>
              My Day
            </button>
          </div>

          <Button onClick={() => handleOpenAddModal()} className="flex items-center gap-1 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">add</span>
            Schedule Job
          </Button>
        </div>
      </div>

      {/* Main Layout Container (Timeline/Agenda + Unassigned Drawer) */}
      <div className="flex gap-4 items-start">
        {/* Primary Schedule View */}
        <div className="flex-1 min-w-0 space-y-4">
          {viewMode === 'timeline' ? (
            <ScheduleResourceTimeline
              date={selectedDate}
              schedules={schedules}
              technicians={technicians}
              onSelectSchedule={(s) => {
                setSelectedSchedule(s)
                setIsScheduleModalOpen(true)
              }}
              onAddScheduleSlot={(techId, startTime) => handleOpenAddModal(techId, startTime)}
            />
          ) : (
            <TechnicianDailyAgenda
              date={selectedDate}
              schedules={
                user?.id
                  ? schedules.filter((s) => s.technician_id === user.id || s.assigned_crew_ids.includes(user.id))
                  : schedules
              }
              currentUserId={user?.id}
              onStatusUpdate={handleStatusUpdate}
              onOpenSafetyDoc={handleOpenSafetyDoc}
              onSelectSchedule={(s) => {
                setSelectedSchedule(s)
                setIsScheduleModalOpen(true)
              }}
            />
          )}
        </div>

        {/* Unassigned Projects Drawer (in Timeline view) */}
        {viewMode === 'timeline' && (
          <UnassignedJobsDrawer
            projects={projects}
            isOpen={isDrawerOpen}
            onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
            onScheduleProject={handleScheduleProjectFromDrawer}
          />
        )}
      </div>

      {/* Schedule Create / Edit Modal */}
      {isScheduleModalOpen && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          schedule={selectedSchedule}
          initialDate={selectedDate}
          initialTechnicianId={initialSlotData.techId}
          initialStartTime={initialSlotData.startTime}
          onSave={handleSaveSchedule}
          onDelete={handleDeleteSchedule}
        />
      )}

      {/* Integrated Safety Document Modal */}
      {isSafetyModalOpen && (
        <SafetyDocumentModal
          isOpen={isSafetyModalOpen}
          onClose={() => {
            setIsSafetyModalOpen(false)
            setSafetyScheduleTarget(null)
          }}
          document={activeSafetyDoc}
          templates={safetyTemplates}
          projectId={safetyScheduleTarget?.project_id || undefined}
          costCenterId={safetyScheduleTarget?.cost_center_id || undefined}
          projectName={safetyScheduleTarget?.project?.name || safetyScheduleTarget?.title}
          onSaveDocument={handleSaveSafetyDoc}
          onArchivePdf={archiveDocumentPdf}
        />
      )}

      {/* Toast Notifications */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
