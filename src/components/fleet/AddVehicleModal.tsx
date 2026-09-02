import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useUsers } from '@/hooks/useUsers'
import type { VehicleFormData } from '@/types'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: VehicleFormData) => Promise<void>
  isPending?: boolean
}

export default function AddVehicleModal({
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
}: AddVehicleModalProps) {
  const { data: users } = useUsers()
  const [rego, setRego] = useState('')
  const [makeModel, setMakeModel] = useState('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('')
  const [currentOdo, setCurrentOdo] = useState<number>(0)
  const [wofDate, setWofDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  )
  const [regoDate, setRegoDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  )
  const [rucDueKm, setRucDueKm] = useState<number>(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rego.trim() || !makeModel.trim()) return

    await onSubmit({
      registration_number: rego.trim().toUpperCase(),
      make_model: makeModel.trim(),
      year: Number(year) || undefined,
      assigned_technician_id: assignedTechnicianId || undefined,
      current_odometer_km: Number(currentOdo) || 0,
      wof_expiry_date: wofDate || undefined,
      rego_expiry_date: regoDate || undefined,
      ruc_due_km: Number(rucDueKm) || undefined,
      status: 'active',
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Fleet Vehicle">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Rego & Make/Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              License Plate / Rego <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AMPED01"
              value={rego}
              onChange={(e) => setRego(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono font-bold uppercase focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Make & Model <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Toyota HiAce LWB 2.8TD"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Assigned Technician & Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Assigned Field Technician</label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">Unassigned (Fleet Pool Van)</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Model Year</label>
            <input
              type="number"
              min="1990"
              max="2030"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 2023)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Compliance Dates: WOF, Rego & RUC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-border-dark/60">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">WOF Expiry Date</label>
            <input
              type="date"
              value={wofDate}
              onChange={(e) => setWofDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Rego Expiry Date</label>
            <input
              type="date"
              value={regoDate}
              onChange={(e) => setRegoDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">RUC Due (KM)</label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={rucDueKm || ''}
              onChange={(e) => setRucDueKm(parseFloat(e.target.value) || 0)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Current Odometer */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Current Odometer (KM)</label>
          <input
            type="number"
            placeholder="e.g. 42150"
            value={currentOdo || ''}
            onChange={(e) => setCurrentOdo(parseFloat(e.target.value) || 0)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
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
          <Button type="submit" disabled={isPending || !rego.trim() || !makeModel.trim()}>
            {isPending ? 'Registering...' : 'Add Fleet Vehicle'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
