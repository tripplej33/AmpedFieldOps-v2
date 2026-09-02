import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { ProjectContact, ProjectContactFormData } from '@/types'

interface ProjectContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectContactFormData) => Promise<void>
  contact?: ProjectContact | null
  isPending?: boolean
}

const ROLE_PRESETS = [
  'Site Manager',
  'Project Director',
  'Main Contractor Foreman',
  'Health & Safety Representative',
  'Electrical Consultant / Engineer',
  'Lead Architect',
  'Building Inspector / Council Officer',
  'Subcontractor Lead',
  'Client Representative',
]

export default function ProjectContactModal({
  isOpen,
  onClose,
  onSubmit,
  contact,
  isPending = false,
}: ProjectContactModalProps) {
  const [roleTitle, setRoleTitle] = useState(contact?.role_title || ROLE_PRESETS[0])
  const [customRole, setCustomRole] = useState('')
  const [name, setName] = useState(contact?.name || '')
  const [companyName, setCompanyName] = useState(contact?.company_name || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [mobile, setMobile] = useState(contact?.mobile || '')
  const [email, setEmail] = useState(contact?.email || '')
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary || false)
  const [isEmergency, setIsEmergency] = useState(contact?.is_emergency || false)
  const [notes, setNotes] = useState(contact?.notes || '')

  useEffect(() => {
    if (contact) {
      setRoleTitle(ROLE_PRESETS.includes(contact.role_title) ? contact.role_title : 'Other')
      if (!ROLE_PRESETS.includes(contact.role_title)) {
        setCustomRole(contact.role_title)
      }
      setName(contact.name)
      setCompanyName(contact.company_name || '')
      setPhone(contact.phone || '')
      setMobile(contact.mobile || '')
      setEmail(contact.email || '')
      setIsPrimary(contact.is_primary)
      setIsEmergency(contact.is_emergency)
      setNotes(contact.notes || '')
    } else {
      setRoleTitle(ROLE_PRESETS[0])
      setCustomRole('')
      setName('')
      setCompanyName('')
      setPhone('')
      setMobile('')
      setEmail('')
      setIsPrimary(false)
      setIsEmergency(false)
      setNotes('')
    }
  }, [contact, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const finalRole = roleTitle === 'Other' ? (customRole.trim() || 'Site Contact') : roleTitle

    await onSubmit({
      role_title: finalRole,
      name: name.trim(),
      company_name: companyName.trim() || undefined,
      phone: phone.trim() || undefined,
      mobile: mobile.trim() || undefined,
      email: email.trim() || undefined,
      is_primary: isPrimary,
      is_emergency: isEmergency,
      notes: notes.trim() || undefined,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contact ? 'Edit Site Contact' : 'Add Project Site Contact'}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Role Preset Selector */}
        <div className="space-y-1.5">
          <label className="block font-medium text-text-muted">
            Site Role / Stakeholder Position <span className="text-primary">*</span>
          </label>
          <select
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
          >
            {ROLE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
            <option value="Other">Other / Custom Position...</option>
          </select>
        </div>

        {roleTitle === 'Other' && (
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Custom Role Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Fire Engineer / Commissioning Agent"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Contact Name & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Full Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marcus Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Company / Contractor</label>
            <input
              type="text"
              placeholder="e.g. Hawkins Construction Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Phone, Mobile, Email */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Mobile Number</label>
            <input
              type="tel"
              placeholder="+64 21 123 4567"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Landline / Site Office</label>
            <input
              type="tel"
              placeholder="09 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Email Address</label>
            <input
              type="email"
              placeholder="marcus@contractor.co.nz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Primary & Emergency Flags */}
        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <span className="text-white font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-400">star</span>
              Primary Site Contact
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-4 h-4 rounded text-red-500 focus:ring-red-500"
            />
            <span className="text-red-400 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">emergency</span>
              Emergency Contact
            </span>
          </label>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Site Notes</label>
          <textarea
            rows={2}
            placeholder="Key access details, work shifts, inductions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white resize-none focus:outline-none focus:border-primary"
          />
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
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
