import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useVehicles } from '@/hooks/useVehicles'
import { useVanStock, useAdjustVanStock } from '@/hooks/useVanStock'
import { useProjects } from '@/hooks/useProjects'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import VanStockTable from '@/components/vanstock/VanStockTable'
import AddVanStockItemModal from '@/components/vanstock/AddVanStockItemModal'
import PurchaseOrderModal from '@/components/procurement/PurchaseOrderModal'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { PurchaseOrderFormData } from '@/types'

export default function VanStockPage() {
  const { user } = useAuth()
  const { isAdmin, isManager } = usePermissions()
  const { vehicles, loading: vehiclesLoading } = useVehicles()

  // Filter accessible vehicles based on user role
  const isElevated = isAdmin || isManager
  const accessibleVehicles = isElevated
    ? vehicles
    : vehicles.filter((v) => v.assigned_technician_id === user?.id)

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const { stock, loading: stockLoading, refresh: refreshStock } = useVanStock(selectedVehicleId)
  const { adjustStock, addStockItem } = useAdjustVanStock()

  const { data: projects = [] } = useProjects()
  const { data: costCenters = [] } = useCostCenters('')
  const { create: createPO, isPending: isPOCreating } = useCreatePurchaseOrder()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (accessibleVehicles.length > 0) {
      if (!selectedVehicleId || !accessibleVehicles.some((v) => v.id === selectedVehicleId)) {
        setSelectedVehicleId(accessibleVehicles[0].id)
      }
    } else {
      setSelectedVehicleId('')
    }
  }, [accessibleVehicles, selectedVehicleId])

  const selectedVehicle = accessibleVehicles.find((v) => v.id === selectedVehicleId)

  const handleAdjustStock = async (id: string, newQty: number) => {
    try {
      await adjustStock(id, newQty)
      await refreshStock()
      setToast({ type: 'success', message: 'Van stock quantity updated' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update stock' })
    }
  }

  const handleAddStockItem = async (
    vehicleId: string,
    itemId: string,
    qty: number,
    targetQty: number
  ) => {
    try {
      await addStockItem(vehicleId, itemId, qty, targetQty)
      await refreshStock()
      setToast({ type: 'success', message: 'Item added to van stock' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to add item to van' })
    }
  }

  const handleCreateRestockPO = async (data: PurchaseOrderFormData) => {
    try {
      await createPO(data)
      setIsPOModalOpen(false)
      setToast({ type: 'success', message: `Restock PO ${data.po_number} raised for van delivery` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to raise restock PO' })
    }
  }

  const totalItemsCount = stock.reduce((sum, s) => sum + Number(s.quantity_on_hand || 0), 0)
  const lowStockCount = stock.filter(
    (s) => s.quantity_on_hand <= (s.item?.min_reorder_level || 3)
  ).length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-4xl text-primary">local_shipping</span>
            Mobile Van Stock & Inventory
          </h1>
          <p className="text-text-muted text-xs mt-1">
            {isElevated
              ? 'Manage and audit mobile stock levels across all company fleet vehicles'
              : `Stock take and restock materials for your assigned vehicle (${selectedVehicle?.registration_number || 'Van'})`}
          </p>
        </div>

        {selectedVehicle && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setIsPOModalOpen(true)}
              disabled={!selectedVehicleId}
              className="flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-cyan-400">shopping_cart</span>
              Raise Van Restock PO
            </Button>

            <Button onClick={() => setIsAddModalOpen(true)} disabled={!selectedVehicleId}>
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add Catalog Item
            </Button>
          </div>
        )}
      </div>

      {/* Vehicles Selector / Assigned Notice */}
      {vehiclesLoading ? (
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 text-xs text-text-muted">
          Loading fleet vehicles...
        </div>
      ) : accessibleVehicles.length === 0 ? (
        <div className="bg-card-dark border border-dashed border-border-dark rounded-2xl p-8 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-amber-400 block">no_crash</span>
          <h3 className="text-base font-bold text-white">No Vehicle Assigned to Your Account</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
            You are signed in as a field technician. You can only perform stock takes and raise restock POs for your designated van. Please ask your administrator to assign a vehicle to your name in Fleet Management.
          </p>
        </div>
      ) : isElevated ? (
        /* Manager / Admin Switcher Bar */
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-white uppercase tracking-wider">
              Fleet Vehicle Switcher ({accessibleVehicles.length} Vehicles)
            </label>
            <span className="text-[10px] text-text-muted font-mono">ADMIN VIEW</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {accessibleVehicles.map((v) => {
              const isSelected = v.id === selectedVehicleId

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 min-w-[200px] ${
                    isSelected
                      ? 'bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40'
                      : 'bg-background-dark border-border-dark hover:border-border-dark/80 text-text-muted hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-white">
                      {v.registration_number}
                    </span>
                    <span className="material-symbols-outlined text-primary text-sm">
                      directions_car
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white/90 truncate mt-0.5">{v.make_model}</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">
                    {v.technician ? v.technician.full_name : 'Unassigned'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Technician Assigned Vehicle Header Bar */
        <div className="bg-gradient-to-r from-primary/15 via-card-dark to-card-dark border border-primary/30 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">directions_car</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">
                  {selectedVehicle?.registration_number}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  Your Assigned Van
                </span>
              </div>
              <p className="text-xs text-text-muted">{selectedVehicle?.make_model}</p>
            </div>
          </div>

          <div className="text-xs text-text-muted font-mono">
            Assigned to: <strong className="text-white">{user?.full_name || user?.email}</strong>
          </div>
        </div>
      )}

      {/* KPI Cards for Selected Van */}
      {selectedVehicle && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
            <span className="text-text-muted text-xs uppercase font-semibold">Total Stock Units</span>
            <p className="text-white text-2xl font-bold font-mono mt-1">{totalItemsCount} Units</p>
            <p className="text-xs text-text-muted mt-1">Across {stock.length} unique items</p>
          </div>

          <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
            <span className="text-text-muted text-xs uppercase font-semibold">Low Stock Warnings</span>
            <p
              className={`text-2xl font-bold font-mono mt-1 ${
                lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {lowStockCount} Items
            </p>
            <p className="text-xs text-text-muted mt-1">Below minimum reorder threshold</p>
          </div>

          <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
            <span className="text-text-muted text-xs uppercase font-semibold">Assigned Driver</span>
            <p className="text-primary text-xl font-bold mt-1">
              {selectedVehicle.technician?.full_name || user?.full_name || 'Assigned Staff'}
            </p>
            <p className="text-xs text-text-muted mt-1 font-mono">
              Rego: {selectedVehicle.registration_number}
            </p>
          </div>
        </div>
      )}

      {/* Van Stock Table */}
      {selectedVehicle && (
        <VanStockTable
          stock={stock}
          loading={stockLoading}
          onAdjustStock={handleAdjustStock}
          onRefresh={refreshStock}
        />
      )}

      {/* Add Stock Item Modal */}
      {isAddModalOpen && selectedVehicle && (
        <AddVanStockItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          vehicleId={selectedVehicle.id}
          vehicleName={`${selectedVehicle.registration_number} (${selectedVehicle.make_model})`}
          onAddStockItem={handleAddStockItem}
        />
      )}

      {/* Raise Van Restock PO Modal */}
      {isPOModalOpen && selectedVehicle && (
        <PurchaseOrderModal
          isOpen={isPOModalOpen}
          onClose={() => setIsPOModalOpen(false)}
          onSubmit={handleCreateRestockPO}
          projects={projects}
          costCenters={costCenters}
          vehicles={accessibleVehicles}
          preselectedVehicleId={selectedVehicle.id}
          isPending={isPOCreating}
        />
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
