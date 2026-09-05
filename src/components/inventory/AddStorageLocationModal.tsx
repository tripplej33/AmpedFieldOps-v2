import React, { useState } from 'react'
import { useVehicles } from '@/hooks/useVehicles'
import { useInventoryLocations } from '@/hooks/useInventoryLocations'
import Button from '@/components/ui/Button'
import type { LocationType } from '@/types/inventory'

interface AddStorageLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddStorageLocationModal({
  isOpen,
  onClose,
  onSuccess,
}: AddStorageLocationModalProps) {
  const { vehicles = [] } = useVehicles()
  const { createLocation } = useInventoryLocations()

  const [name, setName] = useState('')
  const [locationType, setLocationType] = useState<LocationType>('workshop')
  const [vehicleId, setVehicleId] = useState<string>('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a storage location name')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await createLocation({
        name: name.trim(),
        location_type: locationType,
        vehicle_id: locationType === 'van' ? (vehicleId || null) : null,
        is_primary: isPrimary,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to create storage location:', err)
      setError(err instanceof Error ? err.message : 'Failed to create storage location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">warehouse</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Add Storage Place / Depot</h2>
              <p className="text-[11px] text-text-muted">
                Create a workshop, site container, yard, or mobile van location.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">
              Location Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Workshop, Bay 2, Penrose Yard, Site Container A"
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">
              Storage Type
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as LocationType)}
              className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="workshop">Workshop / Storage Bay</option>
              <option value="warehouse">Main HQ Warehouse / Depot</option>
              <option value="site_container">Site Storage Container</option>
              <option value="yard">Yard / Outdoor Storage</option>
              <option value="van">Mobile Service Van / Ute</option>
              <option value="other">Other Facility</option>
            </select>
          </div>

          {locationType === 'van' && (
            <div>
              <label className="text-[11px] text-text-muted block mb-1 font-semibold">
                Link to Fleet Vehicle
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="">-- Select Vehicle (Optional) --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.make_model}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-white">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-border-dark bg-background-dark text-primary w-4 h-4"
              />
              <span>Set as Primary Central Warehouse / HQ Depot</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()} className="text-xs font-bold">
              {saving ? 'Creating...' : 'Create Storage Place'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
