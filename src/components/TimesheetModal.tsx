import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import TimesheetFileUploader from './files/TimesheetFileUploader'
import Toast from './ui/Toast'
import { useGeolocation, calculateTravelBilling } from '@/hooks/useGeolocation'
import type { BulkTimesheetFormData, Project, CostCenter, ActivityType, TimesheetEntryData, ProjectFile, Timesheet } from '@/types'
import type { User } from '@/hooks/useUsers'

interface TimesheetModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveDraft: (data: BulkTimesheetFormData) => Promise<void>
  onSubmitForApproval: (data: BulkTimesheetFormData) => Promise<void>
  projects: Project[]
  costCenters: CostCenter[]
  activityTypes: ActivityType[]
  users: User[]
  isPending?: boolean
  initialDate?: string
  initialProjectId?: string
  initialUserId?: string
  initialStartTime?: string
  timesheet?: Timesheet
  isAdmin?: boolean
  onUnapprove?: (id: string) => Promise<void> | void
}

interface UserEntry {
  userId: string
  hours: number
  notes: string
}

interface ActivityTypeSection {
  activityTypeId: string
  expanded: boolean
  userEntries: UserEntry[]
}

export default function TimesheetModal({
  isOpen,
  onClose,
  onSaveDraft,
  onSubmitForApproval,
  projects,
  costCenters,
  activityTypes,
  users,
  isPending,
  initialDate,
  initialProjectId,
  initialUserId,
  initialStartTime,
  timesheet,
  isAdmin = false,
  onUnapprove,
}: TimesheetModalProps) {
  const [isUnlockedByAdmin, setIsUnlockedByAdmin] = useState(false)
  const isApproved = timesheet?.status === 'approved' && !isUnlockedByAdmin
  const [entryMode, setEntryMode] = useState<'single' | 'crew'>('single')
  const [projectId, setProjectId] = useState(initialProjectId || '')
  const [costCenterId, setCostCenterId] = useState<string | undefined>()
  const [entryDate, setEntryDate] = useState(initialDate || new Date().toISOString().slice(0, 10))
  
  // Single Entry State
  const [singleUserId, setSingleUserId] = useState(initialUserId || '')
  const [singleActivityId, setSingleActivityId] = useState('')
  const [singleStartTime, setSingleStartTime] = useState(initialStartTime || '')
  const [singleEndTime, setSingleEndTime] = useState('')
  const [singleBreakMinutes, setSingleBreakMinutes] = useState<number>(0)
  const [singleHours, setSingleHours] = useState<number>(8)
  const [singleNotes, setSingleNotes] = useState('')

  // Geolocation & Travel Distance Billing
  const { getCurrentLocation, loading: geoLoading } = useGeolocation()
  const [isTravelCalcOpen, setIsTravelCalcOpen] = useState(false)
  const [travelDistanceKm, setTravelDistanceKm] = useState<number>(0)
  const [travelTimeMins, setTravelTimeMins] = useState<number>(0)
  const [ratePerKm, setRatePerKm] = useState<number>(0.95)

  // Crew / Multi-User Sections
  const [activitySections, setActivitySections] = useState<ActivityTypeSection[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleCaptureGPS = async () => {
    try {
      const coords = await getCurrentLocation()
      const gpsStamp = `📍 GPS Location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy || 0)}m)`
      setSingleNotes((prev) => (prev ? `${prev}\n${gpsStamp}` : gpsStamp))
      setToast({ type: 'success', message: 'Current GPS location tagged to timesheet' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to capture GPS' })
    }
  }

  const handleApplyTravelBilling = () => {
    const billing = calculateTravelBilling({
      distanceKm: travelDistanceKm,
      travelTimeMinutes: travelTimeMins,
      ratePerKm,
      hourlyRate: 85,
    })
    const travelSummary = `🚗 Billable Travel: ${billing.distanceKm} km ($${billing.mileageCost.toFixed(2)}) + ${billing.travelTimeMinutes} mins travel ($${billing.laborTravelCost.toFixed(2)}) | Total: $${billing.totalTravelCharge.toFixed(2)}`
    setSingleNotes((prev) => (prev ? `${prev}\n${travelSummary}` : travelSummary))
    setIsTravelCalcOpen(false)
    setToast({ type: 'success', message: `Applied $${billing.totalTravelCharge.toFixed(2)} travel charge to notes` })
  }

  const handleTimeChange = (start: string, end: string, breakMins: number) => {
    setSingleStartTime(start)
    setSingleEndTime(end)
    setSingleBreakMinutes(breakMins)
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const startMinutes = (sh || 0) * 60 + (sm || 0)
      let endMinutes = (eh || 0) * 60 + (em || 0)
      if (endMinutes > startMinutes) {
        const totalNetMinutes = Math.max(15, endMinutes - startMinutes - (breakMins || 0))
        setSingleHours(Math.round((totalNetMinutes / 60) * 100) / 100)
      }
    }
  }

  useEffect(() => {
    if (timesheet) {
      setProjectId(timesheet.project_id || '')
      setCostCenterId(timesheet.cost_center_id || undefined)
      setEntryDate(timesheet.entry_date)
      setSingleUserId(timesheet.user_id)
      setSingleActivityId(timesheet.activity_type_id || '')
      setSingleStartTime(timesheet.start_time || '')
      setSingleEndTime(timesheet.end_time || '')
      setSingleBreakMinutes(timesheet.break_minutes || 0)
      setSingleHours(Number(timesheet.hours) || 8)
      setSingleNotes(timesheet.notes || '')
      setEntryMode('single')
    } else {
      if (initialDate) setEntryDate(initialDate)
      if (initialProjectId) setProjectId(initialProjectId)
      if (initialUserId) setSingleUserId(initialUserId)
      if (initialStartTime) {
        setSingleStartTime(initialStartTime)
        const [sh, sm] = initialStartTime.split(':').map(Number)
        const endHour = Math.min(23, (sh || 8) + 8)
        setSingleEndTime(`${String(endHour).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`)
        setSingleHours(8)
      }
    }
  }, [timesheet, initialDate, initialProjectId, initialUserId, initialStartTime, isOpen])

  useEffect(() => {
    if (!projectId) {
      setCostCenterId(undefined)
    }
  }, [projectId])

  const filteredCostCenters = costCenters.filter((c) => !projectId || c.project_id === projectId)

  // Calculate live total hours
  const liveTotalHours =
    entryMode === 'single'
      ? Number(singleHours) || 0
      : activitySections.reduce(
          (sum, sec) =>
            sum + sec.userEntries.reduce((sub, u) => sub + (Number(u.hours) || 0), 0),
          0
        )

  // Crew handlers
  const handleAddActivityType = (activityTypeId: string) => {
    if (activitySections.find((s) => s.activityTypeId === activityTypeId)) return
    setActivitySections([
      ...activitySections,
      {
        activityTypeId,
        expanded: true,
        userEntries: [{ userId: '', hours: 8, notes: '' }],
      },
    ])
  }

  const handleToggleSection = (index: number) => {
    setActivitySections(
      activitySections.map((section, i) =>
        i === index ? { ...section, expanded: !section.expanded } : section
      )
    )
  }

  const handleRemoveSection = (index: number) => {
    setActivitySections(activitySections.filter((_, i) => i !== index))
  }

  const handleAddUser = (sectionIndex: number) => {
    setActivitySections(
      activitySections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              userEntries: [...section.userEntries, { userId: '', hours: 8, notes: '' }],
            }
          : section
      )
    )
  }

  const handleRemoveUser = (sectionIndex: number, entryIndex: number) => {
    setActivitySections(
      activitySections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              userEntries: section.userEntries.filter((_, j) => j !== entryIndex),
            }
          : section
      )
    )
  }

  const handleUserChange = (
    sectionIndex: number,
    entryIndex: number,
    field: keyof UserEntry,
    value: string | number
  ) => {
    setActivitySections(
      activitySections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              userEntries: section.userEntries.map((entry, j) =>
                j === entryIndex ? { ...entry, [field]: value } : entry
              ),
            }
          : section
      )
    )
  }

  const validateAndPrepareData = (): BulkTimesheetFormData | null => {
    const newErrors: Record<string, string> = {}

    if (!projectId) newErrors.project = 'Project is required'
    if (!entryDate) newErrors.date = 'Date is required'

    const entries: TimesheetEntryData[] = []

    if (entryMode === 'single') {
      if (!singleUserId) newErrors.user = 'Technician is required'
      if (!singleActivityId) newErrors.activity = 'Activity type is required'
      if (!singleHours || singleHours < 0.25 || singleHours > 24) {
        newErrors.hours = 'Hours must be between 0.25 and 24'
      }

      if (singleUserId && singleActivityId && singleHours >= 0.25) {
        entries.push({
          activity_type_id: singleActivityId,
          user_id: singleUserId,
          hours: singleHours,
          start_time: singleStartTime || undefined,
          end_time: singleEndTime || undefined,
          break_minutes: singleBreakMinutes || 0,
          notes: singleNotes || undefined,
        })
      }
    } else {
      if (activitySections.length === 0) {
        newErrors.activities = 'At least one activity type is required'
      }

      activitySections.forEach((section, sIdx) => {
        if (section.userEntries.length === 0) {
          newErrors[`activity_${sIdx}`] = 'At least one user is required for each activity'
        }
        section.userEntries.forEach((userEntry, uIdx) => {
          if (!userEntry.userId) {
            newErrors[`user_${sIdx}_${uIdx}`] = 'User is required'
          }
          if (userEntry.hours < 0.25 || userEntry.hours > 24) {
            newErrors[`hours_${sIdx}_${uIdx}`] = 'Hours must be between 0.25 and 24'
          }
          if (userEntry.userId && userEntry.hours >= 0.25) {
            entries.push({
              activity_type_id: section.activityTypeId,
              user_id: userEntry.userId,
              hours: userEntry.hours,
              notes: userEntry.notes || undefined,
            })
          }
        })
      })
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return null

    return {
      project_id: projectId,
      cost_center_id: costCenterId,
      entry_date: entryDate,
      entries,
    }
  }

  const handleSave = async () => {
    const data = validateAndPrepareData()
    if (!data) return
    await onSaveDraft(data)
    handleReset()
  }

  const handleSubmit = async () => {
    const data = validateAndPrepareData()
    if (!data) return
    await onSubmitForApproval(data)
    handleReset()
  }

  const handleReset = () => {
    setProjectId('')
    setCostCenterId(undefined)
    setEntryDate(new Date().toISOString().slice(0, 10))
    setSingleUserId('')
    setSingleActivityId('')
    setSingleHours(8)
    setSingleNotes('')
    setActivitySections([])
    setErrors({})
    setUploadedFiles([])
    onClose()
  }

  const availableActivityTypes = activityTypes.filter(
    (at) => !activitySections.find((s) => s.activityTypeId === at.id)
  )

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title={isApproved ? "View / Update Approved Timesheet" : "Record Field Timesheet"}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Approved Timesheet Lock Alert Banner */}
        {timesheet?.status === 'approved' && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-emerald-400 shrink-0">verified_user</span>
              <div>
                <p className="font-bold text-white">
                  Approved Record {isUnlockedByAdmin ? '(Unlocked by Administrator)' : '(Hours Locked)'}
                </p>
                <p className="text-[11px] text-emerald-200/90 mt-0.5">
                  {isUnlockedByAdmin
                    ? 'You have administrative override privileges to edit hours, date, and technician on this timesheet.'
                    : 'Hours and work dates are locked on approved timesheets to protect payroll and customer invoices.'}
                </p>
              </div>
            </div>
            {isAdmin && !isUnlockedByAdmin && (
              <Button
                type="button"
                variant="secondary"
                className="text-xs shrink-0 bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                onClick={async () => {
                  if (onUnapprove && timesheet?.id) {
                    await onUnapprove(timesheet.id)
                  }
                  setIsUnlockedByAdmin(true)
                }}
              >
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span>Unapprove & Unlock</span>
              </Button>
            )}
          </div>
        )}

        {/* Mode Switcher + Total Hours Header */}
        {!isApproved && (
          <div className="flex items-center justify-between pb-3 border-b border-border-dark flex-wrap gap-2">
            <div className="flex p-1 bg-background-dark rounded-lg border border-border-dark">
              <button
                type="button"
                onClick={() => setEntryMode('single')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  entryMode === 'single'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">person</span>
                Single Entry
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('crew')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  entryMode === 'crew'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">group</span>
                Crew / Multi-User
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary">
              <span className="material-symbols-outlined text-sm">timelapse</span>
              <span>Total:</span>
              <span className="font-mono text-sm text-white">{liveTotalHours.toFixed(1)} hrs</span>
            </div>
          </div>
        )}

        {/* Core Metadata: Date, Project, Cost Center */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-4 border-b border-border-dark">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">Work Date</label>
            <input
              type="date"
              disabled={isApproved}
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {errors.date && <p className="text-[11px] text-red-400">{errors.date}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.project && <p className="text-[11px] text-red-400">{errors.project}</p>}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">
              Cost Center <span className="text-text-muted/60">(Optional)</span>
            </label>
            <select
              value={costCenterId || ''}
              onChange={(e) => setCostCenterId(e.target.value || undefined)}
              className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
              disabled={!projectId}
            >
              <option value="">General Project / No Specific Cost Center</option>
              {filteredCostCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.customer_po_number ? `(PO: ${c.customer_po_number})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MODE 1: SINGLE ENTRY */}
        {entryMode === 'single' && (
          <div className="space-y-3.5 bg-background-dark/50 p-3.5 rounded-xl border border-border-dark">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-muted">Technician</label>
                <select
                  value={singleUserId}
                  onChange={(e) => setSingleUserId(e.target.value)}
                  className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Select technician...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
                {errors.user && <p className="text-[11px] text-red-400">{errors.user}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-muted">Activity Type</label>
                <select
                  disabled={isApproved}
                  value={singleActivityId}
                  onChange={(e) => setSingleActivityId(e.target.value)}
                  className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Select activity...</option>
                  {activityTypes.map((at) => (
                    <option key={at.id} value={at.id}>
                      {at.name}
                    </option>
                  ))}
                </select>
                {errors.activity && <p className="text-[11px] text-red-400">{errors.activity}</p>}
              </div>
            </div>

            {/* Start / Stop Time Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-background-dark/80 rounded-xl border border-border-dark/60">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">Start Time (Optional)</label>
                <input
                  type="time"
                  disabled={isApproved}
                  value={singleStartTime}
                  onChange={(e) => handleTimeChange(e.target.value, singleEndTime, singleBreakMinutes)}
                  className="w-full h-[36px] px-2.5 py-1 bg-card-dark border border-border-dark rounded-lg text-xs font-mono text-white focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">Stop Time (Optional)</label>
                <input
                  type="time"
                  disabled={isApproved}
                  value={singleEndTime}
                  onChange={(e) => handleTimeChange(singleStartTime, e.target.value, singleBreakMinutes)}
                  className="w-full h-[36px] px-2.5 py-1 bg-card-dark border border-border-dark rounded-lg text-xs font-mono text-white focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">Unpaid Break (Mins)</label>
                <input
                  type="number"
                  disabled={isApproved}
                  min={0}
                  step={15}
                  value={singleBreakMinutes}
                  onChange={(e) =>
                    handleTimeChange(singleStartTime, singleEndTime, parseInt(e.target.value) || 0)
                  }
                  className="w-full h-[36px] px-2.5 py-1 bg-card-dark border border-border-dark rounded-lg text-xs font-mono text-white focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">
                Total Hours Logged {isApproved && <span className="text-emerald-400 font-bold">(Locked)</span>}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={isApproved}
                  step={0.25}
                  min={0.25}
                  max={24}
                  value={singleHours}
                  onChange={(e) => setSingleHours(parseFloat(e.target.value) || 0)}
                  className="w-32 h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {/* Quick hour presets (Only if not approved) */}
                {!isApproved && (
                  <div className="flex items-center gap-1.5">
                    {[4, 7.5, 8, 10].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSingleHours(h)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          singleHours === h
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-card-dark border-border-dark text-text-muted hover:text-white'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.hours && <p className="text-[11px] text-red-400">{errors.hours}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-text-muted">Work Notes / Scope Details</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureGPS}
                    disabled={geoLoading}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 transition-colors"
                    title="Capture device GPS location"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {geoLoading ? 'sync' : 'location_on'}
                    </span>
                    {geoLoading ? 'Acquiring...' : 'Tag GPS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTravelCalcOpen(!isTravelCalcOpen)}
                    className="text-[11px] text-primary hover:text-primary-light flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded border border-primary/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">directions_car</span>
                    Travel Billing
                  </button>
                </div>
              </div>

              {/* Travel Billing Assistant Drawer */}
              {isTravelCalcOpen && (
                <div className="p-3 rounded-xl bg-background-dark/90 border border-primary/30 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-white border-b border-border-dark pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-sm">route</span>
                      Job Travel & Mileage Billing
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Est: ${calculateTravelBilling({ distanceKm: travelDistanceKm, travelTimeMinutes: travelTimeMins, ratePerKm, hourlyRate: 85 }).totalTravelCharge.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-text-muted block mb-0.5">Distance (km)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={travelDistanceKm || ''}
                        onChange={(e) => setTravelDistanceKm(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 24.5"
                        className="w-full h-8 px-2 bg-card-dark border border-border-dark rounded text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block mb-0.5">Travel Time (mins)</label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={travelTimeMins || ''}
                        onChange={(e) => setTravelTimeMins(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 30"
                        className="w-full h-8 px-2 bg-card-dark border border-border-dark rounded text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block mb-0.5">Km Rate ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.05}
                        value={ratePerKm}
                        onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0.95)}
                        className="w-full h-8 px-2 bg-card-dark border border-border-dark rounded text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsTravelCalcOpen(false)}
                      className="px-2 py-1 text-[11px] text-text-muted hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyTravelBilling}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded hover:bg-primary/90 transition-colors"
                    >
                      Apply to Notes
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                placeholder="Describe field tasks performed, materials installed, or inspection results..."
                rows={3}
                className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        )}

        {/* MODE 2: CREW / MULTI-USER ENTRY */}
        {entryMode === 'crew' && (
          <div className="space-y-3.5">
            {/* Add Activity Type Combobox */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">Add Activity Group</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddActivityType(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full h-[38px] px-3 py-2 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="">+ Choose an activity type to add crew entries...</option>
                {availableActivityTypes.map((at) => (
                  <option key={at.id} value={at.id}>
                    {at.name}
                  </option>
                ))}
              </select>
              {errors.activities && <p className="text-[11px] text-red-400">{errors.activities}</p>}
            </div>

            {/* Activity Type Sections */}
            <div className="space-y-3">
              {activitySections.map((section, sIdx) => {
                const activityType = activityTypes.find((at) => at.id === section.activityTypeId)
                return (
                  <div key={sIdx} className="border border-border-dark rounded-xl overflow-hidden bg-card-dark shadow-sm">
                    <div
                      className="flex items-center justify-between p-3 bg-background-dark/60 cursor-pointer hover:bg-background-dark transition-colors"
                      onClick={() => handleToggleSection(sIdx)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-primary">
                          {section.expanded ? 'expand_more' : 'chevron_right'}
                        </span>
                        <span className="font-semibold text-xs text-white">{activityType?.name || 'Activity'}</span>
                        <span className="text-[11px] text-text-muted">
                          ({section.userEntries.length} {section.userEntries.length === 1 ? 'member' : 'members'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveSection(sIdx)
                        }}
                        className="text-text-muted hover:text-red-400 p-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>

                    {section.expanded && (
                      <div className="p-3 space-y-2.5 bg-card-dark">
                        {section.userEntries.map((userEntry, uIdx) => (
                          <div key={uIdx} className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <select
                                  value={userEntry.userId}
                                  onChange={(e) => handleUserChange(sIdx, uIdx, 'userId', e.target.value)}
                                  className="w-full h-[36px] px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                                >
                                  <option value="">Select user...</option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.full_name || u.email}
                                    </option>
                                  ))}
                                </select>
                                {errors[`user_${sIdx}_${uIdx}`] && (
                                  <p className="text-[10px] text-red-400 mt-0.5">{errors[`user_${sIdx}_${uIdx}`]}</p>
                                )}
                              </div>
                              <div>
                                <input
                                  type="number"
                                  step={0.25}
                                  min={0.25}
                                  max={24}
                                  value={userEntry.hours}
                                  onChange={(e) =>
                                    handleUserChange(sIdx, uIdx, 'hours', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full h-[36px] px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs font-mono text-white focus:outline-none focus:border-primary"
                                  placeholder="Hours"
                                />
                                {errors[`hours_${sIdx}_${uIdx}`] && (
                                  <p className="text-[10px] text-red-400 mt-0.5">{errors[`hours_${sIdx}_${uIdx}`]}</p>
                                )}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={userEntry.notes}
                                  onChange={(e) => handleUserChange(sIdx, uIdx, 'notes', e.target.value)}
                                  className="w-full h-[36px] px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                                  placeholder="Notes (optional)"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(sIdx, uIdx)}
                              className="text-text-muted hover:text-red-400 p-1.5 mt-0.5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddUser(sIdx)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold pt-1"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          Add Team Member
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* File Attachments */}
        {projectId && (
          <div className="border-t border-border-dark pt-3.5">
            <label className="block text-xs font-medium text-text-muted mb-2">Supporting Receipts / Attachments</label>
            <TimesheetFileUploader
              projectId={projectId}
              costCenterId={costCenterId}
              onUploadComplete={(file) => {
                setUploadedFiles([...uploadedFiles, file])
                setToast({ type: 'success', message: `${file.name} attached!` })
              }}
              onError={(err) => setToast({ type: 'error', message: err })}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-dark">
          <Button variant="secondary" onClick={handleReset}>
            Cancel
          </Button>
          {isApproved ? (
            <Button onClick={handleSave} disabled={isPending}>
              <span className="material-symbols-outlined text-sm">save</span>
              Save Notes & Attachments
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleSave} disabled={isPending}>
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </Modal>
  )
}
