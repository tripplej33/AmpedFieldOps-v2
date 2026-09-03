import { useState, useEffect } from 'react'
import { useTerminology } from '@/hooks/useTerminology'
import { TRADE_PRESETS } from '@/lib/tradePresets'
import type { TradeType, TradeTerminology, ModuleKey } from '@/types/trade'
import Button from '@/components/ui/Button'

interface TradeCustomizationSectionProps {
  onSuccessToast?: (msg: string) => void
}

const MODULE_DEFINITIONS: { key: ModuleKey; label: string; icon: string; description: string }[] = [
  { key: 'projects', label: 'Projects / Jobs', icon: 'work', description: 'Core work orders, project scopes, and project folders.' },
  { key: 'schedule', label: 'Schedule & Dispatch', icon: 'calendar_month', description: 'Dispatcher timeline and technician mobile agenda.' },
  { key: 'safety', label: 'Safety & Permits', icon: 'shield_with_heart', description: 'JSA, SWMS, Take 5, permits, and QR signature capture.' },
  { key: 'timesheets', label: 'Timesheets & Labor', icon: 'schedule', description: 'Real-time timer, job hour allocations, and payroll approval.' },
  { key: 'vanStock', label: 'Van Stock & Materials', icon: 'local_shipping', description: 'Truck stock levels, parts catalog, and transfers.' },
  { key: 'fleet', label: 'Fleet & Vehicles', icon: 'directions_car', description: 'Company vehicles, heavy plant, and pre-start checks.' },
  { key: 'purchaseOrders', label: 'Purchase Orders', icon: 'shopping_cart', description: 'Merchant procurement and cost center PO tracking.' },
  { key: 'clients', label: 'Clients & Customers', icon: 'groups', description: 'Client CRM, site contacts, and billing profiles.' },
  { key: 'financials', label: 'Financials & Margins', icon: 'payments', description: 'Project burn, cost tracking, and Xero synchronization.' },
  { key: 'files', label: 'Files & Drawings Hub', icon: 'folder', description: 'Cloud document repository and site schematics.' },
]

