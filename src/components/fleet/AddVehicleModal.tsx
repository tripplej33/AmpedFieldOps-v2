import React, { useState } from 'react'
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
  const [assetCategory, setAssetCategory] = useState<'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'>('vehicle')
  const [trackingType, setTrackingType] = useState<'km' | 'hours'>('km')
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('')
  const [currentOdo, setCurrentOdo] = useState<number>(0)
  const [currentHours, setCurrentHours] = useState<number>(0)
  const [hourlyChargeRate, setHourlyChargeRate] = useState<number>(0)
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
      asset_category: assetCategory,
      usage_tracking_type: trackingType,
      assigned_technician_id: assignedTechnicianId || undefined,
      current_odometer_km: Number(currentOdo) || 0,
      current_hours: Number(currentHours) || 0,
      hourly_charge_rate: Number(hourlyChargeRate) || 0,
      wof_expiry_date: wofDate || undefined,
      rego_expiry_date: regoDate || undefined,
      ruc_due_km: Number(rucDueKm) || undefined,
      status: 'active',
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Fleet Asset / Plant & Machinery">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Asset Category Pills */}
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
            💦 Pressure Washer / Tool
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

        {/* Rego / Asset ID & Make/Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="text-text-muted font-medium">
              {assetCategory === 'vehicle' || assetCategory === 'trailer' ? 'License Plate / Rego' : 'Asset Tag / Serial Number'} *
            </label>
            <input
              type="text"
              value={rego}
              onChange={(e) => setRego(e.target.value)}
              placeholder={assetCategory === 'vehicle' ? 'e.g. ABC123' : 'e.g. DIGGER-01 / PW-900'}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono uppercase"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-text-muted font-medium">Make & Model / Machine Description *</label>
            <input
              type="text"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              placeholder={assetCategory === 'vehicle' ? 'e.g. Toyota HiAce 2.8TD' : 'e.g. Kubota KX018-4 1.8T Excavator'}
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white"
              required
            />
          </div>
        </div>

        {/* Year, Assigned Technician, Charge-out Rate */}
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
            <label className="text-text-muted font-medium">Assigned Operator / Tech</label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full h-9 px-2 bg-card-dark border border-border-dark rounded-xl text-white"
            >
              <option value="">-- Unassigned / Yard --</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-text-muted font-medium">Invoice Charge Rate ($/hr)</label>
            <input
              type="number"
              step="0.01"
              value={hourlyChargeRate}
              onChange={(e) => setHourlyChargeRate(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 120.00"
              className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>
        </div>

        {/* Usage Readings: Hours vs Km */}
        {trackingType === 'hours' ? (
          <div className="space-y-1">
            <label className="text-text-muted font-medium">Current Engine / Meter Hours</label>
            <input
              type="number"
              step="0.1"
              value={currentHours}
              onChange={(e) => setCurrentHours(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 1240.5"
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

        {/* Compliance Dates */}
        {assetCategory === 'vehicle' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-text-muted font-medium">WoF Expiry Date</label>
              <input
                type="date"
                value={wofDate}
                onChange={(e) => setWofDate(e.target.value)}
                className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-muted font-medium">Rego Expiry Date</label>
              <input
                type="date"
                value={regoDate}
                onChange={(e) => setRegoDate(e.target.value)}
                className="w-full h-9 px-3 bg-card-dark border border-border-dark rounded-xl text-white"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-dark">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Add Fleet Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
