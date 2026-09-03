import { useState, useEffect, useCallback } from 'react'
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
import { useCompanyProfile, CompanyProfile } from '@/hooks/useCompanyProfile'

export default function SettingsPage() {
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

  // Company profile state & hook
  const {
    profile: companyProfile,
    saveProfile: saveCompanyProfile,
    uploadLogo: uploadCompanyLogo,
    removeLogo: removeCompanyLogo,
    saving: isSavingCompany,
  } = useCompanyProfile()

  const [companySettings, setCompanySettings] = useState<CompanyProfile>(companyProfile)

  useEffect(() => {
    setCompanySettings(companyProfile)
  }, [companyProfile])

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

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveCompanyProfile(companySettings)
      setToast({ type: 'success', message: 'Company profile saved successfully' })
    } catch {
      setToast({ type: 'error', message: 'Failed to save company settings' })
    }
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadCompanyLogo(file)
      setToast({ type: 'success', message: 'Company logo uploaded and updated' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to upload logo' })
    }
  }

  const handleRemoveLogo = async () => {
    try {
      await removeCompanyLogo()
      setToast({ type: 'info', message: 'Company logo removed' })
    } catch {
      setToast({ type: 'error', message: 'Failed to remove logo' })
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
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border-dark gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'team'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          Active Team ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'roles'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">admin_panel_settings</span>
          Roles & Permissions
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'company'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">domain</span>
          Company Profile & Branding
        </button>

        <button
          onClick={() => setActiveTab('activity_types')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'activity_types'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">category</span>
          Activity Types & Rates
        </button>

        {canAccessXero && (
          <button
            onClick={() => setActiveTab('xero')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'xero'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">sync_alt</span>
            Xero Accounting Sync
          </button>
        )}
      </div>

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Invite Team Member
            </Button>
          </div>

          <UsersList
            users={usersList}
            loading={loadingUsers}
            roles={roles}
            onUpdateRole={handleUpdateRole}
          />

          <InvitationsList
            invitations={invitations}
            loading={loadingInvitations}
            onRevoke={handleRevokeInvitation}
            onResend={handleResendInvitation}
          />
        </div>
      )}

      {/* TAB 2: ROLES & RBAC MATRIX */}
      {activeTab === 'roles' && (
        <div>
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
              Company Branding & Regional Configuration
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Set company identity, official logo for safety PDFs and documents, and default business rules
            </p>
          </div>

          {/* Company Logo Upload & Preview Card */}
          <div className="p-4 rounded-xl bg-background-dark border border-border-dark space-y-3">
            <label className="block text-text-muted font-medium text-xs">Company Logo (For PDFs & Branding)</label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-20 h-20 rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center p-2 overflow-hidden shadow-inner">
                {companySettings.logoUrl ? (
                  <img
                    src={companySettings.logoUrl}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-text-muted">image</span>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black font-semibold text-xs transition-colors">
                    <span className="material-symbols-outlined text-sm">upload</span>
                    {companySettings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>

                  {companySettings.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-dark hover:bg-red-500/20 text-text-muted hover:text-red-400 border border-border-dark text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-text-muted">
                  Recommended: PNG or SVG with transparent background (Max 10MB). Automatically embedded on Safety PDFs and audit documents.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveCompanySettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Company Trading Name</label>
                <input
                  type="text"
                  required
                  value={companySettings.companyName || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">NZBN / Company Number</label>
                <input
                  type="text"
                  value={companySettings.nzbn || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, nzbn: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Physical / Postal Address</label>
                <input
                  type="text"
                  value={companySettings.address || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  placeholder="e.g. Auckland, New Zealand"
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Default Tax Rate (GST %)</label>
                <input
                  type="number"
                  step="0.5"
                  value={companySettings.taxRate || 15}
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
                  value={companySettings.currency || 'NZD ($)'}
                  onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Support Contact Email</label>
                <input
                  type="email"
                  value={companySettings.supportEmail || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Dispatch Phone</label>
                <input
                  type="text"
                  value={companySettings.phone || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-text-muted font-medium">Regional Timezone</label>
                <input
                  type="text"
                  value={companySettings.timezone || 'Pacific/Auckland (UTC+12:00)'}
                  onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })}
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
