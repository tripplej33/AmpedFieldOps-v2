import React, { useState } from 'react'
import type { ElectricalTestSheet, CircuitTestRow, BondingChecks } from '@/types/compliance'
import Button from '@/components/ui/Button'

interface TestSheetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<ElectricalTestSheet>) => Promise<void>
  initialData?: ElectricalTestSheet | null
  projectId: string
}

const DEFAULT_BONDING: BondingChecks = {
  water: true,
  gas: false,
  waste: false,
  structural: false,
}

const DEFAULT_CIRCUITS: CircuitTestRow[] = [
  {
    id: 'cct-1',
    circuitNumber: '1',
    description: 'Kitchen Power Outlets',
    cableSize: '2.5mm²',
    breakerRating: '16A',
    breakerType: 'Type C MCB',
    rcdRating: '30mA',
    rpe: 0.18,
    rins: 50.0,
    polarity: true,
    zs: 0.42,
    rcdTripTime: 24,
    rcdTripCurrent: 28,
    pass: true,
  },
  {
    id: 'cct-2',
    circuitNumber: '2',
    description: 'Living & Bedroom Lighting',
    cableSize: '1.5mm²',
    breakerRating: '10A',
    breakerType: 'Type C MCB',
    rcdRating: '30mA',
    rpe: 0.22,
    rins: 50.0,
    polarity: true,
    zs: 0.55,
    rcdTripTime: 26,
    rcdTripCurrent: 28,
    pass: true,
  },
  {
    id: 'cct-3',
    circuitNumber: '3',
    description: 'Heat Pump / Air Conditioning',
    cableSize: '2.5mm²',
    breakerRating: '20A',
    breakerType: 'Type C MCB',
    rcdRating: '30mA',
    rpe: 0.15,
    rins: 50.0,
    polarity: true,
    zs: 0.38,
    rcdTripTime: 22,
    rcdTripCurrent: 27,
    pass: true,
  },
]

