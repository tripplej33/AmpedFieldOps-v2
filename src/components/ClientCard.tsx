import { useNavigate } from 'react-router-dom'
import { Client } from '../types'

interface ClientCardProps {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export default function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const navigate = useNavigate()
  const isVendor = client.contact_type === 'vendor' || client.is_supplier === true

  return (
    <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-3 shadow-md hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                isVendor
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {isVendor ? 'Vendor' : 'Client'}
            </span>
            {client.xero_contact_id && (
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono">
                Xero
              </span>
            )}
          </div>
          <h3
            onClick={() => navigate(`/app/clients/${client.id}`)}
            className="text-white font-semibold text-sm truncate hover:text-primary cursor-pointer transition-colors"
          >
            {client.name}
          </h3>
          {client.contact_name && <p className="text-text-muted text-xs truncate mt-0.5">{client.contact_name}</p>}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap capitalize border ${
            client.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}
        >
          {client.status}
        </span>
      </div>

      <div className="space-y-1 text-xs text-text-muted">
        {client.email && (
          <p className="truncate">
            <span className="text-[10px] text-text-muted/60">Email:</span> {client.email}
          </p>
        )}
        {client.phone && (
          <p className="truncate">
            <span className="text-[10px] text-text-muted/60">Phone:</span> {client.phone}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border-dark/60">
        <button
          onClick={() => navigate(`/app/clients/${client.id}`)}
          className="flex-1 h-[32px] bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          360° Profile
        </button>
        <button
          onClick={() => onEdit(client)}
          className="h-[32px] px-2.5 bg-background-dark hover:bg-border-dark text-text-muted hover:text-white text-xs rounded-lg transition-colors border border-border-dark"
          title="Edit"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
        </button>
        <button
          onClick={() => onDelete(client)}
          className="h-[32px] px-2.5 bg-background-dark hover:bg-red-500/20 text-text-muted hover:text-red-400 text-xs rounded-lg transition-colors border border-border-dark"
          title="Delete"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </div>
  )
}
