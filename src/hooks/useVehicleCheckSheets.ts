import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { VehicleCheckSheet, VehicleCheckSheetFormData } from '@/types'

export function useVehicleCheckSheets(vehicleId?: string) {
  const [checkSheets, setCheckSheets] = useState<VehicleCheckSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCheckSheets = useCallback(async () => {
    if (!vehicleId) {
      setCheckSheets([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: usersData }] = await Promise.all([
        supabase
          .from('vehicle_check_sheets')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('check_date', { ascending: false }),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((cs: any) => ({
        ...cs,
        technician: cs.technician_id ? userMap.get(cs.technician_id) : undefined,
      }))

      setCheckSheets(enriched as VehicleCheckSheet[])
    } catch (err) {
      console.error('Failed to fetch check sheets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch check sheets')
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    fetchCheckSheets()
  }, [fetchCheckSheets])

  return { checkSheets, loading, error, refresh: fetchCheckSheets }
}

export function useSubmitVehicleCheckSheet() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitCheckSheet = useCallback(
    async (data: VehicleCheckSheetFormData) => {
      try {
        setIsPending(true)
        setError(null)

        const allPass =
          data.oil_level === 'pass' &&
          data.coolant_level === 'pass' &&
          data.brake_fluid === 'pass' &&
          data.tire_tread_and_pressure === 'pass' &&
          data.exterior_cleanliness === 'pass' &&
          data.lights_and_indicators === 'pass'

        const status = allPass ? 'passed' : 'attention_required'

        const { data: record, error: insertErr } = await supabase
          .from('vehicle_check_sheets')
          .insert({
            vehicle_id: data.vehicle_id,
            technician_id: user?.id || null,
            check_date: data.check_date || new Date().toISOString().slice(0, 10),
            odometer_km: Number(data.odometer_km) || 0,
            oil_level: data.oil_level,
            coolant_level: data.coolant_level,
            brake_fluid: data.brake_fluid,
            tire_tread_and_pressure: data.tire_tread_and_pressure,
            exterior_cleanliness: data.exterior_cleanliness,
            lights_and_indicators: data.lights_and_indicators,
            status,
            notes: data.notes || null,
          })
          .select()
          .single()

        if (insertErr) throw insertErr

        // Update current odometer on vehicle
        if (data.odometer_km > 0) {
          await supabase
            .from('vehicles')
            .update({
              current_odometer_km: Number(data.odometer_km),
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.vehicle_id)
        }

        return record as VehicleCheckSheet
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to submit check sheet'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { submitCheckSheet, isPending, error }
}