export default function TradeCustomizationSection({ onSuccessToast }: TradeCustomizationSectionProps) {
  const {
    config,
    tradeType,
    applyPreset,
    updateTerminology,
    toggleModule,
    isModuleEnabled,
    saving,
  } = useTerminology()

  const [dictionary, setDictionary] = useState<TradeTerminology>(config.terminology)
  const [activeTab, setActiveTab] = useState<'presets' | 'dictionary' | 'modules'>('presets')

  useEffect(() => {
    setDictionary(config.terminology)
  }, [config.terminology])

  const handleApplyPreset = async (presetId: TradeType) => {
    await applyPreset(presetId)
    onSuccessToast?.(`Activated ${TRADE_PRESETS[presetId].title} preset!`)
  }

  const handleSaveDictionary = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateTerminology(dictionary)
    onSuccessToast?.('Custom terminology dictionary updated successfully!')
  }

  const handleToggleModule = async (key: ModuleKey, currentVal: boolean) => {
    await toggleModule(key, !currentVal)
    onSuccessToast?.(`${key} module visibility updated!`)
  }

  const activePresetInfo = TRADE_PRESETS[tradeType] || TRADE_PRESETS.custom

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-card-dark to-surface-dark border border-border-dark rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">tune</span>
            <h2 className="text-base sm:text-lg font-bold text-white">Trade Starter Packs & Terminology</h2>
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${activePresetInfo.badgeColor}`}>
              {activePresetInfo.title}
            </span>
          </div>
          <p className="text-xs text-text-muted max-w-2xl">
            Tailor AmpedFieldOps for your specific industry with 1-click trade presets, customize naming conventions across all pages, or toggle optional features on and off.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex bg-surface-dark/90 border border-border-dark rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'presets' ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">widgets</span>
            1-Click Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'dictionary' ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">translate</span>
            Terminology
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'modules' ? 'bg-primary text-black font-bold' : 'text-text-muted hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">toggle_on</span>
            Module Toggles
          </button>
        </div>
      </div>

      {/* TAB 1: 1-Click Trade Starter Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">category</span>
              Select Industry Profile
            </h3>
            <span className="text-xs text-text-muted">Click any preset to instantly reconfigure the app</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(TRADE_PRESETS) as TradeType[]).map((typeKey) => {
              const preset = TRADE_PRESETS[typeKey]
              const isSelected = tradeType === typeKey

              return (
                <div
                  key={typeKey}
                  onClick={() => handleApplyPreset(typeKey)}
                  className={`
                    bg-card-dark border rounded-2xl p-5 cursor-pointer transition-all duration-200
                    hover:scale-[1.01] hover:shadow-xl flex flex-col justify-between space-y-4 relative group
                    ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/40 shadow-primary/10 bg-surface-dark/80'
                        : 'border-border-dark hover:border-text-muted/40'
                    }
                  `}
                >
                  {/* Active Ribbon */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Active Preset
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center bg-gradient-to-br ${preset.color}`}>
                        <span className="material-symbols-outlined text-2xl">{preset.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1 pr-16">
                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                          {preset.title}
                        </h4>
                        <p className="text-[11px] text-text-muted truncate">{preset.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-text-muted leading-relaxed">
                      {preset.config.description}
                    </p>

                    {/* Key Terminology Sample Chips */}
                    <div className="pt-2 border-t border-border-dark/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Included Terminology:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-background-dark border border-border-dark text-white/90">
                          {preset.config.terminology.project}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-background-dark border border-border-dark text-white/90">
                          {preset.config.terminology.technician}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-background-dark border border-border-dark text-white/90">
                          {preset.config.terminology.vanStock}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-background-dark border border-border-dark text-white/90">
                          {preset.config.terminology.safety}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant={isSelected ? 'primary' : 'secondary'}
                      disabled={saving}
                      className="w-full text-xs font-bold"
                    >
                      {isSelected ? 'Currently Applied' : 'Apply Preset'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Custom Terminology Dictionary */}
      {activeTab === 'dictionary' && (
        <form onSubmit={handleSaveDictionary} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
              Custom Terminology Dictionary
            </h3>
            <Button type="submit" disabled={saving} className="text-xs font-bold">
              {saving ? 'Saving...' : 'Save Dictionary Changes'}
            </Button>
          </div>

          <div className="bg-card-dark border border-border-dark rounded-2xl p-5 space-y-5">
            <p className="text-xs text-text-muted">
              Customize the exact wording displayed in headers, navigation tabs, and form badges across your workspace.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Projects */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">work</span>
                  Projects / Work Containers
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted block">Singular</label>
                    <input
                      type="text"
                      value={dictionary.project}
                      onChange={(e) => setDictionary({ ...dictionary, project: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Project, Job Card, Site"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block">Plural</label>
                    <input
                      type="text"
                      value={dictionary.projects}
                      onChange={(e) => setDictionary({ ...dictionary, projects: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Projects, Job Cards, Sites"
                    />
                  </div>
                </div>
              </div>

              {/* Tasks / Work Orders */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-indigo-400 text-base">task_alt</span>
                  Tasks / Work Orders
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted block">Singular</label>
                    <input
                      type="text"
                      value={dictionary.task}
                      onChange={(e) => setDictionary({ ...dictionary, task: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Work Order, Repair Line"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block">Plural</label>
                    <input
                      type="text"
                      value={dictionary.tasks}
                      onChange={(e) => setDictionary({ ...dictionary, tasks: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Work Orders, Tasks"
                    />
                  </div>
                </div>
              </div>

              {/* Technicians / Field Staff */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-base">engineering</span>
                  Technicians / Field Crew
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted block">Singular</label>
                    <input
                      type="text"
                      value={dictionary.technician}
                      onChange={(e) => setDictionary({ ...dictionary, technician: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Electrician, Plumber, Mechanic"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block">Plural</label>
                    <input
                      type="text"
                      value={dictionary.technicians}
                      onChange={(e) => setDictionary({ ...dictionary, technicians: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Electricians, Mechanics"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Centers */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-base">account_tree</span>
                  Cost Centers / Cost Codes
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted block">Singular</label>
                    <input
                      type="text"
                      value={dictionary.costCenter}
                      onChange={(e) => setDictionary({ ...dictionary, costCenter: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Cost Center, Labor Code"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block">Plural</label>
                    <input
                      type="text"
                      value={dictionary.costCenters}
                      onChange={(e) => setDictionary({ ...dictionary, costCenters: e.target.value })}
                      className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="e.g. Cost Centers, Cost Codes"
                    />
                  </div>
                </div>
              </div>

              {/* Materials / Van Stock */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-cyan-400 text-base">local_shipping</span>
                  Materials & Inventory Label
                </label>
                <input
                  type="text"
                  value={dictionary.vanStock}
                  onChange={(e) => setDictionary({ ...dictionary, vanStock: e.target.value })}
                  className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                  placeholder="e.g. Van Stock & Materials, Parts Inventory"
                />
              </div>

              {/* Fleet & Plant */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-400 text-base">directions_car</span>
                  Fleet & Vehicles Label
                </label>
                <input
                  type="text"
                  value={dictionary.fleet}
                  onChange={(e) => setDictionary({ ...dictionary, fleet: e.target.value })}
                  className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                  placeholder="e.g. Fleet & Vehicles, Heavy Plant & Machinery"
                />
              </div>

              {/* Safety & Compliance */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-base">shield_with_heart</span>
                  Safety & Permits Label
                </label>
                <input
                  type="text"
                  value={dictionary.safety}
                  onChange={(e) => setDictionary({ ...dictionary, safety: e.target.value })}
                  className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                  placeholder="e.g. Safety & Permits, JSA & Compliance"
                />
              </div>

              {/* Timesheets */}
              <div className="space-y-1.5 p-3 rounded-xl bg-background-dark border border-border-dark">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-purple-400 text-base">schedule</span>
                  Timesheets Label
                </label>
                <input
                  type="text"
                  value={dictionary.timesheets}
                  onChange={(e) => setDictionary({ ...dictionary, timesheets: e.target.value })}
                  className="w-full h-8 px-2.5 bg-surface-dark border border-border-dark rounded-lg text-white"
                  placeholder="e.g. Timesheets, Daily Run Sheets, Labor Logs"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: Modular Feature Toggles */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">tune</span>
              Active Feature Modules
            </h3>
            <span className="text-xs text-text-muted">Turn features on or off for your team</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODULE_DEFINITIONS.map((mod) => {
              const enabled = isModuleEnabled(mod.key)

              return (
                <div
                  key={mod.key}
                  className={`
                    p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all
                    ${enabled ? 'bg-card-dark border-border-dark' : 'bg-surface-dark/30 border-border-dark/40 opacity-60'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      enabled ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-dark border-border-dark text-text-muted'
                    }`}>
                      <span className="material-symbols-outlined text-xl">{mod.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{mod.label}</p>
                      <p className="text-[11px] text-text-muted truncate">{mod.description}</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggleModule(mod.key, enabled)}
                      disabled={mod.key === 'projects'} // Projects is foundational
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
