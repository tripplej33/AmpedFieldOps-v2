import { Client } from '../types'

interface ClientCardProps {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export default function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-white font-semibold">
            {client.first_name} {client.last_name}
          </h3>
          {client.company && <p className="text-text-muted text-sm">{client.company}</p>}
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            client.status === 'active'
              ? 'bg-green-900/30 text-green-400'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {client.status === 'active' ? '✓ Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-text-muted">
        {client.email && (
          <p>
            <span className="text-xs text-gray-400">Email:</span> {client.email}
          </p>
        )}
        {client.phone && (
          <p>
            <span className="text-xs text-gray-400">Phone:</span> {client.phone}
          </p>
        )}
        {client.city && (
          <p>
            <span className="text-xs text-gray-400">City:</span> {client.city}
            {client.state_province && `, ${client.state_province}`}
          </p>
        )}
      </div>

      {client.notes && (
        <div className="bg-background-dark rounded p-2 text-xs text-text-muted border border-border-dark/50">
          <p className="text-gray-400 mb-1">Notes:</p>
          <p>{client.notes.substring(0, 100)}{client.notes.length > 100 ? '...' : ''}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border-dark">
        <button
          onClick={() => onEdit(client)}
          className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(client)}
          className="flex-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
