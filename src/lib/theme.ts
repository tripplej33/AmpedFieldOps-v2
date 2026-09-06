import type { UserPreferences } from '@/types'
import { safeLocalStorage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'

export const PREFERENCES_STORAGE_KEY = 'amped_user_preferences_v1'

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: 'dark',
  themeColor: 'cyan',
  defaultLandingPage: '/app/dashboard',
  compactView: false,
  showSidebarSubcategories: false,
  enableSoundAlerts: true,
  enableEmailNotifications: true,
}

export const ACCENT_COLORS: Record<string, {
  name: string
  dark: { hex: string; rgb: string }
  light: { hex: string; rgb: string }
}> = {
  cyan: {
    name: 'Amped Cyan',
    dark: { hex: '#127da1', rgb: '18 125 161' },
    light: { hex: '#0891b2', rgb: '8 145 178' },
  },
  amber: {
    name: 'Amped Amber',
    dark: { hex: '#f59e0b', rgb: '245 158 11' },
    light: { hex: '#d97706', rgb: '217 119 6' },
  },
  blue: {
    name: 'Electric Blue',
    dark: { hex: '#2563eb', rgb: '37 99 235' },
    light: { hex: '#1d4ed8', rgb: '29 78 216' },
  },
  emerald: {
    name: 'Safety Emerald',
    dark: { hex: '#10b981', rgb: '16 185 129' },
    light: { hex: '#047857', rgb: '4 120 87' },
  },
  violet: {
    name: 'Cyber Violet',
    dark: { hex: '#8b5cf6', rgb: '139 92 246' },
    light: { hex: '#6d28d9', rgb: '109 40 217' },
  },
}

export function getStoredPreferences(): UserPreferences {
  try {
    const saved = safeLocalStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!saved) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function applyTheme(prefs: UserPreferences) {
  const root = document.documentElement

  // 1. Resolve light vs dark mode
  let isLight = prefs.themeMode === 'light'
  if (prefs.themeMode === 'system') {
    isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
  }

  if (isLight) {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
    root.style.colorScheme = 'light'
  } else {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
    root.style.colorScheme = 'dark'
  }

  // 2. Resolve accent color (optimized for light/dark contrast)
  const accentConfig = ACCENT_COLORS[prefs.themeColor] || ACCENT_COLORS.cyan
  const accent = isLight ? accentConfig.light : accentConfig.dark
  root.style.setProperty('--primary-color', accent.hex)
  root.style.setProperty('--primary-rgb', accent.rgb)

  // 3. Compact mode attribute
  if (prefs.compactView) {
    root.setAttribute('data-compact', 'true')
  } else {
    root.removeAttribute('data-compact')
  }
}

/**
 * Saves user preferences locally for 0ms response AND syncs to Supabase Auth user_metadata
 * so the preferences automatically sync across any browser, phone, or computer the user logs into.
 */
export async function savePreferences(prefs: UserPreferences, syncToServer = true) {
  try {
    safeLocalStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
    applyTheme(prefs)
    window.dispatchEvent(new CustomEvent('amped_preferences_updated', { detail: prefs }))

    if (syncToServer) {
      // Asynchronously update server-side user metadata in Supabase
      supabase.auth.updateUser({
        data: { preferences: prefs }
      }).catch((err) => {
        console.warn('Failed to sync preferences to Supabase server in background:', err)
      })
    }
  } catch (err) {
    console.error('Failed to save preferences:', err)
  }
}

/**
 * Synchronizes preferences received from the Supabase server upon login or profile load.
 */
export function syncPreferencesFromServer(serverPrefs: Partial<UserPreferences>) {
  if (!serverPrefs || typeof serverPrefs !== 'object') return
  const current = getStoredPreferences()
  const merged: UserPreferences = {
    ...current,
    ...serverPrefs,
  }
  safeLocalStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(merged))
  applyTheme(merged)
  window.dispatchEvent(new CustomEvent('amped_preferences_updated', { detail: merged }))
}

// Initialize theme on app load
export function initTheme() {
  const prefs = getStoredPreferences()
  applyTheme(prefs)
}
