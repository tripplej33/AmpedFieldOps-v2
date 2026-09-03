import React, { useState } from 'react'
import type { SwitchboardSchedule, SwitchboardCircuit } from '@/types/compliance'
import { generateSwitchboardSchedulePdf } from '@/lib/pdf/compliancePdfGenerator'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import Button from '@/components/ui/Button'

interface SwitchboardScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<SwitchboardSchedule>) => Promise<void>
  initialData?: SwitchboardSchedule | null
  projectId: string
}

const DEFAULT_CIRCUITS: SwitchboardCircuit[] = [
  { id: 'sb-1', circuitNo: '1', phase: 'Single', breakerRating: '16A', poles: 1, cableSize: '2.5mm²', rcdGroup: 'RCD 1', description: 'Kitchen Power Outlets', isSpare: false },
  { id: 'sb-2', circuitNo: '2', phase: 'Single', breakerRating: '16A', poles: 1, cableSize: '2.5mm²', rcdGroup: 'RCD 1', description: 'Lounge & Dining Power', isSpare: false },
  { id: 'sb-3', circuitNo: '3', phase: 'Single', breakerRating: '10A', poles: 1, cableSize: '1.5mm²', rcdGroup: 'RCD 2', description: 'Internal LED Lighting', isSpare: false },
  { id: 'sb-4', circuitNo: '4', phase: 'Single', breakerRating: '20A', poles: 1, cableSize: '2.5mm²', rcdGroup: 'RCD 2', description: 'Heat Pump / HVAC', isSpare: false },
  { id: 'sb-5', circuitNo: '5', phase: 'Single', breakerRating: '32A', poles: 1, cableSize: '6.0mm²', rcdGroup: 'None', description: 'Induction Cooktop', isSpare: false },
  { id: 'sb-6', circuitNo: '6', phase: 'Single', breakerRating: '16A', poles: 1, cableSize: '2.5mm²', rcdGroup: 'None', description: 'Spare Way', isSpare: true },
]

