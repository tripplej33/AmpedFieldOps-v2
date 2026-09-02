import { useState } from 'react'
import Button from '@/components/ui/Button'
import ProjectContactModal from './ProjectContactModal'
import type { ProjectContact, ProjectContactFormData } from '@/types'

interface ProjectContactsListProps {
  contacts: ProjectContact[]
  loading: boolean
  onAddContact: (data: ProjectContactFormData) => Promise<void>
  onUpdateContact: (id: string, data: Partial<ProjectContactFormData>) => Promise<void>
  onDeleteContact: (id: string) => Promise<void>
}

export default function ProjectContactsList({
  contacts,
  loading,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}: ProjectContactsListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null)
  const [search, setSearch] = useState('')

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.role_title.toLowerCase().includes(term) ||
      (c.company_name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.mobile || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-3.5 rounded-xl border border-border-dark">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search site contacts, roles, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="h-[36px] text-xs">
          <span className="material-symbols-outlined text-base">person_add</span>
          Add Site Contact
        </Button>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-text-muted">Loading site contacts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            contact_phone
          </span>
          <p className="text-white text-sm font-medium">No site contacts recorded for this job</p>
          <p className="text-xs text-text-muted mt-1">
            Add site managers, project directors, engineers, and key emergency contacts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((c) => {
            const initial = c.name.charAt(0).toUpperCase()

            return (
              <div
                key={c.id}
                className={`bg-card-dark rounded-xl border p-4 shadow-md space-y-3 relative transition-all ${
                  c.is_emergency
                    ? 'border-red-500/40 hover:border-red-500'
                    : c.is_primary
                    ? 'border-primary/40 hover:border-primary'
                    : 'border-border-dark hover:border-border-dark/80'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        c.is_emergency
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-xs truncate">{c.name}</h4>
                      <p className="text-primary text-[11px] font-medium truncate mt-0.5">
                        {c.role_title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.is_emergency && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold">
                        EMERGENCY
                      </span>
                    )}
                    {c.is_primary && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                        PRIMARY
                      </span>
                    )}
                  </div>
                </div>

                {/* Company & Details */}
                {c.company_name && (
                  <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">business</span>
                    <span className="truncate text-white/90">{c.company_name}</span>
                  </div>
                )}

                {/* Direct Action Buttons: 1-Tap Call & Email */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {c.mobile || c.phone ? (
                    <a
                      href={`tel:${c.mobile || c.phone}`}
                      className="h-[32px] px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">call</span>
                      <span className="truncate">{c.mobile || c.phone}</span>
                    </a>
                  ) : (
                    <div className="h-[32px] rounded-lg bg-background-dark text-text-muted/40 border border-border-dark flex items-center justify-center text-[10px]">
                      No Phone
                    </div>
                  )}

                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="h-[32px] px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>Email</span>
                    </a>
                  ) : (
                    <div className="h-[32px] rounded-lg bg-background-dark text-text-muted/40 border border-border-dark flex items-center justify-center text-[10px]">
                      No Email
                    </div>
                  )}
                </div>

                {/* Notes if present */}
                {c.notes && (
                  <p className="text-[11px] text-text-muted/80 bg-background-dark/60 p-2 rounded-lg border border-border-dark/40 line-clamp-2">
                    {c.notes}
                  </p>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark/50">
                  <button
                    onClick={() => setEditingContact(c)}
                    className="p-1 text-text-muted hover:text-white transition-colors"
                    title="Edit Contact"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${c.name} from project contacts?`)) {
                        onDeleteContact(c.id)
                      }
                    }}
                    className="p-1 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete Contact"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <ProjectContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={async (data) => {
            await onAddContact(data)
            setIsAddModalOpen(false)
          }}
        />
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <ProjectContactModal
          isOpen={!!editingContact}
          onClose={() => setEditingContact(null)}
          contact={editingContact}
          onSubmit={async (data) => {
            await onUpdateContact(editingContact.id, data)
            setEditingContact(null)
          }}
        />
      )}
    </div>
  )
}
