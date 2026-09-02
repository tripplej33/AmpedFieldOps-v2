import { useNavigate } from 'react-router-dom'
import { Client } from '../types'

interface ClientTableProps {
  clients: Client[]
  isLoading: boolean
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export default function ClientTable({ clients, isLoading, onEdit, onDelete }: ClientTableProps) {
  const navigate = useNavigate()

  if (isLoading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-xs">Loading directory...</p>
        </div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-text-muted/40 mb-2">contacts</span>
          <p className="text-white text-base font-semibold mb-1">No contacts found</p>
          <p className="text-text-muted text-xs">Adjust your search/type filters or create a new client</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
          <tr>
            <th className="px-5 py-3.5">Name & Organization</th>
            <th className="px-5 py-3.5">Type</th>
            <th className="px-5 py-3.5">Contact Person</th>
            <th className="px-5 py-3.5">Email & Phone</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dark/60 text-white">
          {clients.map((client) => {
            const isVendor = client.contact_type === 'vendor' || client.is_supplier === true
            return (
              <tr key={client.id} className="hover:bg-background-dark/40 transition-colors group">
                {/* Name & Xero Tag */}
                <td className="px-5 py-3.5">
                  <div
                    onClick={() => navigate(`/app/clients/${client.id}`)}
                    className="cursor-pointer font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span
                      className={`material-symbols-outlined text-base ${
                        isVendor ? 'text-amber-400' : 'text-primary'
                      }`}
                    >
                      {isVendor ? 'storefront' : 'domain'}
                    </span>
                    <span className="truncate max-w-[200px]">{client.name}</span>
                    {client.xero_contact_id && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono shrink-0">
                        Xero
                      </span>
                    )}
                  </div>
                </td>

                {/* Contact Type Pill */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isVendor
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    <span>{isVendor ? 'Vendor' : 'Client'}</span>
                  </span>
                </td>

                {/* Contact Name */}
                <td className="px-5 py-3.5 text-text-muted">{client.contact_name || '—'}</td>

                {/* Email & Phone */}
                <td className="px-5 py-3.5 text-text-muted">
                  <div className="truncate max-w-[180px]">{client.email || '—'}</div>
                  {client.phone && <div className="text-[10px] text-text-muted/70 mt-0.5">{client.phone}</div>}
                </td>

                {/* Status */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                      client.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {client.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/app/clients/${client.id}`)}
                      className="px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                    >
                      360° Profile
                    </button>
                    <button
                      onClick={() => onEdit(client)}
                      className="p-1 text-text-muted hover:text-white transition-colors"
                      title="Quick Edit"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => onDelete(client)}
                      className="p-1 text-text-muted hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
