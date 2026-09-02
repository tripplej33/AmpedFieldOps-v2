import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useUsers } from '@/hooks/useUsers'
import type { Vehicle, VehicleFormData } from '@/types'

interface EditVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  onSubmit: (id: string, data: Partial<VehicleFormData>) => Promise<void>
  isPending?: boolean
}

export default function EditVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSubmit,
  isPending = false,
}: EditVehicleModalProps) {
  const { data: users } = useUsers()
  const [rego, setRego] = useState('')
  const [makeModel, setMakeModel] = useState('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('')
  const [currentOdo, setCurrentOdo] = useState<number>(0)
  const [wofDate, setWofDate] = useState('')
  const [regoDate, setRegoDate] = useState('')
  const [rucDueKm, setRucDueKm] = useState<number>(0)
  const [status, setStatus] = useState<'active' | 'maintenance' | 'decommissioned'>('active')

  useEffect(() => {
    if (vehicle) {
      setRego(vehicle.registration_number || '')
      setMakeModel(vehicle.make_model || '')
      setYear(vehicle.year || new Date().getFullYear())
      setAssignedTechnicianId(vehicle.assigned_technician_id || '')
      setCurrentOdo(vehicle.current_odometer_km || 0)
      setWofDate(vehicle.wof_expiry_date ? vehicle.wof_expiry_date.slice(0, 10) : '')
      setRegoDate(vehicle.rego_expiry_date ? vehicle.rego_expiry_date.slice(0, 10) : '')
      setRucDueKm(vehicle.ruc_due_km || 0)
      setStatus(vehicle.status || 'active')
    }
  }, [vehicle])

  if (!isOpen || !vehicle) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rego.trim() || !makeModel.trim()) return

    await onSubmit(vehicle.id, {
      registration_number: rego.trim().toUpperCase(),
      make_model: makeModel.trim(),
      year: Number(year) || undefined,
      assigned_technician_id: assignedTechnicianId || undefined,
      current_odometer_km: Number(currentOdo) || 0,
      wof_expiry_date: wofDate || undefined,
      rego_expiry_date: regoDate || undefined,
      ruc_due_km: Number(rucDueKm) || undefined,
      status,
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Vehicle: ${vehicle.registration_number}`}>
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

        {/* Assigned Technician & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-primary font-bold">
              Assigned Field Technician
            </label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-primary/40 rounded-lg text-white font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">Unassigned (Fleet Pool Van)</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted">
              Locks van stock and restock POs to this technician
            </p>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="active">Active (On Road)</option>
              <option value="maintenance">In Workshop / Maintenance</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
        </div>

        {/* Year & Current Odo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Manufacture Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Current Odometer (KM)</label>
            <input
              type="number"
              value={currentOdo}
              onChange={(e) => setCurrentOdo(Number(e.target.value))}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* WOF & Rego Expiry Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">WOF Expiry</label>
            <input
              type="date"
              value={wofDate}
              onChange={(e) => setWofDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Rego Expiry</label>
            <input
              type="date"
              value={regoDate}
              onChange={(e) => setRegoDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">RUC Due KM</label>
            <input
              type="number"
              value={rucDueKm}
              onChange={(e) => setRucDueKm(Number(e.target.value))}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-dark">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Save Vehicle Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