export default function SwitchboardScheduleModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  projectId,
}: SwitchboardScheduleModalProps) {
  const { profile: companyProfile } = useCompanyProfile()

  const [boardName, setBoardName] = useState(initialData?.board_name || 'Main Switchboard (MSB-1)')
  const [location, setLocation] = useState(initialData?.location || 'Garage Wall / Cupboard')
  const [incomerRating, setIncomerRating] = useState(initialData?.incomer_rating || '63A 1-Phase')
  const [enclosureType, setEnclosureType] = useState(initialData?.enclosure_type || 'Surface Mount IP40 18-Way')
  const [circuits, setCircuits] = useState<SwitchboardCircuit[]>(
    initialData?.circuits?.length ? initialData.circuits : DEFAULT_CIRCUITS
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  // Quick Voltage Drop Calculator State
  const [calcLength, setCalcLength] = useState<string>('25')
  const [calcCurrent, setCalcCurrent] = useState<string>('16')
  const [calcMvPerAm, setCalcMvPerAm] = useState<string>('18') // 2.5mm copper ~ 18 mV/A/m
  const [calcResult, setCalcResult] = useState<number | null>(null)

  if (!isOpen) return null

  const handleAddCircuit = () => {
    const nextNo = (circuits.length + 1).toString()
    setCircuits([
      ...circuits,
      {
        id: crypto.randomUUID(),
        circuitNo: nextNo,
        phase: 'Single',
        breakerRating: '16A',
        poles: 1,
        cableSize: '2.5mm²',
        rcdGroup: 'RCD 1',
        description: `Circuit ${nextNo}`,
        isSpare: false,
      },
    ])
  }

  const handleRemoveCircuit = (index: number) => {
    setCircuits(circuits.filter((_, i) => i !== index))
  }

  const handleCircuitChange = (index: number, field: keyof SwitchboardCircuit, val: any) => {
    const updated = [...circuits]
    updated[index] = { ...updated[index], [field]: val }
    setCircuits(updated)
  }

  const calculateVoltDrop = () => {
    const l = parseFloat(calcLength) || 0
    const i = parseFloat(calcCurrent) || 0
    const mv = parseFloat(calcMvPerAm) || 0
    const vd = (2 * l * i * mv) / 1000
    setCalcResult(parseFloat(vd.toFixed(2)))
  }

  const handlePrintLabels = () => {
    const schedulePayload: SwitchboardSchedule = {
      id: initialData?.id || crypto.randomUUID(),
      project_id: projectId,
      board_name: boardName,
      location,
      incomer_rating: incomerRating,
      enclosure_type: enclosureType,
      circuits,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const pdf = generateSwitchboardSchedulePdf(schedulePayload, companyProfile)
    pdf.save(`${boardName.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.pdf`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await onSave({
        id: initialData?.id,
        project_id: projectId,
        board_name: boardName,
        location,
        incomer_rating: incomerRating,
        enclosure_type: enclosureType,
        circuits,
        notes,
      })
      onClose()
    } catch (err) {
      console.error('Error saving switchboard schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-6 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">table_chart</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                {initialData ? 'Edit Switchboard Directory' : 'New Switchboard Circuit Directory & Schedule'}
              </h2>
              <p className="text-xs text-text-muted">
                Circuit breaker mapping, phase distribution, and printable door sleeve labels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-surface-dark transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-6 pr-2">
          {/* Section 1: Switchboard Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-surface-dark/40 border border-border-dark rounded-xl p-4">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Board Name / Tag</label>
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Main Incomer Rating</label>
              <input
                type="text"
                value={incomerRating}
                onChange={(e) => setIncomerRating(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Enclosure Type / Ways</label>
              <input
                type="text"
                value={enclosureType}
                onChange={(e) => setEnclosureType(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
              />
            </div>
          </div>

          {/* Section 2: Circuit Directory Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">format_list_numbered</span>
                Switchboard Circuits & Directory
              </h3>
              <Button type="button" variant="secondary" onClick={handleAddCircuit} className="text-xs py-1">
                + Add Circuit
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border-dark">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-dark text-text-muted font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border-b border-border-dark">Cct #</th>
                    <th className="p-2 border-b border-border-dark">Phase</th>
                    <th className="p-2 border-b border-border-dark">Breaker Rating</th>
                    <th className="p-2 border-b border-border-dark">Poles</th>
                    <th className="p-2 border-b border-border-dark">Cable Size</th>
                    <th className="p-2 border-b border-border-dark">RCD Group</th>
                    <th className="p-2 border-b border-border-dark">Description / Load</th>
                    <th className="p-2 border-b border-border-dark">Spare?</th>
                    <th className="p-2 border-b border-border-dark"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark bg-background-dark">
                  {circuits.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-surface-dark/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.circuitNo}
                          onChange={(e) => handleCircuitChange(idx, 'circuitNo', e.target.value)}
                          className="w-12 h-7 px-1 bg-surface-dark border border-border-dark rounded text-white text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.phase}
                          onChange={(e) => handleCircuitChange(idx, 'phase', e.target.value)}
                          className="w-20 h-7 px-1 bg-surface-dark border border-border-dark rounded text-white text-xs"
                        >
                          <option value="Single">Single</option>
                          <option value="L1">L1 (Red)</option>
                          <option value="L2">L2 (White)</option>
                          <option value="L3">L3 (Blue)</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.breakerRating}
                          onChange={(e) => handleCircuitChange(idx, 'breakerRating', e.target.value)}
                          className="w-16 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.poles}
                          onChange={(e) => handleCircuitChange(idx, 'poles', parseInt(e.target.value, 10) || 1)}
                          className="w-12 h-7 px-1 bg-surface-dark border border-border-dark rounded text-white text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.cableSize}
                          onChange={(e) => handleCircuitChange(idx, 'cableSize', e.target.value)}
                          className="w-20 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.rcdGroup || ''}
                          onChange={(e) => handleCircuitChange(idx, 'rcdGroup', e.target.value)}
                          className="w-20 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleCircuitChange(idx, 'description', e.target.value)}
                          className="w-48 h-7 px-2 bg-surface-dark border border-border-dark rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={row.isSpare}
                          onChange={(e) => handleCircuitChange(idx, 'isSpare', e.target.checked)}
                          className="rounded border-border-dark bg-surface-dark text-primary"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveCircuit(idx)}
                          className="text-text-muted hover:text-red-400 p-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Quick Voltage Drop Calculator */}
          <div className="bg-surface-dark/40 border border-border-dark rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-base">calculate</span>
                Quick Voltage Drop Calculator (AS/NZS 3000 max 5% / 11.5V)
              </h4>
              <button
                type="button"
                onClick={calculateVoltDrop}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
              >
                Calculate Vd
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-text-muted block">Run Length (m)</label>
                <input
                  type="number"
                  value={calcLength}
                  onChange={(e) => setCalcLength(e.target.value)}
                  className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block">Design Current (A)</label>
                <input
                  type="number"
                  value={calcCurrent}
                  onChange={(e) => setCalcCurrent(e.target.value)}
                  className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block">mV/A/m factor</label>
                <input
                  type="number"
                  value={calcMvPerAm}
                  onChange={(e) => setCalcMvPerAm(e.target.value)}
                  className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded text-white"
                />
              </div>
              <div className="p-2 rounded bg-background-dark border border-border-dark flex flex-col justify-center">
                <span className="text-[10px] text-text-muted">Calculated Drop:</span>
                <span className={`text-sm font-bold ${calcResult && calcResult > 11.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {calcResult !== null ? `${calcResult} V (${((calcResult / 230) * 100).toFixed(1)}%)` : 'Click Calculate'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: General Notes */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Switchboard Notes & Feed Details</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs"
              placeholder="e.g. Sub-board fed from MSB-1 via 16mm² 4C XLPE/SWA cable on 50A breaker."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border-dark flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrintLabels}
              className="text-xs flex items-center gap-1.5 bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Export Printable Switchboard Schedule (PDF)
            </Button>

            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Switchboard Directory'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
