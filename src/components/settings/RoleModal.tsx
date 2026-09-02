import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Role, RoleFormData, PermissionKey } from '@/types'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  role: Role | null // null for new role
  onSave: (data: RoleFormData, isNew: boolean) => Promise<void>
  isPending?: boolean
}

interface PermissionGroup {
  category: string
  icon: string
  permissions: { key: PermissionKey; label: string; description: string }[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Projects & Clients',
    icon: 'folder_open',
    permissions: [
      { key: 'projects.view_all', label: 'View All Projects', description: 'Can view all company projects' },
      { key: 'projects.view_assigned', label: 'View Assigned Projects', description: 'Can only view projects assigned to them' },
      { key: 'projects.create', label: 'Create Projects', description: 'Can create new projects' },
      { key: 'projects.edit', label: 'Edit Projects', description: 'Can edit project details and budgets' },
      { key: 'projects.assign_members', label: 'Assign Team Members', description: 'Can assign technicians to projects' },
      { key: 'projects.delete', label: 'Delete Projects', description: 'Can archive or delete projects' },
      { key: 'clients.view', label: 'View Clients', description: 'Can view client directory' },
      { key: 'clients.manage', label: 'Manage Clients', description: 'Can create and edit client profiles' },
    ],
  },
  {
    category: 'Procurement & Materials',
    icon: 'shopping_cart',
    permissions: [
      { key: 'purchase_orders.view', label: 'View POs', description: 'Can view supplier purchase orders' },
      { key: 'purchase_orders.create', label: 'Raise POs', description: 'Can create and draft purchase orders' },
      { key: 'purchase_orders.approve', label: 'Approve & Receive POs', description: 'Can approve and check off goods' },
      { key: 'materials.view', label: 'View Job Materials', description: 'Can see logged materials on jobs' },
      { key: 'materials.log', label: 'Log Materials', description: 'Can log parts and van stock to jobs' },
      { key: 'van_stock.manage', label: 'Manage Van Stock', description: 'Can adjust mobile van inventory' },
    ],
  },
  {
    category: 'Timesheets & Labor',
    icon: 'schedule',
    permissions: [
      { key: 'timesheets.view_own', label: 'View Own Timesheets', description: 'Can view own logged hours' },
      { key: 'timesheets.view_all', label: 'View All Timesheets', description: 'Can view all technician timesheets' },
      { key: 'timesheets.create', label: 'Record Hours', description: 'Can log daily work hours' },
      { key: 'timesheets.approve', label: 'Approve Timesheets', description: 'Can approve submitted timesheets' },
      { key: 'timesheets.delete', label: 'Delete Timesheets', description: 'Can remove draft timesheets' },
    ],
  },
  {
    category: 'Financials & Integrations',
    icon: 'payments',
    permissions: [
      { key: 'financials.view', label: 'View Financials', description: 'Can view revenue, margins & spend' },
      { key: 'financials.export', label: 'Export Billing', description: 'Can export payroll and billing CSV' },
      { key: 'xero.manage', label: 'Manage Xero Sync', description: 'Can configure Xero credentials and sync' },
    ],
  },
  {
    category: 'Quality & Safety',
    icon: 'verified_user',
    permissions: [
      { key: 'snags.manage', label: 'Manage QC Snags', description: 'Can create and resolve punch items' },
      { key: 'fleet.manage', label: 'Manage Fleet & WOF', description: 'Can log vehicle check sheets and rego' },
      { key: 'safety.manage', label: 'Manage Site Safety', description: 'Can conduct emergency roll calls' },
    ],
  },
  {
    category: 'Documents & File Explorer',
    icon: 'folder_managed',
    permissions: [
      { key: 'files.view', label: 'View Documents & Files', description: 'Can view project plans, photos, and compliance docs' },
      { key: 'files.upload', label: 'Upload Files & Photos', description: 'Can upload drawings, specifications, and site photos' },
      { key: 'files.rename', label: 'Rename Files & Photos', description: 'Can rename uploaded documents, drawings, and photos' },
      { key: 'files.create_folder', label: 'Create Folders', description: 'Can create new custom folders inside projects' },
      { key: 'files.delete', label: 'Delete Files & Folders', description: 'Can permanently delete project files and folders' },
    ],
  },
  {
    category: 'System Administration',
    icon: 'settings',
    permissions: [
      { key: 'users.manage', label: 'Manage Users & Invites', description: 'Can invite and manage team members' },
      { key: 'roles.manage', label: 'Manage Roles & RBAC', description: 'Can create and edit roles' },
      { key: 'settings.manage', label: 'Manage Settings', description: 'Can configure company profile' },
    ],
  },
]

