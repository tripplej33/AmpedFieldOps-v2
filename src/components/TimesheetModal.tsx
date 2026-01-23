import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import TimesheetFileUploader from './files/TimesheetFileUploader'
import Toast from './ui/Toast'
import type { BulkTimesheetFormData, Project, CostCenter, ActivityType, TimesheetEntryData, ProjectFile } from '@/types'
import type { User } from '@/hooks/useUsers'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'

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
}: TimesheetModalProps) {
  const [projectId, setProjectId] = useState('')
  const [costCenterId, setCostCenterId] = useState<string | undefined>()
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [activitySections, setActivitySections] = useState<ActivityTypeSection[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!projectId) {
      setCostCenterId(undefined)
    }
  }, [projectId])

  const filteredCostCenters = costCenters.filter((c) => !projectId || c.project_id === projectId)

  const handleAddActivityType = (activityTypeId: string) => {
    if (activitySections.find((s) => s.activityTypeId === activityTypeId)) {
      return // Already added
    }
    setActivitySections([
      ...activitySections,
      {
        activityTypeId,
        expanded: true,
        userEntries: [],
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
              userEntries: [...section.userEntries, { userId: '', hours: 1, notes: '' }],
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

  const handleUserChange = (sectionIndex: number, entryIndex: number, field: keyof UserEntry, value: string | number) => {
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
    if (activitySections.length === 0) newErrors.activities = 'At least one activity type is required'

    const entries: TimesheetEntryData[] = []
    activitySections.forEach((section, sIdx) => {
      if (section.userEntries.length === 0) {
        newErrors[`activity_${sIdx}`] = 'At least one user is required for each activity type'
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
    setActivitySections([])
    setErrors({})
    setUploadedFiles([])
    onClose()
  }

  const availableActivityTypes = activityTypes.filter(
    (at) => !activitySections.find((s) => s.activityTypeId === at.id)
  )

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title="Multi-User Timesheet Entry">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border-dark">
          <div>
            <label className="block text-sm text-text-muted mb-2">Entry Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white"
            />
            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-2">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white"
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.project && <p className="text-xs text-red-400 mt-1">{errors.project}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-text-muted mb-2">Cost Center (optional)</label>
            <select
              value={costCenterId || ''}
              onChange={(e) => setCostCenterId(e.target.value || undefined)}
              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white"
              disabled={!projectId}
            >
              <option value="">None</option>
              {filteredCostCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Type Selector */}
        <div>
          <label className="block text-sm text-text-muted mb-2">Add Activity Type</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddActivityType(e.target.value)
                e.target.value = ''
              }
            }}
            className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white"
          >
            <option value="">Select an activity type to add...</option>
            {availableActivityTypes.map((at) => (
              <option key={at.id} value={at.id}>
                {at.name}
              </option>
            ))}
          </select>
          {errors.activities && <p className="text-xs text-red-400 mt-1">{errors.activities}</p>}
        </div>

        {/* Activity Type Sections */}
        <div className="space-y-3">
          {activitySections.map((section, sIdx) => {
            const activityType = activityTypes.find((at) => at.id === section.activityTypeId)
            return (
              <div key={sIdx} className="border border-border-dark rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-card-dark cursor-pointer hover:bg-opacity-80"
                  onClick={() => handleToggleSection(sIdx)}
                >
                  <div className="flex items-center gap-2">
                    {section.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <span className="font-medium">{activityType?.name || 'Unknown Activity'}</span>
                    <span className="text-xs text-text-muted">
                      ({section.userEntries.length} {section.userEntries.length === 1 ? 'user' : 'users'})
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveSection(sIdx)
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {section.expanded && (
                  <div className="p-3 space-y-3 bg-background-dark">
                    {section.userEntries.map((userEntry, uIdx) => (
                      <div key={uIdx} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <select
                              value={userEntry.userId}
                              onChange={(e) => handleUserChange(sIdx, uIdx, 'userId', e.target.value)}
                              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white text-sm"
                            >
                              <option value="">Select user...</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.full_name}
                                </option>
                              ))}
                            </select>
                            {errors[`user_${sIdx}_${uIdx}`] && (
                              <p className="text-xs text-red-400 mt-1">{errors[`user_${sIdx}_${uIdx}`]}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="number"
                              step={0.25}
                              min={0.25}
                              max={24}
                              value={userEntry.hours}
                              onChange={(e) => handleUserChange(sIdx, uIdx, 'hours', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white text-sm"
                              placeholder="Hours"
                            />
                            {errors[`hours_${sIdx}_${uIdx}`] && (
                              <p className="text-xs text-red-400 mt-1">{errors[`hours_${sIdx}_${uIdx}`]}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="text"
                              value={userEntry.notes}
                              onChange={(e) => handleUserChange(sIdx, uIdx, 'notes', e.target.value)}
                              className="w-full px-3 py-2 bg-card-dark border border-border-dark rounded text-white text-sm"
                              placeholder="Notes (optional)"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(sIdx, uIdx)}
                          className="text-red-400 hover:text-red-300 mt-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddUser(sIdx)}
                      className="flex items-center gap-1 text-sm text-primary hover:text-blue-400"
                    >
                      <Plus size={16} />
                      Add User
                    </button>

                    {errors[`activity_${sIdx}`] && (
                      <p className="text-xs text-red-400">{errors[`activity_${sIdx}`]}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* File Upload Section */}
        {projectId && (
          <div className="border-t border-border-dark pt-4">
            <label className="block text-sm text-text-muted mb-3">Attach Supporting Documents</label>
            <TimesheetFileUploader
              projectId={projectId}
              costCenterId={costCenterId}
              onUploadComplete={(file) => {
                setUploadedFiles([...uploadedFiles, file])
                setToast({ type: 'success', message: `${file.name} uploaded successfully` })
              }}
              onError={(error) => {
                setToast({ type: 'error', message: error })
              }}
            />
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-text-muted">{uploadedFiles.length} file{uploadedFiles.length === 1 ? '' : 's'} attached</p>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/30 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">check_circle</span>
                      <span className="text-white truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(uploadedFiles.filter((f) => f.id !== file.id))}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-dark">
          <Button variant="secondary" onClick={handleReset}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={isPending}>
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            Submit for Approval
          </Button>
        </div>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </Modal>
  )
}
