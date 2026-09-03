import React, { useState } from 'react'
import type { EquipmentItem, EquipmentType, EquipmentStatus } from '@/types/equipment'
import Button from '@/components/ui/Button'
import { useUsers } from '@/hooks/useUsers'

interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Partial<EquipmentItem>) => Promise<void>
  initialData?: EquipmentItem | null
}

export default function EquipmentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EquipmentModalProps) {
  const { data: users } = useUsers()

  const [equipmentName, setEquipmentName] = useState(initialData?.equipment_name || '')
  const [assetTag, setAssetTag] = useState(initialData?.asset_tag || '')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number || '')
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(initialData?.equipment_type || 'mft')
  const [lastCalibrationDate, setLastCalibrationDate] = useState(
    initialData?.last_calibration_date || new Date().toISOString().slice(0, 10)
  )
  const [calibrationExpiryDate, setCalibrationExpiryDate] = useState(() => {
    if (initialData?.calibration_expiry_date) return initialData.calibration_expiry_date
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    return nextYear.toISOString().slice(0, 10)
  })
  const [status, setStatus] = useState<EquipmentStatus>(initialData?.status || 'valid')
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assigned_user_id || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await onSave({
        id: initialData?.id,
        equipment_name: equipmentName,
        asset_tag: assetTag || null,
        serial_number: serialNumber,
        equipment_type: equipmentType,
        last_calibration_date: lastCalibrationDate || null,
        calibration_expiry_date: calibrationExpiryDate || null,
        status,
        assigned_user_id: assignedUserId || null,
        notes: notes || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border-dark pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-2xl">precision_manufacturing</span>
            <h3 className="text-base font-bold text-white font-display">
              {initialData ? 'Edit Test Instrument' : 'Register Test Instrument'}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Equipment / Model Name</label>
            <input
              type="text"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              placeholder="e.g. Fluke 1664 FC Multifunction Tester"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Asset Tag</label>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                placeholder="e.g. EQ-001"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                placeholder="e.g. FLK-99281"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Equipment Category</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="mft">Multifunction Installation Tester (MFT)</option>
                <option value="insulation">Insulation & Continuity Tester</option>
                <option value="pat">PAT / Portable Appliance Tester</option>
                <option value="clamp">Clamp Meter / Current Probes</option>
                <option value="gas_detector">Gas Leak Detector / Sniffer</option>
                <option value="other">Other Test Instrument</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Calibration Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="valid">Valid Calibration</option>
                <option value="due_soon">Calibration Due Soon</option>
                <option value="expired">Expired / Do Not Use</option>
                <option value="out_for_service">Out for Service / Lab</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Last Calibration Date</label>
              <input
                type="date"
                value={lastCalibrationDate}
                onChange={(e) => setLastCalibrationDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Calibration Expiry Date</label>
              <input
                type="date"
                value={calibrationExpiryDate}
                onChange={(e) => setCalibrationExpiryDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">Assigned Technician</label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
            >
              <option value="">-- Unassigned / Workshop Store --</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs"
              placeholder="e.g. Calibrated by Teltherm Instruments NZ with calibration cert #CAL-2026-99"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Equipment Record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
