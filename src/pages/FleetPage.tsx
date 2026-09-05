import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVehicles, useCreateVehicle, useUpdateVehicle } from '@/hooks/useVehicles'
import { useVehicleCheckSheets, useSubmitVehicleCheckSheet } from '@/hooks/useVehicleCheckSheets'
import AddVehicleModal from '@/components/fleet/AddVehicleModal'
import EditVehicleModal from '@/components/fleet/EditVehicleModal'
import VehicleCheckSheetModal from '@/components/fleet/VehicleCheckSheetModal'
import LogPlantUsageModal from '@/components/fleet/LogPlantUsageModal'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { Vehicle, VehicleFormData, VehicleCheckSheetFormData } from '@/types'

export default function FleetPage() {
  const { vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useVehicles()
  const { create: createVehicle, isPending: isCreatingVehicle } = useCreateVehicle()
  const { update: updateVehicle, isPending: isUpdatingVehicle } = useUpdateVehicle()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') as 'all' | 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer' | null
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'>(() => {
    if (categoryParam && ['all', 'vehicle', 'heavy_machinery', 'equipment', 'trailer'].includes(categoryParam)) {
      return categoryParam
    }
    return 'all'
  })

  useEffect(() => {
    if (categoryParam && ['all', 'vehicle', 'heavy_machinery', 'equipment', 'trailer'].includes(categoryParam)) {
      setCategoryFilter(categoryParam)
    } else if (!categoryParam) {
      setCategoryFilter('all')
    }
  }, [categoryParam])

  const handleCategoryChange = (cat: 'all' | 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer') => {
    setCategoryFilter(cat)
    setSearchParams(cat === 'all' ? {} : { category: cat })
  }


  const { checkSheets, loading: sheetsLoading, refresh: refreshSheets } = useVehicleCheckSheets(
    selectedVehicleId || vehicles[0]?.id
  )
  const { submitCheckSheet, isPending: isSubmittingSheet } = useSubmitVehicleCheckSheet()

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [inspectingVehicle, setInspectingVehicle] = useState<Vehicle | null>(null)
  const [loggingUsageVehicle, setLoggingUsageVehicle] = useState<Vehicle | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filteredVehicles = vehicles.filter((v) => {
    if (categoryFilter === 'all') return true
    return (v.asset_category || 'vehicle') === categoryFilter
  })

  const activeVehicleId = selectedVehicleId || filteredVehicles[0]?.id || vehicles[0]?.id
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId)

  const handleAddVehicle = async (data: VehicleFormData) => {
    try {
      await createVehicle(data)
      await refreshVehicles()
      setIsAddVehicleOpen(false)
      setToast({ type: 'success', message: `Fleet asset ${data.registration_number} registered` })
    } catch {
      setToast({ type: 'error', message: 'Failed to register fleet asset' })
    }
  }

  const handleUpdateVehicle = async (id: string, data: Partial<VehicleFormData>) => {
    try {
      await updateVehicle(id, data)
      await refreshVehicles()
      setEditingVehicle(null)
      setToast({ type: 'success', message: `Asset ${data.registration_number || ''} updated successfully` })
    } catch {
      setToast({ type: 'error', message: 'Failed to update asset' })
    }
  }

  const handleSubmitInspection = async (data: VehicleCheckSheetFormData) => {
    try {
      await submitCheckSheet(data)
      await refreshSheets()
      await refreshVehicles()
      setInspectingVehicle(null)
      setToast({ type: 'success', message: 'Inspection check sheet recorded' })
    } catch {
      setToast({ type: 'error', message: 'Failed to record check sheet' })
    }
  }

  // Calculate compliance status helper
  const getCompliancePill = (dueDateStr?: string | null, label = 'WOF') => {
    if (!dueDateStr) {
      return (
        <span className="px-2 py-0.5 rounded bg-background-dark text-text-muted border border-border-dark text-[10px]">
          {label}: Not Set
        </span>
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const diffDays = Math.ceil(
      (new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse">
          {label}: Expired {Math.abs(diffDays)}d ago
        </span>
      )
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          {label}: Due in {diffDays}d
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
        {label}: {dueDateStr}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-4xl text-primary">directions_car</span>
            Fleet, Heavy Plant & Equipment Hub
          </h1>
          <p className="text-text-muted text-xs mt-1">
            Service vans, diggers/excavators, pressure washers, engine hour tracking, and hourly job billing
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeVehicle && (
            <>
              <Button
                variant="secondary"
                onClick={() => setEditingVehicle(activeVehicle)}
                className="h-[38px] text-xs"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit Asset
              </Button>
              <Button
                variant="secondary"
                onClick={() => setInspectingVehicle(activeVehicle)}
                className="h-[38px] text-xs"
              >
                <span className="material-symbols-outlined text-base">checklist</span>
                Check Sheet
              </Button>
            </>
          )}
          <Button onClick={() => setIsAddVehicleOpen(true)} className="h-[38px] text-xs">
            <span className="material-symbols-outlined text-base">add_circle</span>
            Add Fleet / Plant Asset
          </Button>
        </div>
      </div>

      {/* Category Tabs Bar */}
      <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto text-xs">
        {[
          { key: 'all', label: 'All Fleet & Plant', icon: 'apps' },
          { key: 'vehicle', label: 'Service Vans & Utes', icon: 'local_shipping' },
          { key: 'heavy_machinery', label: 'Diggers & Excavators', icon: 'precision_manufacturing' },
          { key: 'equipment', label: 'Pressure Washers & Equipment', icon: 'water_drop' },
          { key: 'trailer', label: 'Trailers', icon: 'rv_hookup' },
        ].map((tab) => {
          const isActive = categoryFilter === tab.key
          const count = tab.key === 'all' ? vehicles.length : vehicles.filter((v) => (v.asset_category || 'vehicle') === tab.key).length

          return (
            <button
              key={tab.key}
              onClick={() => handleCategoryChange(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Fleet Vehicles Grid */}
      {vehiclesLoading ? (
        <div className="text-center py-10 text-xs text-text-muted animate-pulse">Loading fleet assets...</div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">
            precision_manufacturing
          </span>
          <p className="text-white text-sm font-medium">No assets in this category</p>
          <p className="text-xs text-text-muted mt-1">
            Click "Add Fleet / Plant Asset" to register service vehicles, diggers, or pressure washers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((v) => {
            const isSelected = v.id === activeVehicleId
            const isPlant = v.asset_category === 'heavy_machinery' || v.asset_category === 'equipment'
            const rucRemaining = (v.ruc_due_km || 0) - (v.current_odometer_km || 0)

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`bg-card-dark rounded-xl border p-4 shadow-md space-y-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/40'
                    : 'border-border-dark hover:border-border-dark/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-primary tracking-wider">
                      {v.registration_number}
                    </span>
                    <h3 className="font-semibold text-white text-xs mt-0.5">{v.make_model}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingVehicle(v)
                      }}
                      className="p-1 rounded hover:bg-background-dark text-text-muted hover:text-white transition-colors"
                      title="Edit asset details"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize border ${
                        v.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                </div>

                {/* Operator / Tech & Usage Reading */}
                <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border-dark/40">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-xs text-primary">person</span>
                    <span className="truncate font-semibold text-white">
                      {v.technician ? v.technician.full_name : 'Pool Asset (Unassigned)'}
                    </span>
                  </div>
                  <span className="font-mono text-white text-xs font-semibold shrink-0">
                    {v.usage_tracking_type === 'hours'
                      ? `${Number(v.current_hours || 0).toLocaleString()} HRS`
                      : `${Number(v.current_odometer_km || 0).toLocaleString()} KM`}
                  </span>
                </div>

                {/* Plant Charge Rate / Compliance Pills */}
                {isPlant ? (
                  <div className="p-2.5 rounded-lg bg-surface-dark/50 border border-border-dark/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted block">Charge-Out Rate:</span>
                      <span className="font-mono font-bold text-amber-400">
                        ${Number(v.hourly_charge_rate || 0).toFixed(2)}/hr
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLoggingUsageVehicle(v)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">timer</span>
                      Log Job Hours
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1 border-t border-border-dark/40">
                    <div className="flex items-center justify-between gap-1">
                      {getCompliancePill(v.wof_expiry_date, 'WOF')}
                      {getCompliancePill(v.rego_expiry_date, 'Rego')}
                    </div>

                    {v.ruc_due_km ? (
                      <div className="flex items-center justify-between text-[11px] text-text-muted bg-background-dark/80 px-2.5 py-1 rounded-lg border border-border-dark/50">
                        <span>RUC Due at {Number(v.ruc_due_km).toLocaleString()} KM</span>
                        <span
                          className={`font-mono font-bold ${
                            rucRemaining < 1000
                              ? 'text-red-400'
                              : rucRemaining < 3000
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {rucRemaining > 0 ? `${rucRemaining.toLocaleString()} KM left` : 'Overdue!'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Quick Check Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setInspectingVehicle(v)
                    }}
                    className="w-full h-[32px] rounded-lg bg-background-dark hover:bg-border-dark border border-border-dark text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">fact_check</span>
                    Start Inspection Check Sheet →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Inspection History Section for Selected Asset */}
      {activeVehicle && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">history</span>
                Inspection & Safety History: {activeVehicle.registration_number} ({activeVehicle.make_model})
              </h2>
              <p className="text-xs text-text-muted">
                Assigned to: <strong className="text-white">{activeVehicle.technician?.full_name || 'Pool Asset'}</strong> • Safety and operating condition records
              </p>
            </div>
          </div>

          {sheetsLoading ? (
            <p className="text-xs text-text-muted">Loading check sheet history...</p>
          ) : checkSheets.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-3xl text-text-muted/40 block mb-1">
                checklist
              </span>
              <p className="text-white text-xs font-medium">No check sheets submitted yet for this asset</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Click "Check Sheet" above to complete a 2-minute safety inspection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/80 text-text-muted border-b border-border-dark uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Inspection Date</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Reading</th>
                    <th className="px-4 py-3">Safety Status</th>
                    <th className="px-4 py-3">Key Checks</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {checkSheets.map((cs) => (
                    <tr key={cs.id} className="hover:bg-background-dark/40">
                      <td className="px-4 py-3 font-semibold">
                        {new Date(cs.check_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {cs.technician?.full_name || 'Technician'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {Number(cs.odometer_km).toLocaleString()} {activeVehicle.usage_tracking_type === 'hours' ? 'HRS' : 'KM'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cs.status === 'passed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cs.status === 'attention_required'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {cs.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="flex items-center gap-2 font-mono text-[11px]">
                          <span>Oil: {cs.oil_level === 'pass' ? 'PASS' : 'FAIL'}</span> •
                          <span>Condition: {cs.tire_tread_and_pressure === 'pass' ? 'PASS' : 'FAIL'}</span> •
                          <span>Safety: {cs.lights_and_indicators === 'pass' ? 'PASS' : 'FAIL'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted max-w-xs truncate">
                        {cs.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <AddVehicleModal
          isOpen={isAddVehicleOpen}
          onClose={() => setIsAddVehicleOpen(false)}
          onSubmit={handleAddVehicle}
          isPending={isCreatingVehicle}
        />
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <EditVehicleModal
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          vehicle={editingVehicle}
          onSubmit={handleUpdateVehicle}
          isPending={isUpdatingVehicle}
        />
      )}

      {/* Monthly Check Sheet Modal */}
      {inspectingVehicle && (
        <VehicleCheckSheetModal
          isOpen={!!inspectingVehicle}
          onClose={() => setInspectingVehicle(null)}
          vehicle={inspectingVehicle}
          onSubmit={handleSubmitInspection}
          isPending={isSubmittingSheet}
        />
      )}

      {/* Log Plant Usage Modal */}
      {loggingUsageVehicle && (
        <LogPlantUsageModal
          isOpen={!!loggingUsageVehicle}
          onClose={() => setLoggingUsageVehicle(null)}
          vehicle={loggingUsageVehicle}
          onSuccess={() => {
            refreshVehicles()
            setToast({ type: 'success', message: 'Plant hours logged onto project' })
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
