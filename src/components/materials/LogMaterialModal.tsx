import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useInventory } from '@/hooks/useInventory'
import { useVehicles } from '@/hooks/useVehicles'
import { useVanStock } from '@/hooks/useVanStock'
import type { ProjectMaterialFormData, Project, CostCenter } from '@/types'

interface LogMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectMaterialFormData) => Promise<void>
  project: Project
  costCenters: CostCenter[]
  isPending?: boolean
}

export default function LogMaterialModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  costCenters,
  isPending = false,
}: LogMaterialModalProps) {
  const { items: catalogItems } = useInventory()
  const { vehicles } = useVehicles()

  const [source, setSource] = useState<'van_stock' | 'warehouse' | 'direct_po'>('van_stock')
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '')
  const { stock: vanStock } = useVanStock(selectedVehicleId)

  const [costCenterId, setCostCenterId] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitOfMeasure, setUnitOfMeasure] = useState('EA')
  const [unitCost, setUnitCost] = useState<number>(0)
  const [chargeRate, setChargeRate] = useState<number>(0)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [vehicles, selectedVehicleId])

  // When catalog item is picked
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId)
    const item = catalogItems.find((i) => i.id === itemId)
    if (item) {
      setCustomDescription(item.name)
      setUnitOfMeasure(item.unit_of_measure)
      setUnitCost(item.unit_cost)
      setChargeRate(item.default_charge_rate)
    }
  }

  // When Van Stock item is picked
  const handleVanStockSelect = (vanStockId: string) => {
    const vItem = vanStock.find((s) => s.id === vanStockId)
    if (vItem && vItem.item) {
      setSelectedItemId(vItem.item.id)
      setCustomDescription(vItem.item.name)
      setUnitOfMeasure(vItem.item.unit_of_measure)
      setUnitCost(vItem.item.unit_cost)
      setChargeRate(vItem.item.default_charge_rate)
    }
  }

  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0)
  const totalCharge = (Number(quantity) || 0) * (Number(chargeRate) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customDescription.trim()) return

    await onSubmit({
      project_id: project.id,
      cost_center_id: costCenterId || undefined,
      inventory_item_id: selectedItemId || undefined,
      description: customDescription.trim(),
      quantity_used: Number(quantity) || 1,
      unit_of_measure: unitOfMeasure,
      unit_cost: Number(unitCost) || 0,
      charge_out_rate: Number(chargeRate) || 0,
      source,
      vehicle_id: source === 'van_stock' ? selectedVehicleId || undefined : undefined,
      entry_date: entryDate,
      notes: notes.trim() || undefined,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Materials to ${project.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Source Segment: Van Stock | Warehouse | Direct PO */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Material Source</label>
          <div className="grid grid-cols-3 gap-1 bg-background-dark p-1 rounded-lg border border-border-dark">
            <button
              type="button"
              onClick={() => setSource('van_stock')}
              className={`py-1.5 rounded text-xs font-semibold transition-all ${
                source === 'van_stock'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Van Stock
            </button>
            <button
              type="button"
              onClick={() => setSource('warehouse')}
              className={`py-1.5 rounded text-xs font-semibold transition-all ${
                source === 'warehouse'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Warehouse
            </button>
            <button
              type="button"
              onClick={() => setSource('direct_po')}
              className={`py-1.5 rounded text-xs font-semibold transition-all ${
                source === 'direct_po'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Direct PO / Site Drop
            </button>
          </div>
        </div>

        {/* If Van Stock: Vehicle Selector */}
        {source === 'van_stock' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card-dark p-3 rounded-xl border border-border-dark">
            <div className="space-y-1">
              <label className="block font-medium text-text-muted">Select Service Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.make_model}{' '}
                    {v.technician ? `(${v.technician.full_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-text-muted">Pick from Available Van Stock</label>
              <select
                onChange={(e) => handleVanStockSelect(e.target.value)}
                className="w-full h-[36px] px-2.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
              >
                <option value="">Choose item on van ({vanStock.length} items)...</option>
                {vanStock.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.item?.name} — Qty: {s.quantity_on_hand} {s.item?.unit_of_measure}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Or Catalog Item Quick Select */}
        {source !== 'van_stock' && (
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Master Catalog Quick-Select</label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full h-[36px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
            >
              <option value="">Select standard catalog item or type custom below...</option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.category}] {item.name} (${item.unit_cost.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cost Center & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Allocated Cost Center</label>
            <select
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">General Project Scope</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name} {cc.customer_po_number ? `(${cc.customer_po_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Date Used</label>
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-medium text-text-muted">
            Material Description <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 2.5mm TPS Cable, 4x Downlights"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          />
        </div>

        {/* Quantity, Unit Cost & Charge-Out Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Qty Used</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full h-[38px] px-2 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-center text-xs focus:outline-none focus:border-primary"
              />
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="h-[38px] px-1 bg-background-dark border border-border-dark rounded-lg text-text-muted text-[11px]"
              >
                <option value="EA">EA</option>
                <option value="M">M</option>
                <option value="DRUM">DRUM</option>
                <option value="BOX">BOX</option>
                <option value="PACK">PACK</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Unit Cost (Buy)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-text-muted font-mono text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full h-[38px] pl-6 pr-2 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Charge Rate (Sell)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-text-muted font-mono text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={chargeRate}
                onChange={(e) => setChargeRate(parseFloat(e.target.value) || 0)}
                className="w-full h-[38px] pl-6 pr-2 bg-background-dark border border-border-dark rounded-lg text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Total Cost / Sell</label>
            <div className="h-[38px] px-2.5 bg-background-dark border border-border-dark rounded-lg flex items-center justify-between font-mono font-bold text-xs">
              <span className="text-white">Cost: ${totalCost.toFixed(2)}</span>
              <span className="text-primary">Sell: ${totalCharge.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Job Notes</label>
          <input
            type="text"
            placeholder="e.g. Installed in Master Bedroom ceiling"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
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
          <Button type="submit" disabled={isPending || !customDescription.trim()}>
            {isPending ? 'Logging Material...' : 'Log Material to Job'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