export default function TestSheetModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  projectId,
}: TestSheetModalProps) {
  const [title, setTitle] = useState(initialData?.title || 'AS/NZS 3000 Verification Test Sheet')
  const [supplySystem, setSupplySystem] = useState(initialData?.supply_system || 'MEN')
  const [voltage, setVoltage] = useState(initialData?.voltage || '230V / 400V 50Hz')
  const [mainSwitchRating, setMainSwitchRating] = useState(initialData?.main_switch_rating || '63A')
  const [mainEarthResistance, setMainEarthResistance] = useState(
    initialData?.main_earth_resistance?.toString() || '0.5'
  )
  const [earthElectrodeType, setEarthElectrodeType] = useState(
    initialData?.earth_electrode_type || 'Driven Copper Rod'
  )
  const [bondingChecks, setBondingChecks] = useState<BondingChecks>(
    initialData?.bonding_checks || DEFAULT_BONDING
  )
  const [circuits, setCircuits] = useState<CircuitTestRow[]>(
    initialData?.circuits?.length ? initialData.circuits : DEFAULT_CIRCUITS
  )
  const [testerModel, setTesterModel] = useState(
    initialData?.tester_model || 'Fluke 1664 FC Multifunction Tester'
  )
  const [testerSerialNumber, setTesterSerialNumber] = useState(
    initialData?.tester_serial_number || 'FLK-992140'
  )
  const [comments, setComments] = useState(initialData?.comments || '')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleAddCircuit = () => {
    const newNo = (circuits.length + 1).toString()
    setCircuits([
      ...circuits,
      {
        id: crypto.randomUUID(),
        circuitNumber: newNo,
        description: `Circuit ${newNo}`,
        cableSize: '2.5mm²',
        breakerRating: '16A',
        breakerType: 'Type C MCB',
        rcdRating: '30mA',
        rpe: 0.2,
        rins: 50.0,
        polarity: true,
        zs: 0.45,
        rcdTripTime: 25,
        rcdTripCurrent: 28,
        pass: true,
      },
    ])
  }

  const handleRemoveCircuit = (index: number) => {
    setCircuits(circuits.filter((_, i) => i !== index))
  }

  const handleCircuitChange = (index: number, field: keyof CircuitTestRow, val: any) => {
    const updated = [...circuits]
    updated[index] = { ...updated[index], [field]: val }

    // Auto-compute pass/fail check
    if (field === 'rins' || field === 'rcdTripTime' || field === 'polarity') {
      const rins = field === 'rins' ? Number(val) : updated[index].rins
      const rcdTime = field === 'rcdTripTime' ? Number(val) : updated[index].rcdTripTime
      const pol = field === 'polarity' ? Boolean(val) : updated[index].polarity

      const isPass =
        (rins === null || rins === undefined || rins >= 1.0) &&
        (rcdTime === null || rcdTime === undefined || rcdTime <= 300) &&
        pol
      updated[index].pass = isPass
    }

    setCircuits(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await onSave({
        id: initialData?.id,
        project_id: projectId,
        title,
        supply_system: supplySystem,
        voltage,
        main_switch_rating: mainSwitchRating,
        main_earth_resistance: parseFloat(mainEarthResistance) || 0.5,
        earth_electrode_type: earthElectrodeType,
        bonding_checks: bondingChecks,
        circuits,
        tester_model: testerModel,
        tester_serial_number: testerSerialNumber,
        comments,
      })
      onClose()
    } catch (err) {
      console.error('Error saving test sheet:', err)
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">electrical_services</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                {initialData ? 'Edit AS/NZS 3000 Test Sheet' : 'New AS/NZS 3000 Verification Test Sheet'}
              </h2>
              <p className="text-xs text-text-muted">
                Mandatory verification testing for earth continuity, insulation resistance, polarity, and RCDs
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
          {/* Section 1: Supply & Earthing Parameters */}
          <div className="bg-surface-dark/40 border border-border-dark rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">power</span>
              Supply & Main Earthing System
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Sheet Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-text-muted block mb-1">Earthing System</label>
                <select
                  value={supplySystem}
                  onChange={(e) => setSupplySystem(e.target.value)}
                  className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
                >
                  <option value="MEN">MEN (Multiple Earthed Neutral)</option>
                  <option value="TT">TT System</option>
                  <option value="TN-S">TN-S System</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-text-muted block mb-1">Main Earth Resistance (Ω)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mainEarthResistance}
                  onChange={(e) => setMainEarthResistance(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-muted block mb-1">Supply Voltage</label>
                <input
                  type="text"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-muted block mb-1">Main Switch Rating</label>
                <input
                  type="text"
                  value={mainSwitchRating}
                  onChange={(e) => setMainSwitchRating(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-muted block mb-1">Electrode Type</label>
                <input
                  type="text"
                  value={earthElectrodeType}
                  onChange={(e) => setEarthElectrodeType(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>
            </div>

            {/* Main Equipotential Bonding Checks */}
            <div className="pt-2 border-t border-border-dark/60">
              <span className="text-[11px] font-bold text-text-muted block mb-2">
                Equipotential Bonding Verified:
              </span>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={bondingChecks.water}
                    onChange={(e) => setBondingChecks({ ...bondingChecks, water: e.target.checked })}
                    className="rounded border-border-dark bg-background-dark text-primary"
                  />
                  Metallic Water Pipe
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={bondingChecks.gas}
                    onChange={(e) => setBondingChecks({ ...bondingChecks, gas: e.target.checked })}
                    className="rounded border-border-dark bg-background-dark text-primary"
                  />
                  Gas Supply Pipe
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={bondingChecks.structural}
                    onChange={(e) => setBondingChecks({ ...bondingChecks, structural: e.target.checked })}
                    className="rounded border-border-dark bg-background-dark text-primary"
                  />
                  Structural Steel
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Circuit Testing Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">checklist</span>
                Circuit Verification Matrix (AS/NZS 3000)
              </h3>
              <Button type="button" variant="secondary" onClick={handleAddCircuit} className="text-xs py-1">
                + Add Circuit Row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border-dark">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-dark text-text-muted font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border-b border-border-dark">Cct #</th>
                    <th className="p-2 border-b border-border-dark">Description</th>
                    <th className="p-2 border-b border-border-dark">Breaker</th>
                    <th className="p-2 border-b border-border-dark">Rpe (Ω)</th>
                    <th className="p-2 border-b border-border-dark">Rins (MΩ)</th>
                    <th className="p-2 border-b border-border-dark">Polarity</th>
                    <th className="p-2 border-b border-border-dark">Zs (Ω)</th>
                    <th className="p-2 border-b border-border-dark">RCD (ms)</th>
                    <th className="p-2 border-b border-border-dark">Result</th>
                    <th className="p-2 border-b border-border-dark"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark bg-background-dark">
                  {circuits.map((row, idx) => {
                    const isLowInsulation = row.rins !== null && row.rins !== undefined && row.rins < 1.0
                    const isHighRcdTime = row.rcdTripTime !== null && row.rcdTripTime !== undefined && row.rcdTripTime > 300

                    return (
                      <tr key={row.id || idx} className="hover:bg-surface-dark/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.circuitNumber}
                            onChange={(e) => handleCircuitChange(idx, 'circuitNumber', e.target.value)}
                            className="w-12 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white text-center font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleCircuitChange(idx, 'description', e.target.value)}
                            className="w-40 h-7 px-2 bg-surface-dark border border-border-dark rounded text-white"
                          />
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
                            step="0.01"
                            value={row.rpe ?? ''}
                            onChange={(e) => handleCircuitChange(idx, 'rpe', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={row.rins ?? ''}
                            onChange={(e) => handleCircuitChange(idx, 'rins', e.target.value ? parseFloat(e.target.value) : null)}
                            className={`w-16 h-7 px-1.5 bg-surface-dark border rounded font-mono ${
                              isLowInsulation ? 'border-red-500 text-red-400 font-bold' : 'border-border-dark text-white'
                            }`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={row.polarity}
                            onChange={(e) => handleCircuitChange(idx, 'polarity', e.target.checked)}
                            className="rounded border-border-dark bg-surface-dark text-primary"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={row.zs ?? ''}
                            onChange={(e) => handleCircuitChange(idx, 'zs', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 h-7 px-1.5 bg-surface-dark border border-border-dark rounded text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.rcdTripTime ?? ''}
                            onChange={(e) => handleCircuitChange(idx, 'rcdTripTime', e.target.value ? parseInt(e.target.value, 10) : null)}
                            className={`w-16 h-7 px-1.5 bg-surface-dark border rounded font-mono ${
                              isHighRcdTime ? 'border-red-500 text-red-400 font-bold' : 'border-border-dark text-white'
                            }`}
                          />
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.pass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {row.pass ? 'PASS' : 'FAIL'}
                          </span>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Test Instrument Calibration & Notes */}
          <div className="space-y-3 bg-surface-dark/40 border border-border-dark rounded-xl p-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Test Instrument Model</label>
                <input
                  type="text"
                  value={testerModel}
                  onChange={(e) => setTesterModel(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Tester Serial / Calibration Ref</label>
                <input
                  type="text"
                  value={testerSerialNumber}
                  onChange={(e) => setTesterSerialNumber(e.target.value)}
                  className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Verification Comments & Observations</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs"
                placeholder="e.g. Visual inspection passed, MEN link confirmed, earthing tested to standard."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-dark">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving Test Sheet...' : 'Save AS/NZS 3000 Test Sheet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
