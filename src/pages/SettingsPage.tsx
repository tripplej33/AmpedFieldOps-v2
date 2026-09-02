import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRoles, useSaveRole } from '@/hooks/useRoles'
import { useUserInvitations, useCreateInvitation } from '@/hooks/useUserInvitations'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import UsersList from '@/components/settings/UsersList'
import InvitationsList from '@/components/settings/InvitationsList'
import RolesList from '@/components/settings/RolesList'
import InviteUserModal from '@/components/settings/InviteUserModal'
import XeroSettingsSection from '@/components/settings/XeroSettingsSection'
import ActivityTypesSection from '@/components/settings/ActivityTypesSection'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { User, InviteUserFormData, RoleFormData } from '@/types'

interface CompanySettings {
  companyName: string
  nzbn: string
  taxRate: number
  currency: string
  timezone: string
  supportEmail: string
  phone: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { isAdmin, hasPermission } = usePermissions()

  const [activeTab, setActiveTab] = useState<'team' | 'roles' | 'company' | 'activity_types' | 'xero'>('team')

  // Users state
  const [usersList, setUsersList] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Roles state & hook
  const { roles, loading: loadingRoles, refresh: refreshRoles } = useRoles()
  const { saveRole, deleteRole } = useSaveRole()

  // Invitations state & hook
  const { invitations, loading: loadingInvitations, refresh: refreshInvitations } = useUserInvitations()
  const { createInvitation, revokeInvitation, resendInvitation, isPending: isInviting } = useCreateInvitation()
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  // Company profile state
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('amped_company_settings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return {
      companyName: 'Amped Electrical & Field Operations Ltd',
      nzbn: '9429050012345',
      taxRate: 15,
      currency: 'NZD ($)',
      timezone: 'Pacific/Auckland (UTC+12:00)',
      supportEmail: 'duncan@ampedlogix.com',
      phone: '+64 21 000 0000',
    }
  })
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Fetch Active Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setUsersList((data || []) as User[])
    } catch (err) {
      console.error('Failed to fetch team members:', err)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
      })

      if (error) throw error

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      )
      await fetchUsers()
      setToast({ type: 'success', message: 'Team member role updated successfully' })
    } catch (err) {
      console.error('Failed to update role:', err)
      setToast({ type: 'error', message: 'Failed to update role' })
    }
  }

  const handleInviteUser = async (data: InviteUserFormData) => {
    const inv = await createInvitation(data)
    await refreshInvitations()
    setToast({ type: 'success', message: `Invitation generated for ${data.full_name}` })
    return inv
  }

  const handleRevokeInvitation = async (id: string) => {
    if (confirm('Revoke this user invitation?')) {
      await revokeInvitation(id)
      await refreshInvitations()
      setToast({ type: 'info', message: 'Invitation revoked' })
    }
  }

  const handleResendInvitation = async (id: string) => {
    const updated = await resendInvitation(id)
    await refreshInvitations()
    setToast({ type: 'success', message: 'New activation link generated' })
    return updated
  }

  const handleSaveRole = async (data: RoleFormData, isNew: boolean) => {
    try {
      await saveRole(data, isNew)
      await refreshRoles()
      setToast({ type: 'success', message: `Role "${data.name}" saved successfully` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save role' })
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole(roleId)
      await refreshRoles()
      setToast({ type: 'success', message: 'Role deleted' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete role' })
    }
  }

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingCompany(true)
    try {
      localStorage.setItem('amped_company_settings', JSON.stringify(companySettings))
      setToast({ type: 'success', message: 'Company profile saved' })
    } catch {
      setToast({ type: 'error', message: 'Failed to save settings' })
    } finally {
      setIsSavingCompany(false)
    }
  }

  const canAccessXero = isAdmin || hasPermission('xero.manage')

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 flex items-center gap-2.5 font-display">
            <span className="material-symbols-outlined text-3xl text-primary">tune</span>
            System Settings & Administration Hub
          </h1>
          <p className="text-text-muted text-xs">
            Manage field team members, invitations, dynamic permissions, labor rates, and Xero accounting sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role && (
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider">
              {user.role} mode
            </span>
          )}
        </div>
      </div>

      {/* 5-Tab Navigation Header */}
      <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'team'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          Team & Invitations ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'roles'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">admin_panel_settings</span>
          Roles & Permissions ({roles.length})
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'company'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">business</span>
          Company Profile
        </button>

        <button
          onClick={() => setActiveTab('activity_types')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'activity_types'
              ? 'bg-primary text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          Activity Rates
        </button>

        {canAccessXero && (
          <button
            onClick={() => setActiveTab('xero')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'xero'
                ? 'bg-primary text-white font-semibold'
                : 'text-text-muted hover:text-white hover:bg-card-dark'
            }`}
          >
            <span className="material-symbols-outlined text-base">sync_alt</span>
            Xero Integration (Admin)
          </button>
        )}
      </div>

      {/* TAB 1: TEAM MEMBERS & INVITATIONS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">badge</span>
                  Active Field Technicians & Office Staff
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Manage active users, email addresses, and assign role privileges
                </p>
              </div>

              <Button onClick={() => setIsInviteModalOpen(true)}>
                <span className="material-symbols-outlined text-base">person_add</span>
                Invite Team Member
              </Button>
            </div>

            <UsersList
              users={usersList}
              roles={roles}
              loading={loadingUsers}
              onUpdateRole={handleUpdateRole}
            />
          </div>

          {/* Pending Invitations Section */}
          <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
            <InvitationsList
              invitations={invitations}
              loading={loadingInvitations}
              onRevoke={handleRevokeInvitation}
              onResend={handleResendInvitation}
            />
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <RolesList
            roles={roles}
            loading={loadingRoles}
            onSaveRole={handleSaveRole}
            onDeleteRole={handleDeleteRole}
          />
        </div>
      )}

      {/* TAB 3: COMPANY & REGIONAL PROFILE */}
      {activeTab === 'company' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-6 shadow-lg shadow-black/20 max-w-3xl space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">domain</span>
              Company & Regional Configuration
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Default billing rules, business registration, and regional tax formats
            </p>
          </div>

          <form onSubmit={handleSaveCompanySettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Company Trading Name</label>
                <input
                  type="text"
                  required
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">NZBN / Company Number</label>
                <input
                  type="text"
                  value={companySettings.nzbn}
                  onChange={(e) => setCompanySettings({ ...companySettings, nzbn: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Default Tax Rate (GST %)</label>
                <input
                  type="number"
                  step="0.5"
                  value={companySettings.taxRate}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Billing Currency</label>
                <input
                  type="text"
                  value={companySettings.currency}
                  onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Support Contact Email</label>
                <input
                  type="email"
                  value={companySettings.supportEmail}
                  onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Dispatch Phone</label>
                <input
                  type="text"
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="submit" disabled={isSavingCompany}>
                {isSavingCompany ? 'Saving...' : 'Save Company Profile'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: ACTIVITY TYPES & LABOR RATES */}
      {activeTab === 'activity_types' && (
        <div className="space-y-4">
          <ActivityTypesSection />
        </div>
      )}

      {/* TAB 5: XERO INTEGRATION (Admin only) */}
      {activeTab === 'xero' && canAccessXero && (
        <div className="space-y-4">
          <XeroSettingsSection />
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          roles={roles}
          onInvite={handleInviteUser}
          isPending={isInviting}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
