import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { JobSchedule, ScheduleStatus, ScheduleCreatePayload, ScheduleUpdatePayload } from '@/types/schedule'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  schedule?: JobSchedule | null
  initialDate?: string
  initialTechnicianId?: string
  initialStartTime?: string
  initialEndTime?: string
  onSave: (data: ScheduleCreatePayload | ScheduleUpdatePayload) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

interface ProjectOption {
  id: string
  name: string
  address?: string | null
  suburb?: string | null
  city?: string | null
  client?: { name: string } | null
}

interface UserOption {
  id: string
  full_name: string
  email: string
  role?: string
}

export default function ScheduleModal({
  isOpen,
  onClose,
  schedule,
  initialDate,
  initialTechnicianId,
  initialStartTime,
  initialEndTime,
  onSave,
  onDelete,
}: ScheduleModalProps) {
  const isEditing = Boolean(schedule?.id)

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [costCenters, setCostCenters] = useState<{ id: string; name: string; project_id: string }[]>([])
  const [technicians, setTechnicians] = useState<UserOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Form State
  const [title, setTitle] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('')
  const [selectedTechId, setSelectedTechId] = useState('')
  const [assignedCrewIds, setAssignedCrewIds] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:30')
  const [allDay, setAllDay] = useState(false)
  const [status, setStatus] = useState<ScheduleStatus>('scheduled')
  const [siteAddress, setSiteAddress] = useState('')
  const [requiresSafetyDoc, setRequiresSafetyDoc] = useState(true)
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch Projects, Cost Centers, and Technicians
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingOptions(true)
        const [projRes, ccRes, userRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, address, suburb, city, client:clients(name)')
            .order('name'),
          supabase.from('cost_centers').select('id, name, project_id').order('name'),
          supabase.from('users').select('id, full_name, email, role').order('full_name'),
        ])

        if (projRes.data) setProjects(projRes.data as any)
        if (ccRes.data) setCostCenters(ccRes.data)
        if (userRes.data) setTechnicians(userRes.data)
      } catch (e) {
        console.error('Failed to load scheduling options:', e)
      } finally {
        setLoadingOptions(false)
      }
    }

    if (isOpen) {
      loadOptions()
    }
  }, [isOpen])

  // Populate Form Fields
  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title || '')
      setSelectedProjectId(schedule.project_id || '')
      setSelectedCostCenterId(schedule.cost_center_id || '')
      setSelectedTechId(schedule.technician_id || '')
      setAssignedCrewIds(schedule.assigned_crew_ids || [])
      
      const start = new Date(schedule.start_time)
      const end = new Date(schedule.end_time)
      setDate(start.toISOString().slice(0, 10))
      setStartTime(start.toTimeString().slice(0, 5))
      setEndTime(end.toTimeString().slice(0, 5))
      setAllDay(schedule.all_day)
      setStatus(schedule.status)
      setSiteAddress(schedule.site_address || '')
      setRequiresSafetyDoc(schedule.requires_safety_doc)
      setDescription(schedule.description || '')
      setNotes(schedule.notes || '')
    } else {
      const todayStr = initialDate || new Date().toISOString().slice(0, 10)
      setDate(todayStr)
      setStartTime(initialStartTime || '08:00')
      setEndTime(initialEndTime || '16:30')
      setSelectedTechId(initialTechnicianId || '')
      setTitle('')
      setSelectedProjectId('')
      setSelectedCostCenterId('')
      setAssignedCrewIds([])
      setAllDay(false)
      setStatus('scheduled')
      setSiteAddress('')
      setRequiresSafetyDoc(true)
      setDescription('')
      setNotes('')
    }
    setError(null)
  }, [schedule, isOpen, initialDate, initialTechnicianId, initialStartTime, initialEndTime])

  // When project changes, auto-fill address and title if empty
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId)
    const proj = projects.find((p) => p.id === projId)
    if (proj) {
      const addr = [proj.address, proj.suburb, proj.city].filter(Boolean).join(', ')
      if (addr && !siteAddress) setSiteAddress(addr)
      if (!title) setTitle(`${proj.name} - Site Work`)
    }
  }

  // Quick Duration helper
  const handleSetDuration = (hours: number) => {
    const [h, m] = startTime.split(':').map(Number)
    const endHour = Math.min(23, h + Math.floor(hours))
    const endMin = (m + (hours % 1) * 60) % 60
    setEndTime(`${String(endHour).padStart(2, '0')}:${String(Math.round(endMin)).padStart(2, '0')}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Schedule title is required')
      return
    }
    if (!date) {
      setError('Date is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const startIso = allDay
        ? new Date(`${date}T00:00:00`).toISOString()
        : new Date(`${date}T${startTime}:00`).toISOString()

      const endIso = allDay
        ? new Date(`${date}T23:59:59`).toISOString()
        : new Date(`${date}T${endTime}:00`).toISOString()

      const payload = {
        title: title.trim(),
        project_id: selectedProjectId || null,
        cost_center_id: selectedCostCenterId || null,
        technician_id: selectedTechId || null,
        assigned_crew_ids: assignedCrewIds,
        start_time: startIso,
        end_time: endIso,
        all_day: allDay,
        status,
        site_address: siteAddress.trim() || null,
        requires_safety_doc: requiresSafetyDoc,
        description: description.trim() || null,
        notes: notes.trim() || null,
      }

      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!schedule?.id || !onDelete) return
    if (!confirm('Are you sure you want to delete this scheduled job?')) return

    try {
      setDeleting(true)
      await onDelete(schedule.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule')
    } finally {
      setDeleting(false)
    }
  }

  const availableFilteredCostCenters = selectedProjectId
    ? costCenters.filter((c) => c.project_id === selectedProjectId)
    : costCenters

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Scheduled Job' : 'Schedule New Job'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1">
          <label className="block text-text-muted font-medium">Job Title / Task Description *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Switchboard Upgrade & Commissioning"
            className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        {/* Project & Cost Center Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Project (Optional)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">-- Standalone / General Dispatch --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client?.name ? `(${p.client.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Cost Center</label>
            <select
              value={selectedCostCenterId}
              onChange={(e) => setSelectedCostCenterId(e.target.value)}
              disabled={loadingOptions || !selectedProjectId}
              className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="">-- General Account --</option>
              {availableFilteredCostCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Primary Assignee & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Primary Technician</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">-- Unassigned (Keep in Dispatch Pool) --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role || 'Technician'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-text-muted font-medium">Dispatch Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
              className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary capitalize font-medium"
            >
              <option value="scheduled">Scheduled</option>
              <option value="dispatched">Dispatched</option>
              <option value="en_route">En Route</option>
              <option value="on_site">On Site</option>
              <option value="completed">Completed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Date & Time Scheduling */}
        <div className="p-3 bg-background-dark border border-border-dark rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">schedule</span>
              Scheduled Date & Time Window
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-text-muted text-xs">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded bg-surface-dark border-border-dark text-primary focus:ring-0"
              />
              All-Day Job
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-text-muted text-[11px]">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 bg-surface-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            {!allDay && (
              <>
                <div className="space-y-1">
                  <label className="block text-text-muted text-[11px]">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-9 px-3 bg-surface-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-text-muted text-[11px]">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-9 px-3 bg-surface-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </>
            )}
          </div>

          {!allDay && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-text-muted text-[11px]">Quick Duration:</span>
              {[1, 2, 4, 8].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSetDuration(h)}
                  className="px-2 py-0.5 rounded bg-surface-dark hover:bg-primary/20 text-text-muted hover:text-primary text-[11px] font-mono border border-border-dark transition-colors"
                >
                  +{h}h
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Site Location */}
        <div className="space-y-1">
          <label className="block text-text-muted font-medium">Site Address / Location</label>
          <input
            type="text"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            placeholder="e.g. 124 Queen Street, Auckland CBD"
            className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        {/* Safety Gate Compliance Toggle */}
        <div className="p-3 rounded-xl bg-card-dark border border-border-dark flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-base">shield_with_heart</span>
              Require Safety Sign-Off (JSA / Take 5)
            </span>
            <p className="text-[11px] text-text-muted">
              Technicians must complete or sign a safety document before starting on-site work.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={requiresSafetyDoc}
              onChange={(e) => setRequiresSafetyDoc(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-text-muted font-medium">Technician Instructions / Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key access codes, specific tools needed, or customer contact notes..."
            className="w-full p-2.5 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Actions Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-border-dark">
          <div>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex items-center gap-1 text-xs"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Schedule Job'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
