import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Vehicle, VehicleFormData } from '@/types'

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: usersData }] = await Promise.all([
        supabase.from('vehicles').select('*').order('registration_number', { ascending: true }),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((v: any) => ({
        ...v,
        technician: v.assigned_technician_id ? userMap.get(v.assigned_technician_id) : undefined,
      }))

      setVehicles(enriched as Vehicle[])
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  return { vehicles, loading, error, refresh: fetchVehicles }
}

export function useCreateVehicle() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: VehicleFormData) => {
    try {
      setIsPending(true)
      setError(null)

      const { data: vehicle, error: err } = await supabase
        .from('vehicles')
        .insert({
          registration_number: data.registration_number.toUpperCase().trim(),
          make_model: data.make_model.trim(),
          year: data.year || null,
          vin: data.vin || null,
          assigned_technician_id: data.assigned_technician_id || null,
          wof_expiry_date: data.wof_expiry_date || null,
          rego_expiry_date: data.rego_expiry_date || null,
          ruc_due_km: data.ruc_due_km || null,
          current_odometer_km: Number(data.current_odometer_km) || 0,
          status: data.status || 'active',
          notes: data.notes || null,
        })
        .select()
        .single()

      if (err) throw err
      return vehicle as Vehicle
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add vehicle'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsPending(false)
    }
  }, [])

  return { create, isPending, error }
}

export function useUpdateVehicle() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, data: Partial<VehicleFormData>) => {
    try {
      setIsPending(true)
      setError(null)

      const updatePayload: any = {}
      if (data.registration_number !== undefined) updatePayload.registration_number = data.registration_number.toUpperCase().trim()
      if (data.make_model !== undefined) updatePayload.make_model = data.make_model.trim()
      if (data.year !== undefined) updatePayload.year = data.year || null
      if (data.vin !== undefined) updatePayload.vin = data.vin || null
      if (data.assigned_technician_id !== undefined) updatePayload.assigned_technician_id = data.assigned_technician_id || null
      if (data.wof_expiry_date !== undefined) updatePayload.wof_expiry_date = data.wof_expiry_date || null
      if (data.rego_expiry_date !== undefined) updatePayload.rego_expiry_date = data.rego_expiry_date || null
      if (data.ruc_due_km !== undefined) updatePayload.ruc_due_km = data.ruc_due_km || null
      if (data.current_odometer_km !== undefined) updatePayload.current_odometer_km = Number(data.current_odometer_km) || 0
      if (data.status !== undefined) updatePayload.status = data.status
      if (data.notes !== undefined) updatePayload.notes = data.notes || null

      const { data: vehicle, error: err } = await supabase
        .from('vehicles')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return vehicle as Vehicle
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update vehicle'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsPending(false)
    }
  }, [])

  return { update, isPending, error }
}
