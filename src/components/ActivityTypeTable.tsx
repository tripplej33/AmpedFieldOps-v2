import { ActivityType } from '@/types'
import Spinner from '@/components/ui/Spinner'

interface ActivityTypeTableProps {
  activityTypes: ActivityType[]
  isLoading: boolean
  onEdit: (activityType: ActivityType) => void
  onDelete: (id: string) => void
}

export default function ActivityTypeTable({
  activityTypes,
  isLoading,
  onEdit,
  onDelete
}: ActivityTypeTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (activityTypes.length === 0) {
    return (
      <div className="bg-card-dark rounded-xl border border-border-dark p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-text-muted mb-4">category</span>
        <h3 className="text-lg font-semibold text-white mb-2">No Activity Types</h3>
        <p className="text-text-muted">Create your first activity type to get started</p>
      </div>
    )
  }

  return (
    <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-dark bg-background-dark/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-text-muted">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text-muted">Default Rate</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text-muted">Xero Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text-muted">Managed by Xero</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {activityTypes.map(at => (
              <tr key={at.id} className="hover:bg-background-dark/20 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-white">{at.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-text-muted">${(at.default_rate || 0).toFixed(2)}/hr</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-text-muted">{at.xero_item_code || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 text-sm ${
                      at.managed_by_xero ? 'text-green-400' : 'text-text-muted'
                    }`}
                  >
                    {at.managed_by_xero ? (
                      <>
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Yes
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">circle</span>
                        No
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(at)}
                      className="p-2 hover:bg-background-dark rounded-lg text-text-muted hover:text-white transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => onDelete(at.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-border-dark">
        {activityTypes.map(at => (
          <div key={at.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-white">{at.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(at)}
                  className="p-2 hover:bg-background-dark rounded-lg text-text-muted hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  onClick={() => onDelete(at.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-text-muted">Rate:</span> <span className="text-white font-medium">${(at.default_rate || 0).toFixed(2)}/hr</span>
              </p>
              <p>
                <span className="text-text-muted">Xero Code:</span> <span className="text-white font-medium">{at.xero_item_code || '—'}</span>
              </p>
              <p>
                <span className="text-text-muted">Xero Managed:</span>{' '}
                <span className={at.managed_by_xero ? 'text-green-400' : 'text-text-muted'}>
                  {at.managed_by_xero ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
