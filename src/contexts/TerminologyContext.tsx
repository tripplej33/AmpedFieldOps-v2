import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TRADE_PRESETS } from '@/lib/tradePresets'
import type {
  TradeType,
  TradeTerminology,
  TradeCustomizationConfig,
  TerminologyKey,
  ModuleKey,
} from '@/types/trade'

interface TerminologyContextValue {
  config: TradeCustomizationConfig
  tradeType: TradeType
  t: (key: TerminologyKey, fallback?: string) => string
  isModuleEnabled: (key: ModuleKey) => boolean
  applyPreset: (tradeType: TradeType) => Promise<void>
  updateTerminology: (updates: Partial<TradeTerminology>) => Promise<void>
  toggleModule: (moduleKey: ModuleKey, enabled: boolean) => Promise<void>
  resetToDefault: () => Promise<void>
  saving: boolean
  loading: boolean
}

const STORAGE_KEY = 'amped_trade_customization'
const DEFAULT_CONFIG = TRADE_PRESETS.electrical.config

const TerminologyContext = createContext<TerminologyContextValue | null>(null)

export const TerminologyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<TradeCustomizationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          terminology: { ...DEFAULT_CONFIG.terminology, ...(parsed.terminology || {}) },
          modules: { ...DEFAULT_CONFIG.modules, ...(parsed.modules || {}) },
        }
      }
    } catch {}
    return DEFAULT_CONFIG
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch from Supabase app_settings
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trade_customization')
        .maybeSingle()

      if (error) {
        console.warn('[TerminologyContext] Warning fetching trade_customization:', error.message)
        return
      }

      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
        const merged: TradeCustomizationConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          terminology: { ...DEFAULT_CONFIG.terminology, ...(parsed.terminology || {}) },
          modules: { ...DEFAULT_CONFIG.modules, ...(parsed.modules || {}) },
        }
        setConfig(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
    } catch (e) {
      console.warn('[TerminologyContext] Using cached trade customization:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Persistence helper
  const persistConfig = async (newConfig: TradeCustomizationConfig) => {
    try {
      setSaving(true)
      const toSave = {
        ...newConfig,
        updatedAt: new Date().toISOString(),
      }

      setConfig(toSave)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))

      await supabase.from('app_settings').upsert(
        [
          {
            key: 'trade_customization',
            value: JSON.stringify(toSave),
            is_encrypted: false,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'key' }
      )
    } catch (err) {
      console.error('[TerminologyContext] Error saving customization:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }

  // 1-Click Preset Switcher
  const applyPreset = async (type: TradeType) => {
    const preset = TRADE_PRESETS[type] || TRADE_PRESETS.electrical
    const newConfig: TradeCustomizationConfig = {
      ...preset.config,
      updatedAt: new Date().toISOString(),
    }
    await persistConfig(newConfig)
  }

  // Update specific terms in dictionary
  const updateTerminology = async (updates: Partial<TradeTerminology>) => {
    const newConfig: TradeCustomizationConfig = {
      ...config,
      tradeType: 'custom',
      terminology: {
        ...config.terminology,
        ...updates,
      },
    }
    await persistConfig(newConfig)
  }

  // Toggle module on/off
  const toggleModule = async (moduleKey: ModuleKey, enabled: boolean) => {
    const newConfig: TradeCustomizationConfig = {
      ...config,
      modules: {
        ...config.modules,
        [moduleKey]: enabled,
      },
    }
    await persistConfig(newConfig)
  }

  const resetToDefault = async () => {
    await applyPreset('electrical')
  }

  // Translation helper
  const t = useCallback(
    (key: TerminologyKey, fallback?: string): string => {
      return config.terminology[key] || fallback || key
    },
    [config.terminology]
  )

  // Module check helper
  const isModuleEnabled = useCallback(
    (key: ModuleKey): boolean => {
      if (key === 'dashboard') return true
      return config.modules[key] !== false
    },
    [config.modules]
  )

  const value: TerminologyContextValue = {
    config,
    tradeType: config.tradeType,
    t,
    isModuleEnabled,
    applyPreset,
    updateTerminology,
    toggleModule,
    resetToDefault,
    saving,
    loading,
  }

  return <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>
}

export function useTerminology() {
  const context = useContext(TerminologyContext)
  if (!context) {
    throw new Error('useTerminology must be used within a TerminologyProvider')
  }
  return context
}
