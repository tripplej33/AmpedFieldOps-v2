import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { ProjectSnagFormData, Project, CostCenter, SnagPriority } from '@/types'
import type { User } from '@/hooks/useUsers'

interface SnagModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectSnagFormData) => Promise<void>
  project: Project
  costCenters: CostCenter[]
  users: User[]
  isPending?: boolean
}

export default function SnagModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  costCenters,
  users,
  isPending = false,
}: SnagModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [priority, setPriority] = useState<SnagPriority>('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) // 7 days default
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await onSubmit({
      project_id: project.id,
      cost_center_id: costCenterId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      priority,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Quality Snag: ${project.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Title */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">
            Snag / Defect Title <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Master Ensuite GPO plate crooked, Kitchen downlight flicker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          />
        </div>

        {/* Priority Segment: Low | Medium | High | Urgent */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Defect Priority / Severity</label>
          <div className="grid grid-cols-4 gap-1.5 bg-background-dark p-1 rounded-lg border border-border-dark">
            {(['low', 'medium', 'high', 'urgent'] as SnagPriority[]).map((p) => {
              const isSelected = priority === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 rounded text-xs font-semibold capitalize transition-all ${
                    isSelected
                      ? p === 'urgent'
                        ? 'bg-red-600 text-white shadow-sm'
                        : p === 'high'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Location & Cost Center */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Site Location / Zone</label>
            <input
              type="text"
              placeholder="e.g. Level 2 DB-A, Master Bedroom Ensuite"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Allocated Cost Center</label>
            <select
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">General Project Scope</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee & Expiry / Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Assigned Technician</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">Unassigned (Any Available Technician)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Rectification Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Description / Rectification Details */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Defect Notes & Rectification Instructions</label>
          <textarea
            rows={2}
            placeholder="Explain what needs to be fixed and materials required..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white resize-none focus:outline-none focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] px-4 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white font-medium"
          >
            Cancel
          </button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? 'Logging Snag...' : 'Create Snag Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
