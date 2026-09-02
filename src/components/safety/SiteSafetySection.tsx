import { useState } from 'react'
import Button from '@/components/ui/Button'
import SiteSignInModal from './SiteSignInModal'
import EmergencyMusterModal from './EmergencyMusterModal'
import type { SiteAttendance, SiteAttendanceFormData, Project } from '@/types'

interface SiteSafetySectionProps {
  attendances: SiteAttendance[]
  loading: boolean
  project: Project
  onSignIn: (data: SiteAttendanceFormData) => Promise<void>
  onSignOut: (id: string) => Promise<void>
  onToggleAccounted: (id: string, accounted: boolean) => Promise<void>
}

export default function SiteSafetySection({
  attendances,
  loading,
  project,
  onSignIn,
  onSignOut,
  onToggleAccounted,
}: SiteSafetySectionProps) {
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isMusterOpen, setIsMusterOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'on_site' | 'all'>('on_site')
  const [copiedKiosk, setCopiedKiosk] = useState(false)

  const onSiteList = attendances.filter((a) => a.status === 'on_site')
  const filtered = attendances.filter((a) => {
    if (statusFilter === 'on_site' && a.status !== 'on_site') return false
    if (filterType !== 'all' && a.person_type !== filterType) return false
    return true
  })

  const techCount = onSiteList.filter((a) => a.person_type === 'technician').length
  const subCount = onSiteList.filter((a) => a.person_type === 'subcontractor').length
  const visitorCount = onSiteList.filter((a) => a.person_type === 'visitor' || a.person_type === 'inspector').length

  const kioskUrl = `${window.location.origin}/site-kiosk/${project.id}`

  const handleCopyKioskLink = () => {
    navigator.clipboard.writeText(kioskUrl)
    setCopiedKiosk(true)
    setTimeout(() => setCopiedKiosk(false), 2500)
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'technician':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'subcontractor':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'inspector':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'visitor':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Total Currently On Site</span>
          <p className="text-emerald-400 text-xl font-bold font-mono mt-0.5">{onSiteList.length} Active</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Amped Technicians</span>
          <p className="text-primary text-xl font-bold font-mono mt-0.5">{techCount} Techs</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Subcontractors</span>
          <p className="text-blue-400 text-xl font-bold font-mono mt-0.5">{subCount} Trades</p>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-3.5 shadow-md">
          <span className="text-text-muted text-[11px] font-semibold uppercase">Visitors / Inspectors</span>
          <p className="text-amber-400 text-xl font-bold font-mono mt-0.5">{visitorCount} People</p>
        </div>
      </div>

      {/* Action Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card-dark p-3.5 rounded-xl border border-border-dark">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-background-dark p-1 rounded-lg border border-border-dark">
            <button
              onClick={() => setStatusFilter('on_site')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === 'on_site' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              On Site Now ({onSiteList.length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === 'all' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              All History
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-[34px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Roles</option>
            <option value="technician">Technicians</option>
            <option value="subcontractor">Subcontractors</option>
            <option value="visitor">Visitors</option>
            <option value="inspector">Inspectors</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyKioskLink}
            className="h-[36px] px-3 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white font-medium flex items-center gap-1.5 transition-colors"
            title="Copy QR / Tablet Kiosk URL for Site Gate"
          >
            <span className="material-symbols-outlined text-sm text-primary">qr_code</span>
            {copiedKiosk ? 'Link Copied' : 'Site Tablet Kiosk URL'}
          </button>

          <Button
            variant="danger"
            onClick={() => setIsMusterOpen(true)}
            className="h-[36px] text-xs bg-red-600 hover:bg-red-500 shadow-md shadow-red-900/20"
          >
            <span className="material-symbols-outlined text-base">emergency</span>
            Fire Drill / Roll Call
          </Button>

          <Button onClick={() => setIsSignInOpen(true)} className="h-[36px] text-xs">
            <span className="material-symbols-outlined text-base">login</span>
            Sign In Person
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-text-muted">Loading site attendance records...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            badge
          </span>
          <p className="text-white text-sm font-medium">No personnel currently signed into this site</p>
          <p className="text-xs text-text-muted mt-1">
            Workers can sign in using the tablet kiosk or via the "Sign In Person" button above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark">
          <table className="w-full text-xs text-left">
            <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Signed In At</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-white">
              {filtered.map((a) => {
                const isOnSite = a.status === 'on_site'

                return (
                  <tr key={a.id} className="hover:bg-background-dark/40 transition-colors">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {a.person_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white">{a.person_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getTypeBadge(
                          a.person_type
                        )}`}
                      >
                        {a.person_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{a.company_name || '—'}</td>
                    <td className="px-4 py-3 font-mono">
                      {a.phone ? (
                        <a href={`tel:${a.phone}`} className="text-primary hover:underline">
                          {a.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {new Date(a.signed_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(a.signed_in_at).toLocaleDateString()})
                    </td>
                    <td className="px-4 py-3">
                      {isOnSite ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          On Site
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Signed Out ({a.signed_out_at ? new Date(a.signed_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isOnSite && (
                        <button
                          onClick={() => onSignOut(a.id)}
                          className="px-2.5 py-1 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-xs text-text-muted hover:text-white transition-colors"
                        >
                          Sign Out →
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Sign-In Modal */}
      {isSignInOpen && (
        <SiteSignInModal
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
          project={project}
          onSubmit={async (data) => {
            await onSignIn(data)
            setIsSignInOpen(false)
          }}
        />
      )}

      {/* Emergency Muster Modal */}
      {isMusterOpen && (
        <EmergencyMusterModal
          isOpen={isMusterOpen}
          onClose={() => setIsMusterOpen(false)}
          project={project}
          onSitePersonnel={onSiteList}
          onToggleAccounted={onToggleAccounted}
        />
      )}
    </div>
  )
}
