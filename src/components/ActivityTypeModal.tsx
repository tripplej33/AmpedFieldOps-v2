import { useState, useEffect } from 'react'
import { ActivityType, ActivityTypeFormData } from '@/types'
import Modal from '@/components/ui/Modal'

interface ActivityTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ActivityTypeFormData) => void
  activityType?: ActivityType | null
}

export default function ActivityTypeModal({
  isOpen,
  onClose,
  onSave,
  activityType
}: ActivityTypeModalProps) {
  const [formData, setFormData] = useState<ActivityTypeFormData>({
    name: '',
    default_rate: undefined,
    xero_item_code: '',
    managed_by_xero: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (activityType) {
      setFormData({
        name: activityType.name,
        default_rate: activityType.default_rate || undefined,
        xero_item_code: activityType.xero_item_code || '',
        managed_by_xero: activityType.managed_by_xero
      })
    } else {
      setFormData({
        name: '',
        default_rate: undefined,
        xero_item_code: '',
        managed_by_xero: false
      })
    }
    setErrors({})
  }, [activityType, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Activity type name is required'
    }

    if (formData.default_rate !== undefined && formData.default_rate < 0) {
      newErrors.default_rate = 'Rate must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activityType ? 'Edit Activity Type' : 'New Activity Type'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Activity Type Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., HVAC Service, Electrical Work"
            className={`w-full px-4 py-2 bg-background-dark border rounded-lg text-white placeholder-text-muted focus:outline-none transition-colors ${errors.name ? 'border-red-500' : 'border-border-dark focus:border-primary'
              }`}
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Default Rate */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Default Hourly Rate ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.default_rate ?? ''}
            onChange={e => setFormData({ ...formData, default_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="e.g., 75.00"
            className={`w-full px-4 py-2 bg-background-dark border rounded-lg text-white placeholder-text-muted focus:outline-none transition-colors ${errors.default_rate ? 'border-red-500' : 'border-border-dark focus:border-primary'
              }`}
          />
          {errors.default_rate && <p className="text-red-400 text-sm mt-1">{errors.default_rate}</p>}
        </div>

        {/* Xero Item Code */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Xero Item Code</label>
          <input
            type="text"
            value={formData.xero_item_code || ''}
            onChange={e => setFormData({ ...formData, xero_item_code: e.target.value })}
            placeholder="e.g., AC001 (optional)"
            className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Managed by Xero */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="managed_by_xero"
            checked={formData.managed_by_xero || false}
            onChange={e => setFormData({ ...formData, managed_by_xero: e.target.checked })}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label htmlFor="managed_by_xero" className="text-sm text-white cursor-pointer">
            This activity type is managed by Xero
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border-dark">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border-dark hover:bg-background-dark text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors font-medium"
          >
            {activityType ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
