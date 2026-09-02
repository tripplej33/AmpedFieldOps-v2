import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { SiteAttendanceFormData, Project, PersonType } from '@/types'

interface SiteSignInModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  onSubmit: (data: SiteAttendanceFormData) => Promise<void>
  isPending?: boolean
}

export default function SiteSignInModal({
  isOpen,
  onClose,
  project,
  onSubmit,
  isPending = false,
}: SiteSignInModalProps) {
  const [personName, setPersonName] = useState('')
  const [personType, setPersonType] = useState<PersonType>('technician')
  const [companyName, setCompanyName] = useState('Amped Electrical')
  const [phone, setPhone] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [inductionConfirmed, setInductionConfirmed] = useState(true)
  const [hazardsAcknowledged, setHazardsAcknowledged] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim()) return

    await onSubmit({
      project_id: project.id,
      person_name: personName.trim(),
      person_type: personType,
      company_name: companyName.trim() || undefined,
      phone: phone.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      induction_confirmed: inductionConfirmed,
      hazards_acknowledged: hazardsAcknowledged,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Site Sign-In: ${project.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Full Name & Person Type */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">
            Full Name <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Wiremu Heke, Sarah Jenkins"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          />
        </div>

        {/* Person Type Selector */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Site Role / Category</label>
          <div className="grid grid-cols-4 gap-1.5 bg-background-dark p-1 rounded-lg border border-border-dark">
            {(['technician', 'subcontractor', 'visitor', 'inspector'] as PersonType[]).map((t) => {
              const isSelected = personType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setPersonType(t)
                    if (t === 'technician') setCompanyName('Amped Electrical')
                    else if (companyName === 'Amped Electrical') setCompanyName('')
                  }}
                  className={`py-1.5 rounded text-xs font-semibold capitalize transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Company & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Company / Employer</label>
            <input
              type="text"
              placeholder="e.g. Spark NZ, Placemakers, Amped"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Mobile Phone</label>
            <input
              type="tel"
              placeholder="021 555 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Emergency Contact Phone */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Emergency Next of Kin Phone</label>
          <input
            type="tel"
            placeholder="027 987 6543 (Partner, Manager)"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
          />
        </div>

        {/* Safety Induction & Hazard Acknowledgement */}
        <div className="space-y-2 bg-background-dark p-3 rounded-xl border border-border-dark/80">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={inductionConfirmed}
              onChange={(e) => setInductionConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border-dark bg-card-dark text-primary focus:ring-primary"
            />
            <span className="text-[11px] text-text-muted">
              I confirm I have completed the site safety induction and wear mandatory PPE (Steel caps, Hi-Vis, Eye & Ear protection).
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={hazardsAcknowledged}
              onChange={(e) => setHazardsAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border-dark bg-card-dark text-primary focus:ring-primary"
            />
            <span className="text-[11px] text-text-muted">
              I have reviewed today's site hazard board and will report any new safety incidents or near misses to the Site Manager.
            </span>
          </label>
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
          <Button type="submit" disabled={isPending || !personName.trim()}>
            {isPending ? 'Signing In...' : 'Confirm Site Sign-In'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
