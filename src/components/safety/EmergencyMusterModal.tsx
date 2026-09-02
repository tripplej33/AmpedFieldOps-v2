import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { SiteAttendance, Project } from '@/types'

interface EmergencyMusterModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  onSitePersonnel: SiteAttendance[]
  onToggleAccounted: (id: string, accounted: boolean) => Promise<void>
}

export default function EmergencyMusterModal({
  isOpen,
  onClose,
  project,
  onSitePersonnel,
  onToggleAccounted,
}: EmergencyMusterModalProps) {
  if (!isOpen) return null

  const accountedCount = onSitePersonnel.filter((p) => p.accounted_for).length
  const missingCount = onSitePersonnel.length - accountedCount
  const allAccounted = onSitePersonnel.length > 0 && missingCount === 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`EMERGENCY MUSTER ROLL CALL: ${project.name}`}
    >
      <div className="space-y-4 text-xs">
        {/* Emergency Alert Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          allAccounted
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
        }`}>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">
                {allAccounted ? 'verified_user' : 'warning'}
              </span>
              {allAccounted ? 'ALL PERSONNEL ACCOUNTED FOR' : 'EVACUATION IN PROGRESS'}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {allAccounted
                ? 'All registered on-site workers and visitors have reported to assembly point.'
                : 'Fire Marshal: Check off each person at the assembly point immediately.'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xl font-black">
              {accountedCount} / {onSitePersonnel.length}
            </span>
            <p className="text-[10px] uppercase font-bold tracking-wider">
              {missingCount === 0 ? 'Safe' : `${missingCount} Unaccounted`}
            </p>
          </div>
        </div>

        {/* Personnel Muster Checklist */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {onSitePersonnel.map((person) => {
            const isAccounted = person.accounted_for

            return (
              <div
                key={person.id}
                onClick={() => onToggleAccounted(person.id, !isAccounted)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isAccounted
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-card-dark border-border-dark hover:border-red-500/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Selfie or Initials Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border ${
                      isAccounted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}
                  >
                    {person.selfie_photo_url ? (
                      <img
                        src={person.selfie_photo_url}
                        alt={person.person_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      person.person_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-xs truncate">{person.person_name}</h4>
                      <span className="px-1.5 py-0.2 rounded bg-background-dark text-[10px] text-text-muted capitalize border border-border-dark">
                        {person.person_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {person.company_name || 'Individual'} • In: {new Date(person.signed_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Emergency Calling */}
                  {person.phone && (
                    <a
                      href={`tel:${person.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-background-dark hover:bg-border-dark border border-border-dark text-primary flex items-center justify-center"
                      title="Call Worker"
                    >
                      <span className="material-symbols-outlined text-sm">phone</span>
                    </a>
                  )}

                  {/* Accounted Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleAccounted(person.id, !isAccounted)
                    }}
                    className={`h-[34px] px-3.5 rounded-lg text-xs font-bold border transition-all ${
                      isAccounted
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'bg-background-dark text-text-muted hover:text-white border-border-dark'
                    }`}
                  >
                    {isAccounted ? 'Safe at Muster' : 'Mark Safe'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-[36px] px-3 rounded-lg border border-border-dark bg-background-dark text-xs text-text-muted hover:text-white flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print Evacuation Report
          </button>

          <Button onClick={onClose}>Done / Close Muster Board</Button>
        </div>
      </div>
    </Modal>
  )
}
