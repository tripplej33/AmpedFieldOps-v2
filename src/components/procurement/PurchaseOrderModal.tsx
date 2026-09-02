import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ClientSelect from '@/components/ClientSelect'
import { useVehicles } from '@/hooks/useVehicles'
import type { PurchaseOrderFormData, PurchaseOrderItemFormData, Project, CostCenter, Vehicle } from '@/types'

interface PurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PurchaseOrderFormData) => Promise<void>
  projects: Project[]
  costCenters: CostCenter[]
  vehicles?: Vehicle[]
  preselectedProjectId?: string
  preselectedCostCenterId?: string
  preselectedVehicleId?: string
  isPending?: boolean
}

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  costCenters,
  vehicles: passedVehicles,
  preselectedProjectId,
  preselectedCostCenterId,
  preselectedVehicleId,
  isPending = false,
}: PurchaseOrderModalProps) {
  const { vehicles: fetchedVehicles } = useVehicles()
  const vehicles = passedVehicles || fetchedVehicles

  const [orderType, setOrderType] = useState<'project_job' | 'van_restock'>(
    preselectedVehicleId ? 'van_restock' : 'project_job'
  )
  const [projectId, setProjectId] = useState(preselectedProjectId || projects[0]?.id || '')
  const [costCenterId, setCostCenterId] = useState(preselectedCostCenterId || '')
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId || vehicles[0]?.id || '')
  const [vendorId, setVendorId] = useState('')
  const [poNumber, setPoNumber] = useState(`PO-${Math.floor(100000 + Math.random() * 900000)}`)
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<PurchaseOrderItemFormData[]>([
    { item_code: '', description: '', quantity: 1, unit_of_measure: 'EA', unit_cost: 0, notes: '' },
  ])

  const projectCostCenters = costCenters.filter((c) => !projectId || c.project_id === projectId)

  const handleAddItem = () => {
    setItems([
      ...items,
      { item_code: '', description: '', quantity: 1, unit_of_measure: 'EA', unit_cost: 0, notes: '' },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof PurchaseOrderItemFormData, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0
  )
  const gst = subtotal * 0.15
  const total = subtotal + gst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId || !poNumber.trim()) return

    if (orderType === 'project_job' && !projectId) return
    if (orderType === 'van_restock' && !vehicleId) return

    const validItems = items.filter((i) => i.description.trim())
    if (validItems.length === 0) return

    await onSubmit({
      order_type: orderType,
      project_id: orderType === 'project_job' ? projectId : undefined,
      cost_center_id: orderType === 'project_job' ? costCenterId || undefined : undefined,
      vehicle_id: orderType === 'van_restock' ? vehicleId : undefined,
      vendor_id: vendorId,
      po_number: poNumber.trim(),
      order_date: orderDate,
      expected_delivery_date: expectedDeliveryDate || undefined,
      delivery_address: deliveryAddress || undefined,
      delivery_notes: deliveryNotes || undefined,
      notes: notes || undefined,
      items: validItems,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Purchase Order (PO)">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto pr-1 text-xs">
        {/* Destination Type Toggle */}
        <div className="space-y-1.5 bg-background-dark/60 p-3 rounded-xl border border-border-dark/60">
          <label className="block font-semibold text-white">Purchase Order Destination</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('project_job')}
              className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                orderType === 'project_job'
                  ? 'bg-primary/20 border-primary text-white font-semibold'
                  : 'bg-card-dark border-border-dark text-text-muted hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">work</span>
              Project & Job Delivery
            </button>

            <button
              type="button"
              onClick={() => setOrderType('van_restock')}
              className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                orderType === 'van_restock'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                  : 'bg-card-dark border-border-dark text-text-muted hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              Van Restock Delivery
            </button>
          </div>
        </div>

        {/* Project & Cost Center vs Van Selector */}
        {orderType === 'project_job' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block font-medium text-text-muted">
                Project <span className="text-primary">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  setCostCenterId('')
                }}
                required
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-text-muted">Cost Center (Optional)</label>
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                disabled={!projectId || projectCostCenters.length === 0}
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white disabled:opacity-50 focus:outline-none focus:border-primary"
              >
                <option value="">General Project Overhead</option>
                {projectCostCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.customer_po_number ? `(${c.customer_po_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-1 bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-xl">
            <label className="block font-semibold text-cyan-300">
              Select Fleet Van for Mobile Stock Restock <span className="text-primary">*</span>
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select Fleet Vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} - {v.make_model} {v.technician ? `(${v.technician.full_name})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1">
              When this PO is checked off upon delivery, items will automatically replenish this vehicle's van inventory.
            </p>
          </div>
        )}

        {/* Row 2: Vendor & PO Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Supplier / Vendor <span className="text-primary">*</span>
            </label>
            <ClientSelect
              value={vendorId}
              onChange={setVendorId}
              defaultCategory="vendor"
              placeholder="Search or Select Supplier..."
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">
              Purchase Order # <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Row 3: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Order Date</label>
            <input
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-2 pt-2 border-t border-border-dark">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Order Line Items
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-background-dark/80 rounded-xl border border-border-dark/60 space-y-2"
              >
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Code (optional)"
                      value={item.item_code}
                      onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                      className="w-full h-[34px] px-2 bg-card-dark border border-border-dark rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                  <div className="col-span-9">
                    <input
                      type="text"
                      required
                      placeholder="Description (e.g. 2.5mm TPS Cable 100m Drum)"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full h-[34px] px-2 bg-card-dark border border-border-dark rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      placeholder="Qty"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full h-[34px] px-2 bg-card-dark border border-border-dark rounded-lg text-white font-mono text-center"
                    />
                    <select
                      value={item.unit_of_measure}
                      onChange={(e) => handleItemChange(index, 'unit_of_measure', e.target.value)}
                      className="h-[34px] px-2 bg-card-dark border border-border-dark rounded-lg text-white text-[11px]"
                    >
                      <option value="EA">EA</option>
                      <option value="M">M</option>
                      <option value="BOX">BOX</option>
                      <option value="DRUM">DRUM</option>
                      <option value="KG">KG</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-text-muted text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Unit Cost"
                        value={item.unit_cost || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-[34px] pl-6 pr-2 bg-card-dark border border-border-dark rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="col-span-3 text-right font-mono font-semibold text-white">
                    ${((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)).toFixed(2)}
                  </div>

                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-text-muted hover:text-red-400 p-1"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="bg-background-dark/50 p-3 rounded-xl border border-border-dark/60 space-y-1 text-right">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal:</span>
              <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>NZ GST (15%):</span>
              <span className="font-mono text-white">${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-border-dark">
              <span>Total PO Cost:</span>
              <span className="font-mono text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Delivery Address / Destination</label>
            <input
              type="text"
              placeholder="e.g. 12 Queen Street Yard, or Van Hiace ABC123"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-text-muted">Delivery & Packing Instructions</label>
            <input
              type="text"
              placeholder="e.g. Attention Duncan, mark for vehicle restock"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* General Internal Notes */}
        <div className="space-y-1">
          <label className="block font-medium text-text-muted">Internal PO Notes</label>
          <input
            type="text"
            placeholder="e.g. Approved monthly van restock allowance"
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
          <Button type="submit" disabled={isPending || !vendorId}>
            {isPending ? 'Submitting...' : 'Raise Purchase Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
