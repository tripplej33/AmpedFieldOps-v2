import React, { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useVehicles } from '@/hooks/useVehicles'
import { useInventoryLocations } from '@/hooks/useInventoryLocations'
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

  const handleResetAndClose = () => {
    if (saving) return
    setName('')
    setLocationType('workshop')
    setVehicleId('')
    setIsPrimary(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please provide a storage location name')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await createLocation({
        name: trimmedName,
        location_type: locationType || 'workshop',
        vehicle_id: locationType === 'van' ? (vehicleId || null) : null,
        is_primary: isPrimary,
      })
      onSuccess?.()
      handleResetAndClose()
    } catch (err) {
      console.error('Failed to create storage location:', err)
      setError(err instanceof Error ? err.message : 'Failed to create storage location')
    } finally {
      setSaving(false)
    }
  }

  const modalFooter = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleResetAndClose}
        disabled={saving}
        className="text-xs"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !name.trim()}
        className="text-xs font-bold"
      >
        {saving ? 'Creating...' : 'Create Storage Place'}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Add Storage Place / Depot"
      size="sm"
      footer={modalFooter}
    >
      <div className="space-y-4 text-xs">
        <p className="text-[11px] text-text-muted">
          Create a workshop, yard, site container, central warehouse depot, or mobile fleet van.
        </p>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
              className="w-full h-9 px-3 bg-background-dark border border-border-dark rounded-lg text-white placeholder-text-muted/50 focus:outline-none focus:border-primary text-xs"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">
              Storage Type
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as LocationType)}
              className="w-full h-9 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary text-xs"
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
                className="w-full h-9 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs"
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
            <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-white select-none">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-border-dark bg-background-dark text-primary w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium">Set as Primary Central Warehouse / HQ Depot</span>
            </label>
            {isPrimary && (
              <p className="text-[10px] text-amber-400 mt-1 pl-6">
                This location will become the default destination for POs and company stock takes.
              </p>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
