import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useVehicles } from '@/hooks/useVehicles'
import { useVanStock, useAdjustVanStock } from '@/hooks/useVanStock'
import { useProjects } from '@/hooks/useProjects'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import {
  useInventoryLocations,
  useStockLevels,
  useInventoryTransactions,
  useInventoryOperations,
} from '@/hooks/useInventoryLocations'
import VanStockTable from '@/components/vanstock/VanStockTable'
import AddVanStockItemModal from '@/components/vanstock/AddVanStockItemModal'
import PurchaseOrderModal from '@/components/procurement/PurchaseOrderModal'
import AddStorageLocationModal from '@/components/inventory/AddStorageLocationModal'
import GenerateRestockPOModal from '@/components/inventory/GenerateRestockPOModal'
import StockTransferModal from '@/components/inventory/StockTransferModal'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { PurchaseOrderFormData } from '@/types'
import type { InventoryStockLevel, InventoryLocation, LocationType } from '@/types/inventory'

type ActiveTab = 'locations' | 'catalog' | 'low_stock' | 'transactions' | 'van_view'

export default function VanStockPage() {
  const { user } = useAuth()
  const { isAdmin, isManager } = usePermissions()
  const isElevated = isAdmin || isManager
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as ActiveTab | null

  // State
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (tabParam && ['locations', 'catalog', 'low_stock', 'transactions', 'van_view'].includes(tabParam)) {
      return tabParam
    }
    return 'locations'
  })

  useEffect(() => {
    if (tabParam && ['locations', 'catalog', 'low_stock', 'transactions', 'van_view'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab)
    setSearchParams(tab === 'locations' ? {} : { tab })
  }

  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modals state
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)
  const [isRestockPOModalOpen, setIsRestockPOModalOpen] = useState(false)
  const [restockTargetLocation, setRestockTargetLocation] = useState<{ id: string; name: string } | null>(null)
  const [transferTargetItem, setTransferTargetItem] = useState<InventoryStockLevel | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Hooks
  const { locations, loading: locationsLoading, refresh: refreshLocations, deleteLocation } = useInventoryLocations()
  const { stockLevels, loading: stockLevelsLoading, refresh: refreshStockLevels } = useStockLevels(selectedLocationFilter)
  const { transactions, loading: txLoading, refresh: refreshTx } = useInventoryTransactions(selectedLocationFilter)
  const { adjustStockLevel, isPending: isAdjusting } = useInventoryOperations()

  // Fleet & Van Stock
  const { vehicles, loading: vehiclesLoading } = useVehicles()
  const accessibleVehicles = isElevated
    ? vehicles
    : vehicles.filter((v) => v.assigned_technician_id === user?.id)

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const { stock: vanStock, loading: vanStockLoading, refresh: refreshVanStock } = useVanStock(selectedVehicleId)
  const { adjustStock: adjustVanStock, addStockItem: addVanStockItem } = useAdjustVanStock()

  const { data: projects = [] } = useProjects()
  const { data: costCenters = [] } = useCostCenters('')
  const { create: createPO, isPending: isPOCreating } = useCreatePurchaseOrder()

  // Default vehicle selection
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

  // Calculations for company-wide stats
  const totalLocationsCount = locations.length
  const totalStockItemsCount = stockLevels.length
  const totalUnitsOnHand = stockLevels.reduce((sum, s) => sum + Number(s.quantity_on_hand || 0), 0)
  const lowStockItems = useMemo(() => {
    return stockLevels.filter((s) => Number(s.quantity_on_hand || 0) <= Number(s.min_reorder_level || 5))
  }, [stockLevels])

  // Filtered Catalog
  const categories = useMemo(() => {
    const set = new Set<string>()
    stockLevels.forEach((s) => {
      if (s.item?.category) set.add(s.item.category)
    })
    return Array.from(set).sort()
  }, [stockLevels])

  const filteredCatalog = useMemo(() => {
    return stockLevels.filter((s) => {
      if (selectedLocationFilter !== 'all' && s.location_id !== selectedLocationFilter) return false
      if (categoryFilter !== 'all' && s.item?.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (s.item?.name || '').toLowerCase()
        const sku = (s.item?.sku || '').toLowerCase()
        const loc = (s.location?.name || '').toLowerCase()
        return name.includes(q) || sku.includes(q) || loc.includes(q)
      }
      return true
    })
  }, [stockLevels, selectedLocationFilter, categoryFilter, searchQuery])

  // Handlers
  const handleQuickAdjustStock = async (level: InventoryStockLevel, delta: number) => {
    try {
      const nextQty = Math.max(0, Number(level.quantity_on_hand || 0) + delta)
      await adjustStockLevel(level.location_id, level.item_id, nextQty, level.bin_rack || undefined)
      await refreshStockLevels()
      setToast({ type: 'success', message: `Stock level updated for ${level.item?.name || 'item'}` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update stock quantity' })
    }
  }

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove storage place "${name}"?`)) return
    try {
      await deleteLocation(id)
      setToast({ type: 'success', message: `Storage location "${name}" removed` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to remove location (may contain stock)' })
    }
  }

  const handleOpenRestockPOForLocation = (loc: InventoryLocation) => {
    setRestockTargetLocation({ id: loc.id, name: loc.name })
    setIsRestockPOModalOpen(true)
  }

  const handleOpenRestockPOCompanyWide = () => {
    const primaryLoc = locations.find((l) => l.is_primary) || locations[0]
    if (primaryLoc) {
      setRestockTargetLocation({ id: primaryLoc.id, name: primaryLoc.name })
    } else {
      setRestockTargetLocation({ id: 'all', name: 'Company Depots' })
    }
    setIsRestockPOModalOpen(true)
  }

  const handleAdjustVanStockItem = async (id: string, newQty: number) => {
    try {
      await adjustVanStock(id, newQty)
      await refreshVanStock()
      setToast({ type: 'success', message: 'Van stock quantity updated' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update van stock' })
    }
  }

  const handleAddVanStockItem = async (vehicleId: string, itemId: string, qty: number, targetQty: number) => {
    try {
      await addVanStockItem(vehicleId, itemId, qty, targetQty)
      await refreshVanStock()
      setToast({ type: 'success', message: 'Item added to van stock' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to add item to van' })
    }
  }

  const handleCreateRestockPO = async (data: PurchaseOrderFormData) => {
    try {
      await createPO(data)
      setIsPOModalOpen(false)
      setToast({ type: 'success', message: `Restock PO ${data.po_number} raised successfully` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to raise restock PO' })
    }
  }

  const getLocationIcon = (type: LocationType) => {
    switch (type) {
      case 'workshop':
        return 'home_repair_service'
      case 'warehouse':
        return 'warehouse'
      case 'yard':
        return 'outdoor_garden'
      case 'site_container':
        return 'inventory'
      case 'van':
        return 'local_shipping'
      default:
        return 'storefront'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-4xl text-primary">inventory_2</span>
            Inventory & Storage Oversight Hub
          </h1>
          <p className="text-text-muted text-xs mt-1">
            {isElevated
              ? 'Multi-location stock control across workshops, yards, containers, warehouse depots, and mobile fleet vans.'
              : `Stock take and restock materials for your assigned vehicle (${selectedVehicle?.registration_number || 'Van'})`}
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {isElevated && (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsAddLocationModalOpen(true)}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-base text-primary">add_location_alt</span>
                Add Storage Place
              </Button>

              <Button
                variant="secondary"
                onClick={handleOpenRestockPOCompanyWide}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-base text-cyan-400">shopping_cart_checkout</span>
                Generate Restock PO
              </Button>
            </>
          )}

          {selectedVehicle && (
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add Catalog Item
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <span className="text-text-muted text-[11px] uppercase font-semibold">Storage Places & Depots</span>
          <p className="text-white text-2xl font-bold font-mono mt-1">{totalLocationsCount} Places</p>
          <p className="text-xs text-text-muted mt-0.5">Workshops, Warehouses, Vans, Yards</p>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <span className="text-text-muted text-[11px] uppercase font-semibold">Total Stock Units</span>
          <p className="text-primary text-2xl font-bold font-mono mt-1">{totalUnitsOnHand} Units</p>
          <p className="text-xs text-text-muted mt-0.5">Across {totalStockItemsCount} tracked item entries</p>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <span className="text-text-muted text-[11px] uppercase font-semibold">Low Stock Restock Alerts</span>
          <p
            className={`text-2xl font-bold font-mono mt-1 ${
              lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {lowStockItems.length} Low Items
          </p>
          <p className="text-xs text-text-muted mt-0.5">Below minimum reorder point</p>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
          <span className="text-text-muted text-[11px] uppercase font-semibold">Fleet Vans Monitored</span>
          <p className="text-cyan-400 text-2xl font-bold font-mono mt-1">{vehicles.length} Vehicles</p>
          <p className="text-xs text-text-muted mt-0.5">Mobile technician stock sync</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-dark overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => handleTabChange('locations')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'locations'
              ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">domain</span>
          Storage Places & Depots ({locations.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('catalog')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'catalog'
              ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">format_list_bulleted</span>
          Master Stock Catalog & Levels
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('low_stock')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'low_stock'
              ? 'border-amber-400 text-amber-400 bg-amber-400/10 rounded-t-lg'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">warning</span>
          Restock Queue & Low Stock
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-mono">
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('transactions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'transactions'
              ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">sync_alt</span>
          Stock Movements Audit
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('van_view')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'van_view'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10 rounded-t-lg'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">local_shipping</span>
          Mobile Van View {selectedVehicle ? `(${selectedVehicle.registration_number})` : ''}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STORAGE PLACES & DEPOTS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              All Storage Locations & Depots ({locations.length})
            </h2>
            <Button
              variant="secondary"
              onClick={() => setIsAddLocationModalOpen(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-primary">add_location</span>
              Add Workshop, Yard or Container
            </Button>
          </div>

          {locationsLoading ? (
            <div className="text-center py-12 text-xs text-text-muted animate-pulse">
              Loading company storage locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-2xl bg-card-dark p-8 space-y-3">
              <span className="material-symbols-outlined text-4xl text-primary block">warehouse</span>
              <h3 className="text-base font-bold text-white">No Storage Places Registered</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Create your first storage depot such as HQ Workshop, Yard, or Site Container to begin tracking inventory.
              </p>
              <Button onClick={() => setIsAddLocationModalOpen(true)}>Create Primary Workshop</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => {
                const locStock = stockLevels.filter((s) => s.location_id === loc.id)
                const totalUnits = locStock.reduce((sum, s) => sum + Number(s.quantity_on_hand || 0), 0)
                const lowItemsInLoc = locStock.filter(
                  (s) => Number(s.quantity_on_hand || 0) <= Number(s.min_reorder_level || 5)
                ).length

                return (
                  <div
                    key={loc.id}
                    className="bg-card-dark border border-border-dark hover:border-primary/40 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">
                              {getLocationIcon(loc.location_type)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-white">{loc.name}</h3>
                              {loc.is_primary && (
                                <span
                                  title="Primary HQ Warehouse"
                                  className="text-amber-400 material-symbols-outlined text-base"
                                >
                                  star
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-surface-dark text-text-muted capitalize border border-border-dark inline-block mt-0.5">
                              {loc.location_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {!loc.is_primary && loc.location_type !== 'van' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="text-text-muted hover:text-red-400 p-1"
                            title="Delete storage place"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>

                      {loc.vehicle && (
                        <div className="mt-3 p-2 rounded-lg bg-surface-dark/60 border border-border-dark text-[11px] flex items-center justify-between text-text-muted">
                          <span>Linked Fleet Vehicle:</span>
                          <span className="font-mono font-bold text-white">
                            {loc.vehicle.registration_number} ({loc.vehicle.make_model})
                          </span>
                        </div>
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="p-2 rounded-lg bg-background-dark/80 border border-border-dark">
                          <span className="text-[10px] text-text-muted block">Catalog Items</span>
                          <span className="text-xs font-mono font-bold text-white">{locStock.length}</span>
                        </div>

                        <div className="p-2 rounded-lg bg-background-dark/80 border border-border-dark">
                          <span className="text-[10px] text-text-muted block">Units on Hand</span>
                          <span className="text-xs font-mono font-bold text-primary">{totalUnits}</span>
                        </div>

                        <div className="p-2 rounded-lg bg-background-dark/80 border border-border-dark">
                          <span className="text-[10px] text-text-muted block">Low Stock</span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              lowItemsInLoc > 0 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {lowItemsInLoc}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-border-dark flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedLocationFilter(loc.id)
                          setActiveTab('catalog')
                        }}
                        className="flex-1 text-xs py-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Stock
                      </Button>

                      <Button
                        onClick={() => handleOpenRestockPOForLocation(loc)}
                        className="flex-1 text-xs py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        <span className="material-symbols-outlined text-sm">shopping_cart</span>
                        Restock PO
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER STOCK CATALOG & LEVELS */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card-dark border border-border-dark rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search item name, SKU, or storage location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white"
                />
              </div>

              {/* Location Filter */}
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white"
              >
                <option value="all">All Storage Locations ({locations.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-text-muted font-mono">
              Showing <strong className="text-white">{filteredCatalog.length}</strong> items
            </div>
          </div>

          {/* Catalog Table */}
          {stockLevelsLoading ? (
            <div className="text-center py-12 text-xs text-text-muted animate-pulse">Loading stock levels...</div>
          ) : filteredCatalog.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-card-dark p-6">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-1">inventory_2</span>
              <p className="text-white text-xs font-medium">No stock items match your search filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark shadow-md">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Item / SKU</th>
                    <th className="px-4 py-3">Storage Location</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">On Hand</th>
                    <th className="px-4 py-3 text-center">Min / Target</th>
                    <th className="px-4 py-3">Stock Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {filteredCatalog.map((s) => {
                    const onHand = Number(s.quantity_on_hand || 0)
                    const minLvl = Number(s.min_reorder_level || 5)
                    const isOut = onHand === 0
                    const isLow = onHand <= minLvl

                    return (
                      <tr key={s.id} className="hover:bg-background-dark/40 transition-colors">
                        <td className="px-4 py-3 font-semibold">
                          <p className="text-white">{s.item?.name || 'Stock Item'}</p>
                          <span className="text-[10px] font-mono text-primary font-normal">
                            SKU: {s.item?.sku || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-medium text-white/90">
                            <span className="material-symbols-outlined text-xs text-primary">
                              {getLocationIcon(s.location?.location_type || 'warehouse')}
                            </span>
                            {s.location?.name || 'Main Warehouse'}
                          </span>
                          {s.bin_rack && (
                            <span className="text-[10px] text-text-muted block font-mono">Bin: {s.bin_rack}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-text-muted">{s.item?.category || 'General'}</td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-white bg-background-dark px-2.5 py-1 rounded border border-border-dark">
                            {onHand} {s.item?.unit_of_measure || 'EA'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-mono text-text-muted">
                          {minLvl} / {s.target_stock_level || 20} {s.item?.unit_of_measure || 'EA'}
                        </td>

                        <td className="px-4 py-3">
                          {isOut ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Adequate
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTransferTargetItem(s)}
                              className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1 border border-primary/20 transition-colors"
                              title="Transfer to another location or book directly to a project job"
                            >
                              <span className="material-symbols-outlined text-xs">sync_alt</span>
                              Transfer / Job
                            </button>

                            <button
                              onClick={() => handleQuickAdjustStock(s, -1)}
                              disabled={onHand <= 0 || isAdjusting}
                              className="w-7 h-7 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-white flex items-center justify-center disabled:opacity-30"
                              title="Quick count -1"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(s, 1)}
                              disabled={isAdjusting}
                              className="w-7 h-7 rounded bg-background-dark hover:bg-border-dark border border-border-dark text-white flex items-center justify-center"
                              title="Quick count +1"
                            >
                              +1
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RESTOCK QUEUE & LOW STOCK ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'low_stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
                Restock Queue ({lowStockItems.length} Low Stock Items)
              </h2>
              <p className="text-xs text-text-muted">
                Items currently at or below minimum threshold requiring vendor purchase orders.
              </p>
            </div>

            <Button
              onClick={handleOpenRestockPOCompanyWide}
              disabled={lowStockItems.length === 0}
              className="text-xs flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
              Launch Restock PO Generator
            </Button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-card-dark p-8">
              <span className="material-symbols-outlined text-4xl text-emerald-400 block mb-2">check_circle</span>
              <h3 className="text-base font-bold text-white">All Stock Levels Healthy</h3>
              <p className="text-xs text-text-muted mt-1">
                No storage locations currently report stock below their minimum reorder point.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lowStockItems.map((item) => {
                const onHand = Number(item.quantity_on_hand || 0)
                const target = Number(item.target_stock_level || 20)
                const deficit = Math.max(1, target - onHand)

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-card-dark border border-amber-500/30 rounded-xl flex items-center justify-between gap-4 shadow-md"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {onHand === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                        <span className="text-xs font-mono text-primary">SKU: {item.item?.sku || 'N/A'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1 truncate">{item.item?.name}</h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Location: <strong className="text-white/90">{item.location?.name}</strong> • On Hand:{' '}
                        <strong className="text-red-400 font-mono">{onHand}</strong> / Target: {target}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-text-muted block">Order Needed:</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">+{deficit} units</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.location) handleOpenRestockPOForLocation(item.location)
                        }}
                        className="mt-1.5 px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold block"
                      >
                        Raise PO
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STOCK MOVEMENTS & AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Stock Movement Transactions (Audit Log)
            </h2>
            <Button variant="secondary" onClick={() => refreshTx()} className="text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Log
            </Button>
          </div>

          {txLoading ? (
            <div className="text-center py-12 text-xs text-text-muted animate-pulse">Loading transaction logs...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-card-dark p-6 text-xs text-text-muted">
              No stock transfers or job bookings logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl bg-card-dark shadow-md">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Movement / Target</th>
                    <th className="px-4 py-3 text-center">Quantity</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {transactions.map((tx) => {
                    return (
                      <tr key={tx.id} className="hover:bg-background-dark/40">
                        <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.transaction_type === 'transfer'
                                ? 'bg-primary/20 text-primary'
                                : tx.transaction_type === 'job_booking'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-surface-dark text-text-muted'
                            }`}
                          >
                            {tx.transaction_type.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {tx.item?.name || 'Item'}
                          <span className="text-[10px] text-text-muted block font-mono">SKU: {tx.item?.sku}</span>
                        </td>

                        <td className="px-4 py-3">
                          {tx.transaction_type === 'transfer' ? (
                            <div className="flex items-center gap-1.5 text-white/90">
                              <span>{tx.source_location?.name || 'Source'}</span>
                              <span className="material-symbols-outlined text-xs text-primary">arrow_forward</span>
                              <span className="text-primary font-semibold">{tx.dest_location?.name || 'Dest'}</span>
                            </div>
                          ) : tx.transaction_type === 'job_booking' ? (
                            <div className="text-emerald-400">
                              Project: <strong className="text-white">{tx.project?.name || 'Project Job'}</strong>
                            </div>
                          ) : (
                            <span className="text-text-muted">{tx.source_location?.name || 'Location'}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-mono font-bold text-white">
                          {tx.quantity} {tx.item?.unit_of_measure || 'EA'}
                        </td>

                        <td className="px-4 py-3 text-text-muted max-w-xs truncate">{tx.notes || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MOBILE FLEET & TECHNICIAN VAN VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'van_view' && (
        <div className="space-y-6">
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
                You can only perform stock takes and raise restock POs for your designated van. Please ask your administrator to assign a vehicle to your name in Fleet Management.
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
                        <span className="font-mono font-bold text-xs text-white">{v.registration_number}</span>
                        <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
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

          {/* Van Stock Table */}
          {selectedVehicle && (
            <VanStockTable
              stock={vanStock}
              loading={vanStockLoading}
              onAdjustStock={handleAdjustVanStockItem}
              onRefresh={refreshVanStock}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Add Storage Location Modal */}
      {isAddLocationModalOpen && (
        <AddStorageLocationModal
          isOpen={isAddLocationModalOpen}
          onClose={() => setIsAddLocationModalOpen(false)}
          onSuccess={() => {
            refreshLocations()
            setToast({ type: 'success', message: 'Storage location created successfully' })
          }}
        />
      )}

      {/* Restock PO Generator Modal */}
      {isRestockPOModalOpen && restockTargetLocation && (
        <GenerateRestockPOModal
          isOpen={isRestockPOModalOpen}
          onClose={() => setIsRestockPOModalOpen(false)}
          locationId={restockTargetLocation.id}
          locationName={restockTargetLocation.name}
          onSuccess={() => {
            refreshStockLevels()
            setToast({ type: 'success', message: 'Restock purchase order dispatched successfully' })
          }}
        />
      )}

      {/* Stock Transfer Modal */}
      {transferTargetItem && (
        <StockTransferModal
          isOpen={!!transferTargetItem}
          onClose={() => setTransferTargetItem(null)}
          stockItem={transferTargetItem}
          onSuccess={() => {
            refreshStockLevels()
            refreshTx()
            setToast({ type: 'success', message: 'Stock movement recorded' })
          }}
        />
      )}

      {/* Add Catalog Item Modal */}
      {isAddModalOpen && selectedVehicle && (
        <AddVanStockItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          vehicleId={selectedVehicle.id}
          vehicleName={`${selectedVehicle.registration_number} (${selectedVehicle.make_model})`}
          onAddStockItem={handleAddVanStockItem}
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

