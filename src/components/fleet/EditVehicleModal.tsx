import React, { useState, useEffect } from 'react'
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
  const [assetCategory, setAssetCategory] = useState<'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'>('vehicle')
  const [trackingType, setTrackingType] = useState<'km' | 'hours'>('km')
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('')
  const [currentOdo, setCurrentOdo] = useState<number>(0)
  const [currentHours, setCurrentHours] = useState<number>(0)
  const [hourlyChargeRate, setHourlyChargeRate] = useState<number>(0)
  const [wofDate, setWofDate] = useState('')
  const [regoDate, setRegoDate] = useState('')
  const [rucDueKm, setRucDueKm] = useState<number>(0)
  const [status, setStatus] = useState<'active' | 'maintenance' | 'decommissioned'>('active')

  useEffect(() => {
    if (vehicle) {
      setRego(vehicle.registration_number || '')
      setMakeModel(vehicle.make_model || '')
      setYear(vehicle.year || new Date().getFullYear())
      setAssetCategory(vehicle.asset_category || 'vehicle')
      setTrackingType(vehicle.usage_tracking_type || 'km')
      setAssignedTechnicianId(vehicle.assigned_technician_id || '')
      setCurrentOdo(vehicle.current_odometer_km || 0)
      setCurrentHours(vehicle.current_hours || 0)
      setHourlyChargeRate(vehicle.hourly_charge_rate || 0)
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
      asset_category: assetCategory,
      usage_tracking_type: trackingType,
      assigned_technician_id: assignedTechnicianId || undefined,
      current_odometer_km: Number(currentOdo) || 0,
      current_hours: Number(currentHours) || 0,
      hourly_charge_rate: Number(hourlyChargeRate) || 0,
      wof_expiry_date: wofDate || undefined,
      rego_expiry_date: regoDate || undefined,
      ruc_due_km: Number(rucDueKm) || undefined,
      status,
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Fleet / Plant Asset">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Asset Category Selector */}
        <div className="flex bg-surface-dark border border-border-dark rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setAssetCategory('vehicle')
              setTrackingType('km')
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              assetCategory === 'vehicle' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            🚐 Van / Ute
          </button>
          <button
            type="button"
            onClick={() => {
              setAssetCategory('heavy_machinery')
              setTrackingType('hours')
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              assetCategory === 'heavy_machinery' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            🚜 Digger / Plant
          </button>
          <button
            type="button"
            onClick={() => {
              setAssetCategory('equipment')
              setTrackingType('hours')
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              assetCategory === 'equipment' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            💦 Pressure Washer
          </button>
          <button
            type="button"
            onClick={() => {
              setAssetCategory('trailer')
              setTrackingType('km')
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              assetCategory === 'trailer' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            🚛 Trailer
          </button>
        </div>

        {/* Rego & Make/Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="text-text-muted font-medium">Plate / Asset Tag *</label>
            <input
              type="text"
              value={rego}
              onChange={(e) => setRego(e.target.value)}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono uppercase"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-text-muted font-medium">Make & Model / Machine *</label>
            <input
              type="text"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white"
              required
            />
          </div>
        </div>

        {/* Year, Assigned Tech, Charge Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="text-text-muted font-medium">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-text-muted font-medium">Assigned Operator</label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full h-9 px-2 bg-card-dark border border-border-dark rounded-xl text-white"
            >
              <option value="">-- Unassigned --</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-text-muted font-medium">Charge Rate ($/hr)</label>
            <input
              type="number"
              step="0.01"
              value={hourlyChargeRate}
              onChange={(e) => setHourlyChargeRate(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>
        </div>

        {/* Tracking: Hours vs Km */}
        {trackingType === 'hours' ? (
          <div className="space-y-1">
            <label className="text-text-muted font-medium">Current Engine / Meter Hours</label>
            <input
              type="number"
              step="0.1"
              value={currentHours}
              onChange={(e) => setCurrentHours(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-text-muted font-medium">Current Odometer (km)</label>
              <input
                type="number"
                value={currentOdo}
                onChange={(e) => setCurrentOdo(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-text-muted font-medium">RUC Due (km)</label>
              <input
                type="number"
                value={rucDueKm}
                onChange={(e) => setRucDueKm(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* Status */}
        <div className="space-y-1">
          <label className="text-text-muted font-medium">Asset Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full h-9 px-2 bg-card-dark border border-border-dark rounded-xl text-white"
          >
            <option value="active">Active & Operational</option>
            <option value="maintenance">In Maintenance / Workshop</option>
            <option value="decommissioned">Decommissioned / Sold</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-dark">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