export default function RoleModal({ isOpen, onClose, role, onSave, isPending = false }: RoleModalProps) {
  const isNew = !role
  const [roleId, setRoleId] = useState('')
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<PermissionKey>>(new Set())

  useEffect(() => {
    if (role) {
      setRoleId(role.id)
      setRoleName(role.name)
      setDescription(role.description || '')
      setSelectedPermissions(new Set(role.permissions || []))
    } else {
      setRoleId('')
      setRoleName('')
      setDescription('')
      setSelectedPermissions(new Set(['projects.view', 'timesheets.view_own', 'timesheets.create']))
    }
  }, [role, isOpen])

  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleCategory = (group: PermissionGroup) => {
    const allKeys = group.permissions.map((p) => p.key)
    const allSelected = allKeys.every((k) => selectedPermissions.has(k))

    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allKeys.forEach((k) => next.delete(k))
      } else {
        allKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) return

    const id = isNew
      ? roleId.trim() || roleName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : role.id

    await onSave(
      {
        id,
        name: roleName.trim(),
        description: description.trim() || undefined,
        permissions: Array.from(selectedPermissions),
      },
      isNew
    )

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Create New Role' : `Edit Role: ${role.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {/* Role Name & ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Role Display Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lead Estimator, Apprentice"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Role Key / Slug <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isNew}
              placeholder="e.g. lead_estimator"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs disabled:opacity-60 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Description</label>
          <input
            type="text"
            placeholder="Summarize this role's purpose and scope..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          />
        </div>

        {/* Granular Permissions Matrix */}
        <div className="space-y-3 pt-2 border-t border-border-dark">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Granular Permission Matrix ({selectedPermissions.size} granted)
            </h4>
            <span className="text-[10px] text-text-muted">Click category header to toggle all</span>
          </div>

          <div className="space-y-3">
            {PERMISSION_GROUPS.map((group) => {
              const allKeys = group.permissions.map((p) => p.key)
              const groupGranted = allKeys.filter((k) => selectedPermissions.has(k)).length
              const allSelected = groupGranted === allKeys.length

              return (
                <div
                  key={group.category}
                  className="bg-background-dark/80 rounded-xl border border-border-dark/60 p-3.5 space-y-2.5"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">
                        {group.icon}
                      </span>
                      <span className="font-semibold text-white text-xs">{group.category}</span>
                      <span className="text-[10px] text-text-muted">
                        ({groupGranted}/{allKeys.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCategory(group)}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Permissions Checkboxes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((perm) => {
                      const isChecked = selectedPermissions.has(perm.key)

                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary/10 border-primary/30 text-white'
                              : 'bg-card-dark/60 border-border-dark/40 text-text-muted hover:border-border-dark hover:text-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.key)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                          />
                          <div className="min-w-0">
                            <span className="block font-semibold text-xs leading-tight">
                              {perm.label}
                            </span>
                            <span className="block text-[10px] opacity-75 truncate">
                              {perm.description}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] px-4 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white font-medium"
          >
            Cancel
          </button>
          <Button type="submit" disabled={isPending || !roleName.trim()}>
            {isPending ? 'Saving...' : isNew ? 'Create Role' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
