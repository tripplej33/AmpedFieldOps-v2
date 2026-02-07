import { Client } from '../types'

interface ClientTableProps {
  clients: Client[]
  isLoading: boolean
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export default function ClientTable({ clients, isLoading, onEdit, onDelete }: ClientTableProps) {
  if (isLoading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading clients...</p>
        </div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-white text-lg font-semibold mb-2">No clients found</p>
          <p className="text-text-muted">Start by creating your first client</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-dark">
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Contact Person</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted font-display uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dark">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-card-dark transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="text-white font-medium">
                  {client.name}
                </p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="text-text-muted text-sm">{client.contact_name || '—'}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="text-text-muted text-sm">{client.email || '—'}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="text-text-muted text-sm">{client.phone || '—'}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.status === 'active'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-gray-700 text-gray-300'
                    }`}
                >
                  {client.status === 'active' ? '✓ Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(client)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
