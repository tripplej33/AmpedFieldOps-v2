import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_SUPABASE_URL = 'https://dcssbsxjtfibwfxoagxl.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3Nic3hqdGZpYndmeG9hZ3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Mjk5NDUsImV4cCI6MjA4NDEwNTk0NX0.SwXX6sn_FKBVY1caY33P9Mq7oh7zOlTjwoXq8IkRoCQ'

/**
 * Retrieves the currently active Supabase URL, Anon Key, and Host Pointer
 * prioritizing local storage overrides over build-time environment variables.
 */
export function getStoredSupabaseConfig() {
  const url =
    (typeof window !== 'undefined' ? localStorage.getItem('amped_custom_supabase_url') : null) ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL

  const key =
    (typeof window !== 'undefined' ? localStorage.getItem('amped_custom_supabase_key') : null) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  const host =
    (typeof window !== 'undefined' ? localStorage.getItem('amped_server_host') : null) ||
    import.meta.env.VITE_SERVER_HOST ||
    url

  return { url: url.trim(), key: key.trim(), host: host.trim() }
}

/**
 * Saves a custom Server Host or Supabase endpoint into local storage.
 */
export function saveSupabaseConfig(url: string, key?: string, host?: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('amped_custom_supabase_url', url.trim())
    if (key) localStorage.setItem('amped_custom_supabase_key', key.trim())
    if (host) localStorage.setItem('amped_server_host', host.trim())
  }
}

/**
 * Resets local storage configuration back to system default.
 */
export function resetSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('amped_custom_supabase_url')
    localStorage.removeItem('amped_custom_supabase_key')
    localStorage.removeItem('amped_server_host')
  }
}

const initialConfig = getStoredSupabaseConfig()

export const supabase: SupabaseClient = createClient(initialConfig.url, initialConfig.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'amped-field-ops-auth',
    flowType: 'pkce',
  },
})
