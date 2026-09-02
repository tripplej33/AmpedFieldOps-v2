import { useState } from 'react'
import AdminResetPasswordModal from './AdminResetPasswordModal'
import UserCredentialsModal from './UserCredentialsModal'
import SendNotificationModal from '@/components/notifications/SendNotificationModal'
import UserAvatar from '@/components/ui/UserAvatar'
import type { User, Role } from '@/types'

interface UsersListProps {
  users: User[]
  roles: Role[]
  loading: boolean
  onUpdateRole: (userId: string, newRole: string) => Promise<void>
}

export default function UsersList({ users, roles, loading, onUpdateRole }: UsersListProps) {
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null)
  const [selectedUserForCredentials, setSelectedUserForCredentials] = useState<User | null>(null)
  const [selectedUserForTask, setSelectedUserForTask] = useState<User | null>(null)

  const getRoleName = (roleId: string) => {
    const found = roles.find((r) => r.id === roleId)
    return found ? found.name : roleId
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
                <th className="px-5 py-3.5">Current Role</th>
                <th className="px-5 py-3.5">Date Joined</th>
                <th className="px-5 py-3.5 text-right">Actions & Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {users.map((u) => {
                const isSystemAdmin = u.role === 'admin'

                return (
                  <tr key={u.id} className="hover:bg-background-dark/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} size="sm" showRoleBadge />
                        <div>
                          <p className="font-bold text-white">{u.full_name || 'Unnamed Technician'}</p>
                          {u.phone && <p className="text-[10px] text-text-muted font-mono">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted font-mono text-[11px]">{u.email}</td>
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
                        <button
                          type="button"
                          onClick={() => setSelectedUserForTask(u)}
                          className="px-2 py-1 rounded bg-background-dark hover:bg-primary/20 border border-border-dark hover:border-primary/40 text-text-muted hover:text-primary text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Send Task / Direct Notification"
                        >
                          <span className="material-symbols-outlined text-xs">send</span>
                          <span>Send Task</span>
                        </button>

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
                        <button
                          type="button"
                          onClick={() => setSelectedUserForReset(u)}
                          className="px-2 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-text-muted hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Generate Password Reset Link"
                        >
                          <span className="material-symbols-outlined text-xs text-amber-400">key</span>
                          <span>Reset</span>
                        </button>

                        {/* Role Selector */}
                        <select
                          value={u.role}
                          onChange={(e) => onUpdateRole(u.id, e.target.value)}
                          className="h-[30px] px-2 py-1 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
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
    </div>
  )
}
