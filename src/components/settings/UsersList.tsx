import { useState } from 'react'
import AdminResetPasswordModal from './AdminResetPasswordModal'
import UserCredentialsModal from './UserCredentialsModal'
import SendNotificationModal from '@/components/notifications/SendNotificationModal'
import UserAvatar from '@/components/ui/UserAvatar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import type { User, Role } from '@/types'

interface UsersListProps {
  users: User[]
  roles: Role[]
  loading: boolean
  onUpdateRole: (userId: string, newRole: string) => Promise<void>
  onToggleActive?: (userId: string, activate: boolean) => Promise<void>
  onDeleteUser?: (userId: string) => Promise<void>
}

export default function UsersList({
  users,
  roles,
  loading,
  onUpdateRole,
  onToggleActive,
  onDeleteUser,
}: UsersListProps) {
  const { user: currentUser } = useAuth()
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null)
  const [selectedUserForCredentials, setSelectedUserForCredentials] = useState<User | null>(null)
  const [selectedUserForTask, setSelectedUserForTask] = useState<User | null>(null)

  // Deactivate state
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Delete state
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const getRoleName = (roleId: string) => {
    const found = roles.find((r) => r.id === roleId)
    return found ? found.name : roleId
  }

  const handleConfirmToggleActive = async () => {
    if (!userToDeactivate || !onToggleActive) return
    try {
      setIsDeactivating(true)
      const shouldActivate = userToDeactivate.is_active === false
      await onToggleActive(userToDeactivate.id, shouldActivate)
      setUserToDeactivate(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete || !onDeleteUser) return
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') return

    try {
      setIsDeleting(true)
      await onDeleteUser(userToDelete.id)
      setUserToDelete(null)
      setDeleteConfirmationText('')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10 text-xs text-text-muted">Loading team members...</div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Team Member</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Current Role</th>
                <th className="px-5 py-3.5">Date Joined</th>
                <th className="px-5 py-3.5 text-right">Actions & Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {users.map((u) => {
                const isSystemAdmin = u.role === 'admin'
                const isSelf = u.id === currentUser?.id
                const isDeactivated = u.is_active === false

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isDeactivated
                        ? 'bg-background-dark/30 opacity-75 hover:bg-background-dark/50'
                        : 'hover:bg-background-dark/40'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} size="sm" showRoleBadge />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-white">{u.full_name || 'Unnamed Technician'}</p>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase">
                                You
                              </span>
                            )}
                          </div>
                          {u.phone && <p className="text-[10px] text-text-muted font-mono">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted font-mono text-[11px]">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          isDeactivated
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDeactivated ? 'bg-red-400' : 'bg-emerald-400'
                          }`}
                        />
                        {isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          isSystemAdmin
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : u.role === 'manager'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {getRoleName(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Send Notification / Task Modal */}
                        {!isDeactivated && (
                          <button
                            type="button"
                            onClick={() => setSelectedUserForTask(u)}
                            className="px-2 py-1 rounded bg-background-dark hover:bg-primary/20 border border-border-dark hover:border-primary/40 text-text-muted hover:text-primary text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Send Task / Direct Notification"
                          >
                            <span className="material-symbols-outlined text-xs">send</span>
                            <span>Task</span>
                          </button>
                        )}

                        {/* Licences & Compliance Modal */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserForCredentials(u)}
                          className="px-2 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-text-muted hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="View & Manage Licences"
                        >
                          <span className="material-symbols-outlined text-xs text-primary">badge</span>
                          <span>Licences</span>
                        </button>

                        {/* Reset Password Link Trigger */}
                        {!isDeactivated && (
                          <button
                            type="button"
                            onClick={() => setSelectedUserForReset(u)}
                            className="px-2 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-text-muted hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Generate Password Reset Link"
                          >
                            <span className="material-symbols-outlined text-xs text-amber-400">key</span>
                            <span>Reset</span>
                          </button>
                        )}

                        {/* Role Selector */}
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => onUpdateRole(u.id, e.target.value)}
                          className="h-[28px] px-2 py-0.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>

                        {/* Disable / Enable Toggle Button */}
                        {!isSelf && onToggleActive && (
                          <button
                            type="button"
                            onClick={() => setUserToDeactivate(u)}
                            className={`px-2 py-1 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                              isDeactivated
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                            }`}
                            title={isDeactivated ? 'Reactivate Account' : 'Deactivate / Disable Account'}
                          >
                            <span className="material-symbols-outlined text-xs">
                              {isDeactivated ? 'check_circle' : 'block'}
                            </span>
                            <span>{isDeactivated ? 'Enable' : 'Disable'}</span>
                          </button>
                        )}

                        {/* Delete User Button */}
                        {!isSelf && onDeleteUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserToDelete(u)
                              setDeleteConfirmationText('')
                            }}
                            className="p-1 rounded bg-background-dark hover:bg-red-500/20 border border-border-dark hover:border-red-500/40 text-text-muted hover:text-red-400 text-xs flex items-center transition-colors"
                            title="Permanently Delete User Account"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {selectedUserForReset && (
        <AdminResetPasswordModal
          isOpen={!!selectedUserForReset}
          onClose={() => setSelectedUserForReset(null)}
          targetUser={selectedUserForReset}
        />
      )}

      {/* User Credentials & Licences Modal */}
      {selectedUserForCredentials && (
        <UserCredentialsModal
          isOpen={!!selectedUserForCredentials}
          onClose={() => setSelectedUserForCredentials(null)}
          user={selectedUserForCredentials}
        />
      )}

      {/* Send Notification Task Modal */}
      {selectedUserForTask && (
        <SendNotificationModal
          isOpen={!!selectedUserForTask}
          onClose={() => setSelectedUserForTask(null)}
          initialRecipientId={selectedUserForTask.id}
        />
      )}

      {/* Soft Deactivate / Reactivate Modal */}
      {userToDeactivate && (
        <Modal
          isOpen={!!userToDeactivate}
          onClose={() => setUserToDeactivate(null)}
          title={userToDeactivate.is_active === false ? 'Reactivate User Account' : 'Deactivate User Account'}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                userToDeactivate.is_active === false
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              }`}
            >
              <span className="material-symbols-outlined text-2xl shrink-0">
                {userToDeactivate.is_active === false ? 'lock_open' : 'lock'}
              </span>
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">
                  {userToDeactivate.is_active === false ? 'Restore Account Access?' : 'Suspend Account Access?'}
                </p>
                <p className="text-text-muted leading-relaxed">
                  {userToDeactivate.is_active === false
                    ? `Reactivating ${userToDeactivate.full_name || userToDeactivate.email} will restore their login access immediately.`
                    : `Disabling ${userToDeactivate.full_name || userToDeactivate.email} will immediately terminate active sessions and block any login attempts.`}
                </p>
              </div>
            </div>

            <div className="p-3 bg-background-dark/80 border border-border-dark rounded-lg text-text-muted leading-relaxed">
              <p className="text-white font-semibold mb-1">Historical Records Preserved:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>All past timesheets, labor logs, and work history remain intact.</li>
                <li>Signed safety check sheets, roll-call attendance, and emergency sign-ins remain unaltered.</li>
                <li>Project allocations, purchase orders, and audit trail logs are kept for compliance.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-dark">
              <Button variant="secondary" onClick={() => setUserToDeactivate(null)} disabled={isDeactivating}>
                Cancel
              </Button>
              <Button
                variant={userToDeactivate.is_active === false ? 'primary' : 'danger'}
                onClick={handleConfirmToggleActive}
                disabled={isDeactivating}
              >
                {isDeactivating
                  ? 'Processing...'
                  : userToDeactivate.is_active === false
                  ? 'Reactivate Account'
                  : 'Confirm Deactivation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Hard-Delete Modal */}
      {userToDelete && (
        <Modal
          isOpen={!!userToDelete}
          onClose={() => {
            setUserToDelete(null)
            setDeleteConfirmationText('')
          }}
          title="Permanently Delete User Account"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-red-400 shrink-0">
                warning
              </span>
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">Irreversible Deletion</p>
                <p className="text-text-muted leading-relaxed">
                  You are about to permanently delete{' '}
                  <strong className="text-white">{userToDelete.full_name || userToDelete.email}</strong>.
                  This action removes their account from Supabase Auth and database completely and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-background-dark/80 border border-border-dark rounded-lg space-y-2">
              <p className="text-text-muted">
                If you simply want to prevent this user from logging in while retaining their history, consider{' '}
                <strong className="text-amber-400">Disabling</strong> the account instead.
              </p>
              <p className="text-white font-medium">
                To confirm permanent deletion, type <span className="font-mono text-red-400 font-bold">DELETE</span> below:
              </p>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-red-400"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-dark">
              <Button
                variant="secondary"
                onClick={() => {
                  setUserToDelete(null)
                  setDeleteConfirmationText('')
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
              >
                {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
