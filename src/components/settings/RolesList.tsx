import { useState } from 'react'
import Button from '@/components/ui/Button'
import RoleModal from './RoleModal'
import type { Role, RoleFormData } from '@/types'

interface RolesListProps {
  roles: Role[]
  loading: boolean
  onSaveRole: (data: RoleFormData, isNew: boolean) => Promise<void>
  onDeleteRole: (roleId: string) => Promise<void>
}

export default function RolesList({ roles, loading, onSaveRole, onDeleteRole }: RolesListProps) {
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenCreate = () => {
    setEditingRole(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role)
    setIsModalOpen(true)
  }

  const handleSave = async (data: RoleFormData, isNew: boolean) => {
    try {
      setIsSaving(true)
      await onSaveRole(data, isNew)
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.is_system) return
    if (confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      await onDeleteRole(role.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-4 rounded-xl border border-border-dark shadow-md">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">admin_panel_settings</span>
            Roles & Granular Permissions Management
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure access privileges, module visibility, and action capabilities per team role
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="h-[36px] text-xs">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Create Custom Role
        </Button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="text-center py-10 text-xs text-text-muted">Loading role configurations...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <p className="text-white text-xs font-medium">No roles defined</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const permCount = (role.permissions || []).length
            const isSystem = role.is_system

            return (
              <div
                key={role.id}
                className="bg-card-dark rounded-xl border border-border-dark p-4 shadow-md space-y-3 flex flex-col justify-between hover:border-border-dark/80 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                        {role.name}
                      </h3>
                      <span className="font-mono text-[10px] text-primary">key: {role.id}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isSystem
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isSystem ? 'System Preset' : 'Custom Role'}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="pt-2 border-t border-border-dark/40 flex items-center justify-between text-xs">
                    <span className="text-text-muted">Granted Permissions:</span>
                    <span className="font-mono font-bold text-white bg-background-dark px-2 py-0.5 rounded border border-border-dark text-[11px]">
                      {permCount} Privileges
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-border-dark/40 flex items-center justify-end gap-2">
                  {!isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDelete(role)}
                      className="p-1.5 rounded text-text-muted hover:text-red-400"
                      title="Delete Role"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(role)}
                    className="h-[32px] px-3 rounded-lg bg-background-dark hover:bg-border-dark border border-border-dark text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">tune</span>
                    Edit Permissions
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role Modal */}
      {isModalOpen && (
        <RoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          role={editingRole}
          onSave={handleSave}
          isPending={isSaving}
        />
      )}
    </div>
  )
}
