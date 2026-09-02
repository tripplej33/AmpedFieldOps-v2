import { useState } from 'react'
import type { ActivityType } from '@/types'
import ActivityTypeModal from '@/components/ActivityTypeModal'
import ActivityTypeTable from '@/components/ActivityTypeTable'
import Button from '@/components/ui/Button'
import {
  useActivityTypes,
  useCreateActivityType,
  useUpdateActivityType,
  useDeleteActivityType,
} from '@/hooks/useActivityTypes'

export default function ActivityTypesSection() {
  const { data: activityTypes, isLoading, error } = useActivityTypes()
  const { mutate: createActivityType } = useCreateActivityType()
  const { mutate: updateActivityType } = useUpdateActivityType()
  const { mutate: deleteActivityType } = useDeleteActivityType()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredActivityTypes = (activityTypes || []).filter((at: ActivityType) =>
    at.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
    setSelectedActivityType(null)
    setIsModalOpen(true)
  }

  const handleEdit = (activityType: ActivityType) => {
    setSelectedActivityType(activityType)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this activity type?')) {
      await deleteActivityType(id)
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (selectedActivityType) {
        await updateActivityType(selectedActivityType.id, data)
      } else {
        await createActivityType(data)
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to save activity type:', err)
    }
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-xs">
        <span className="material-symbols-outlined text-lg mr-2 align-middle">error</span>
        Error loading activity types: {typeof error === 'string' ? error : 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-4 rounded-xl border border-border-dark shadow-md">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
            Activity Types & Standard Labor Rates
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure hourly charge-out rate presets ($/hr) and billing codes for timesheet logging
          </p>
        </div>

        <Button onClick={handleAddNew} className="h-[36px] text-xs">
          <span className="material-symbols-outlined text-base">add_circle</span>
          New Activity Type
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
          search
        </span>
        <input
          type="text"
          placeholder="Search activity types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-[36px] pl-8 pr-3 bg-card-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Table */}
      <ActivityTypeTable
        activityTypes={filteredActivityTypes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal */}
      {isModalOpen && (
        <ActivityTypeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          activityType={selectedActivityType}
        />
      )}
    </div>
  )
}
