import React, { useState } from 'react'
import { usePlantEquipment } from '@/hooks/usePlantEquipment'
import { useProjects } from '@/hooks/useProjects'
import type { Vehicle } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface LogPlantUsageModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle
  onSuccess?: () => void
}

export default function LogPlantUsageModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: LogPlantUsageModalProps) {
  const { data: projects = [] } = useProjects()
  const { logUsage } = usePlantEquipment()

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [startReading, setStartReading] = useState(
    vehicle.usage_tracking_type === 'hours' ? Number(vehicle.current_hours || 0) : Number(vehicle.current_odometer_km || 0)
  )
  const [endReading, setEndReading] = useState(
    vehicle.usage_tracking_type === 'hours' ? Number(vehicle.current_hours || 0) + 4 : Number(vehicle.current_odometer_km || 0) + 50
  )
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hourlyRate, setHourlyRate] = useState(Number(vehicle.hourly_charge_rate || 0))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const unitsUsed = Math.max(0, endReading - startReading)
  const estimatedCharge = unitsUsed * hourlyRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || unitsUsed <= 0) return

    try {
      setSaving(true)
      await logUsage({
        vehicleId: vehicle.id,
        projectId: selectedProjectId,
        startReading,
        endReading,
        unitsUsed,
        trackingType: vehicle.usage_tracking_type || 'hours',
        hourlyRate,
        date,
        notes: notes || undefined,
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to log plant usage:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Hours / Usage: ${vehicle.make_model}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-surface-dark/50 border border-border-dark rounded-xl flex items-center justify-between">
          <div>
            <span className="text-white font-bold block">{vehicle.make_model}</span>
            <span className="text-text-muted text-[11px] font-mono">{vehicle.registration_number}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase">
            {vehicle.asset_category?.replace('_', ' ')}
          </span>
        </div>

        <div>
          <label className="text-text-muted font-medium block mb-1">Target Project *</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full h-9 px-2 bg-card-dark border border-border-dark rounded-xl text-white"
            required
          >
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-text-muted font-medium block mb-1">Date Operated</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-2.5 bg-card-dark border border-border-dark rounded-xl text-white"
            />
          </div>

          <div>
            <label className="text-text-muted font-medium block mb-1">Hourly Charge Rate ($)</label>
            <input
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-2.5 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-text-muted font-medium block mb-1">
              Start {vehicle.usage_tracking_type === 'hours' ? 'Meter (hrs)' : 'Odometer (km)'}
            </label>
            <input
              type="number"
              step="0.1"
              value={startReading}
              onChange={(e) => setStartReading(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-2.5 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>

          <div>
            <label className="text-text-muted font-medium block mb-1">
              End {vehicle.usage_tracking_type === 'hours' ? 'Meter (hrs)' : 'Odometer (km)'}
            </label>
            <input
              type="number"
              step="0.1"
              value={endReading}
              onChange={(e) => setEndReading(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-2.5 bg-card-dark border border-border-dark rounded-xl text-white font-mono"
            />
          </div>
        </div>

        {/* Calculated Units & Billable Amount */}
        <div className="p-3 bg-card-dark border border-border-dark rounded-xl flex items-center justify-between">
          <div>
            <span className="text-text-muted text-[11px] block">Units to Bill:</span>
            <span className="text-sm font-bold text-white font-mono">
              {unitsUsed.toFixed(1)} {vehicle.usage_tracking_type === 'hours' ? 'hours' : 'km'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-text-muted text-[11px] block">Estimated Charge:</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">${estimatedCharge.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="text-text-muted font-medium block mb-1">Operating Notes / Tasks</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 bg-card-dark border border-border-dark rounded-xl text-white"
            placeholder="e.g. Trenching for 50m submain cable / high pressure water blasting driveway."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !selectedProjectId || unitsUsed <= 0}>
            {saving ? 'Logging...' : 'Record Machine Hours'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
