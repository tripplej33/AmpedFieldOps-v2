import { useState } from 'react'
import type { UserInvitation } from '@/types'

interface InvitationsListProps {
  invitations: UserInvitation[]
  loading: boolean
  onRevoke: (id: string) => Promise<void>
  onResend: (id: string) => Promise<UserInvitation>
}

export default function InvitationsList({
  invitations,
  loading,
  onRevoke,
  onResend,
}: InvitationsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (inv: UserInvitation) => {
    const link = `${window.location.origin}/accept-invite?token=${inv.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold'
      case 'expired':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      case 'revoked':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const pendingInvites = invitations.filter((i) => i.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">outgoing_mail</span>
            Pending & Past User Invitations ({pendingInvites.length} Pending)
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Track onboarding links, copy direct registration URLs, or revoke access
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-text-muted">Loading invitations...</div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <p className="text-white text-xs font-medium">No invitations sent yet</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Click "Invite Team Member" above to invite technicians or managers to the platform.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Invited Member</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Designated Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {invitations.map((inv) => {
                const isPending = inv.status === 'pending'
                const isCopied = copiedId === inv.id

                return (
                  <tr key={inv.id} className="hover:bg-background-dark/40 transition-colors">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{inv.full_name}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-[11px]">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-background-dark border border-border-dark text-white font-medium text-[11px]">
                        {inv.role?.name || inv.role_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopy(inv)}
                              className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Copy Invite Link"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isCopied ? 'done' : 'link'}
                              </span>
                              {isCopied ? 'Copied' : 'Copy Link'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onResend(inv.id)}
                              className="p-1 rounded text-text-muted hover:text-white"
                              title="Regenerate & Resend Link"
                            >
                              <span className="material-symbols-outlined text-sm">refresh</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onRevoke(inv.id)}
                              className="p-1 rounded text-text-muted hover:text-red-400"
                              title="Revoke Invitation"
                            >
                              <span className="material-symbols-outlined text-sm">block</span>
                            </button>
                          </>
                        )}
                        {inv.status === 'accepted' && (
                          <span className="text-emerald-400 text-[11px] font-medium">Active User</span>
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
    </div>
  )
}
