import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Vehicle, VehicleCheckSheetFormData } from '@/types'

interface VehicleCheckSheetModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle
  onSubmit: (data: VehicleCheckSheetFormData) => Promise<void>
  isPending?: boolean
}

export default function VehicleCheckSheetModal({
  isOpen,
  onClose,
  vehicle,
  onSubmit,
  isPending = false,
}: VehicleCheckSheetModalProps) {
  const [odometer, setOdometer] = useState<number>(vehicle.current_odometer_km || 0)
  const [oilLevel, setOilLevel] = useState<'pass' | 'fail'>('pass')
  const [coolantLevel, setCoolantLevel] = useState<'pass' | 'fail'>('pass')
  const [brakeFluid, setBrakeFluid] = useState<'pass' | 'fail'>('pass')
  const [tireTread, setTireTread] = useState<'pass' | 'fail'>('pass')
  const [cleanliness, setCleanliness] = useState<'pass' | 'fail'>('pass')
  const [lights, setLights] = useState<'pass' | 'fail'>('pass')
  const [notes, setNotes] = useState('')

  const checkItems = [
    { label: 'Engine Oil Level', value: oilLevel, setter: setOilLevel, icon: 'oil_barrel' },
    { label: 'Engine Coolant Level', value: coolantLevel, setter: setCoolantLevel, icon: 'ac_unit' },
    { label: 'Brake Fluid Level', value: brakeFluid, setter: setBrakeFluid, icon: 'do_not_disturb_on' },
    { label: 'Tire Pressure & Tread Depth', value: tireTread, setter: setTireTread, icon: 'tire_repair' },
    { label: 'Exterior Lights & Indicators', value: lights, setter: setLights, icon: 'lightbulb' },
    { label: 'Van Cleanliness & Cab Order', value: cleanliness, setter: setCleanliness, icon: 'cleaning_services' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      vehicle_id: vehicle.id,
      odometer_km: Number(odometer) || 0,
      oil_level: oilLevel,
      coolant_level: coolantLevel,
      brake_fluid: brakeFluid,
      tire_tread_and_pressure: tireTread,
      exterior_cleanliness: cleanliness,
      lights_and_indicators: lights,
      notes: notes.trim() || undefined,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vehicle Inspection: ${vehicle.registration_number} (${vehicle.make_model})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Current Odometer */}
        <div className="space-y-1 bg-background-dark p-3 rounded-xl border border-border-dark">
          <label className="block font-medium text-text-muted">
            Current Odometer (KM) <span className="text-primary">*</span>
          </label>
          <input
            type="number"
            required
            value={odometer}
            onChange={(e) => setOdometer(parseFloat(e.target.value) || 0)}
            className="w-full h-[38px] px-3 bg-card-dark border border-border-dark rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* 6 Touch Check items */}
        <div className="space-y-2">
          <label className="block font-semibold text-white uppercase tracking-wider text-[11px]">
            Monthly Vehicle Health Checklist
          </label>

          <div className="space-y-2">
            {checkItems.map((item, index) => (
              <div
                key={index}
                className="bg-card-dark p-3 rounded-xl border border-border-dark flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                  <span className="font-semibold text-white text-xs">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => item.setter('pass')}
                    className={`h-[32px] px-3 rounded-lg text-xs font-bold border transition-all ${
                      item.value === 'pass'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/30'
                        : 'bg-background-dark text-text-muted hover:text-white border-border-dark'
                    }`}
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => item.setter('fail')}
                    className={`h-[32px] px-3 rounded-lg text-xs font-bold border transition-all ${
                      item.value === 'fail'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 ring-1 ring-red-500/30'
                        : 'bg-background-dark text-text-muted hover:text-white border-border-dark'
                    }`}
                  >
                    Attention / Fail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Damage Description */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Inspection Notes / Maintenance Needs</label>
          <textarea
            rows={2}
            placeholder="Report any new scratches, tire wear, warning lights, or upcoming servicing..."
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
          <Button type="submit" disabled={isPending || odometer <= 0}>
            {isPending ? 'Recording Check Sheet...' : 'Submit Inspection Check Sheet'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
