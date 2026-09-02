import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectMembers } from '@/hooks/useProjectMembers'
import Button from '@/components/ui/Button'
import type { User } from '@/types'

interface ProjectTeamSectionProps {
  projectId: string
  isManager: boolean
}

export default function ProjectTeamSection({ projectId, isManager }: ProjectTeamSectionProps) {
  const { members, loading, assignMember, removeMember, refresh } = useProjectMembers(projectId)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [roleInProject, setRoleInProject] = useState('technician')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })

      setAllUsers((data || []) as User[])
    }
    loadUsers()
  }, [])

  const assignedUserIds = new Set(members.map((m) => m.user_id))
  const unassignedUsers = allUsers.filter((u) => !assignedUserIds.has(u.id))

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    try {
      setIsAssigning(true)
      await assignMember(selectedUserId, roleInProject)
      await refresh()
      setIsAssignModalOpen(false)
      setSelectedUserId('')
    } catch (err) {
      console.error('Failed to assign team member:', err)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemove = async (memberId: string, memberName: string) => {
    if (confirm(`Remove ${memberName} from this project? They will no longer see this job in their assigned view.`)) {
      await removeMember(memberId)
      await refresh()
    }
  }

  return (
    <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">group</span>
            Assigned Field Team & Project Permissions ({members.length})
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Only assigned technicians and administrators have access to view and log hours against this project
          </p>
        </div>

        {isManager && (
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            disabled={unassignedUsers.length === 0}
            className="h-[34px] text-xs"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Assign Team Member
          </Button>
        )}
      </div>

      {/* Members Grid / List */}
      {loading ? (
        <div className="text-center py-6 text-xs text-text-muted">Loading assigned team...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border-dark rounded-xl bg-background-dark/40 space-y-1">
          <span className="material-symbols-outlined text-3xl text-text-muted/40 block">
            group_off
          </span>
          <p className="text-white text-xs font-semibold">No Field Technicians Assigned Yet</p>
          <p className="text-[11px] text-text-muted">
            This project is currently only visible to company managers and administrators. Assign technicians to grant them job access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {members.map((m) => {
            const initial = (m.user?.full_name || m.user?.email || 'T').charAt(0).toUpperCase()
            const isLead = m.role_in_project === 'lead_technician' || m.role_in_project === 'lead'

            return (
              <div
                key={m.id}
                className="bg-background-dark/80 border border-border-dark/60 rounded-xl p-3 flex items-center justify-between gap-2.5 hover:border-border-dark transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {m.user?.full_name || m.user?.email || 'Field Staff'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase border ${
                          isLead
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {m.role_in_project.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono truncate">
                        {m.user?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {isManager && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id, m.user?.full_name || 'member')}
                    className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-card-dark transition-colors"
                    title="Remove assignment"
                  >
                    <span className="material-symbols-outlined text-sm">person_remove</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Member Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-card-dark border border-border-dark rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">person_add</span>
                <h3 className="font-semibold text-white text-sm">Assign Staff to Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-text-muted hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-text-muted font-medium">Select Team Member</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Select Technician / Apprentice...</option>
                  {unassignedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-text-muted font-medium">Role on this Job</label>
                <select
                  value={roleInProject}
                  onChange={(e) => setRoleInProject(e.target.value)}
                  className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                >
                  <option value="lead_technician">Lead Electrician / Foreman</option>
                  <option value="technician">Field Electrician / Technician</option>
                  <option value="apprentice">Apprentice Electrician</option>
                  <option value="contractor">Subcontractor</option>
                  <option value="member">General Team Member</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={isAssigning || !selectedUserId}>
                  {isAssigning ? 'Assigning...' : 'Assign to Job'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
