import { useState } from 'react'
import { ActivityType } from '@/types'
import ActivityTypeModal from '@/components/ActivityTypeModal'
import ActivityTypeTable from '@/components/ActivityTypeTable'
import { useActivityTypes, useCreateActivityType, useUpdateActivityType, useDeleteActivityType } from '@/hooks/useActivityTypes'

export default function ActivityTypesPage() {
  const { data: activityTypes, isLoading, error } = useActivityTypes()
  const { mutate: createActivityType } = useCreateActivityType()
  const { mutate: updateActivityType } = useUpdateActivityType()
  const { mutate: deleteActivityType } = useDeleteActivityType()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredActivityTypes = activityTypes.filter(
    (at: ActivityType) => at.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200">
        <span className="material-symbols-outlined text-lg mr-2 align-middle">error</span>
        Error loading activity types: {typeof error === 'string' ? error : 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Activity Types</h1>
          <p className="text-text-muted">Manage service categories and pricing</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          New Activity Type
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
        <input
          type="text"
          placeholder="Search activity types..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card-dark border border-border-dark rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary"
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
      <ActivityTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        activityType={selectedActivityType}
      />
    </div>
  )
}
