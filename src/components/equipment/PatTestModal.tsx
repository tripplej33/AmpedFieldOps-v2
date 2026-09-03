import React, { useState } from 'react'
import type { PatTestLog } from '@/types/equipment'
import Button from '@/components/ui/Button'

interface PatTestModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<PatTestLog>) => Promise<void>
  initialData?: PatTestLog | null
}

export default function PatTestModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: PatTestModalProps) {
  const [applianceName, setApplianceName] = useState(initialData?.appliance_name || '')
  const [barcode, setBarcode] = useState(
    initialData?.barcode || `PAT-${Math.floor(100000 + Math.random() * 900000)}`
  )
  const [locationOrVan, setLocationOrVan] = useState(initialData?.location_or_van || 'Van 1 (Duncan)')
  const [testDate, setTestDate] = useState(
    initialData?.test_date || new Date().toISOString().slice(0, 10)
  )
  const [retestFrequencyMonths, setRetestFrequencyMonths] = useState<number>(
    initialData?.retest_frequency_months || 6
  )
  const [earthPass, setEarthPass] = useState(initialData?.earth_continuity_pass ?? true)
  const [insulationPass, setInsulationPass] = useState(initialData?.insulation_resistance_pass ?? true)
  const [visualPass, setVisualPass] = useState(initialData?.visual_inspection_pass ?? true)
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const overallPass = earthPass && insulationPass && visualPass

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await onSave({
        id: initialData?.id,
        appliance_name: applianceName,
        barcode,
        location_or_van: locationOrVan,
        test_date: testDate,
        retest_frequency_months: retestFrequencyMonths,
        earth_continuity_pass: earthPass,
        insulation_resistance_pass: insulationPass,
        visual_inspection_pass: visualPass,
        overall_result: overallPass ? 'pass' : 'fail',
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
            <span className="material-symbols-outlined text-cyan-400 text-2xl">qr_code_scanner</span>
            <h3 className="text-base font-bold text-white font-display">
              {initialData ? 'Edit PAT Test Record' : 'Log Portable Appliance Test (PAT / Test & Tag)'}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Appliance / Tool Name</label>
            <input
              type="text"
              value={applianceName}
              onChange={(e) => setApplianceName(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              placeholder="e.g. Makita 18V Fast Charger / Extension Lead 20m"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Tag / Barcode #</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Location / Van Assigned</label>
              <input
                type="text"
                value={locationOrVan}
                onChange={(e) => setLocationOrVan(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Test Date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Re-test Frequency</label>
              <select
                value={retestFrequencyMonths}
                onChange={(e) => setRetestFrequencyMonths(parseInt(e.target.value, 10))}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value={3}>3 Months (Construction & Demolition)</option>
                <option value={6}>6 Months (Factories, Workshops, Commercial)</option>
                <option value={12}>12 Months (Standard Environment)</option>
                <option value={24}>24 Months (Low-Risk Office)</option>
              </select>
            </div>
          </div>

          {/* Test Checks Matrix */}
          <div className="p-3 bg-surface-dark/50 border border-border-dark rounded-xl space-y-2.5">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Test Verification Checklist:
            </span>

            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer text-white">
                <span>1. Visual & Physical Cable/Plug Inspection</span>
                <input
                  type="checkbox"
                  checked={visualPass}
                  onChange={(e) => setVisualPass(e.target.checked)}
                  className="rounded border-border-dark bg-background-dark text-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-white">
                <span>2. Earth Continuity Test (&lt; 1.0 Ω)</span>
                <input
                  type="checkbox"
                  checked={earthPass}
                  onChange={(e) => setEarthPass(e.target.checked)}
                  className="rounded border-border-dark bg-background-dark text-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-white">
                <span>3. Insulation Resistance Test (&gt; 1.0 MΩ)</span>
                <input
                  type="checkbox"
                  checked={insulationPass}
                  onChange={(e) => setInsulationPass(e.target.checked)}
                  className="rounded border-border-dark bg-background-dark text-emerald-500 w-4 h-4"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Overall Test Result:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  overallPass
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                {overallPass ? 'PASSED & TAGGED' : 'FAILED - DO NOT USE'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">Notes / Repairs Required</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs"
              placeholder="e.g. Heavy duty plug top replaced and re-tested."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save PAT Test Log'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
