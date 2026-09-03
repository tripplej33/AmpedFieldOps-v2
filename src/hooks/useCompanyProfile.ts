import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CompanyProfile {
  companyName: string
  logoUrl?: string | null
  nzbn?: string
  taxRate?: number
  currency?: string
  timezone?: string
  supportEmail?: string
  phone?: string
  address?: string
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'Amped Electrical & Field Operations Ltd',
  logoUrl: null,
  nzbn: '9429050012345',
  taxRate: 15,
  currency: 'NZD ($)',
  timezone: 'Pacific/Auckland (UTC+12:00)',
  supportEmail: 'duncan@ampedlogix.com',
  phone: '+64 21 000 0000',
  address: 'Auckland, New Zealand',
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('amped_company_settings')
      if (saved) {
        return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(saved) }
      }
    } catch {}
    return DEFAULT_COMPANY_PROFILE
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'company_profile')
        .maybeSingle()

      if (err) {
        console.warn('[useCompanyProfile] Warning fetching app_settings:', err.message)
        return
      }

      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
        const merged = { ...DEFAULT_COMPANY_PROFILE, ...parsed }
        setProfile(merged)
        localStorage.setItem('amped_company_settings', JSON.stringify(merged))
      }
    } catch (e) {
      console.warn('[useCompanyProfile] Fallback to cached profile:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveProfile = async (newProfile: Partial<CompanyProfile>) => {
    try {
      setSaving(true)
      setError(null)
      const merged: CompanyProfile = {
        ...profile,
        ...newProfile,
      }

      // 1. Save to local storage for instant offline / cache access
      localStorage.setItem('amped_company_settings', JSON.stringify(merged))
      setProfile(merged)

      // 2. Save to app_settings table in Supabase
      const { error: upsertErr } = await supabase
        .from('app_settings')
        .upsert(
          [
            {
              key: 'company_profile',
              value: JSON.stringify(merged),
              is_encrypted: false,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'key' }
        )

      if (upsertErr) {
        console.warn('[useCompanyProfile] Supabase sync warning:', upsertErr.message)
      }

      return merged
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save company profile'
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File): Promise<string> => {
    try {
      setSaving(true)
      setError(null)

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Logo image exceeds 10MB limit')
      }

      // Convert image to base64 for guaranteed offline rendering in jsPDF
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Also upload to storage bucket for remote URL hosting
      const timestamp = Date.now()
      const ext = file.name.split('.').pop() || 'png'
      const storagePath = `branding/company_logo_${timestamp}.${ext}`

      let hostedUrl = base64DataUrl
      try {
        const { error: upErr } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, { upsert: true, contentType: file.type })

        if (!upErr) {
          const { data: signData } = await supabase.storage
            .from('project-files')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
          if (signData?.signedUrl) {
            hostedUrl = signData.signedUrl
          }
        }
      } catch (storageErr) {
        console.warn('[useCompanyProfile] Storage upload fallback to base64:', storageErr)
      }

      // Store both base64 (for jsPDF canvas) and hostedUrl
      const updated = await saveProfile({
        logoUrl: base64DataUrl,
      })

      return updated.logoUrl || hostedUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload company logo'
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const removeLogo = async () => {
    return await saveProfile({ logoUrl: null })
  }

  return {
    profile,
    loading,
    saving,
    error,
    refresh: fetchProfile,
    saveProfile,
    uploadLogo,
    removeLogo,
  }
}
