import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { EquipmentUsageLog } from '@/types/plant'
import type { Vehicle } from '@/types'

export function usePlantEquipment() {
  const [plantItems, setPlantItems] = useState<Vehicle[]>([])
  const [usageLogs, setUsageLogs] = useState<EquipmentUsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [plantRes, logsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select(`
            *,
            technician:users!assigned_technician_id(id, full_name, email)
          `)
          .in('asset_category', ['heavy_machinery', 'equipment', 'trailer', 'vehicle'])
          .order('make_model', { ascending: true }),
        supabase
          .from('equipment_usage_logs')
          .select(`
            *,
            vehicle:vehicles(id, make_model, registration_number, asset_category),
            project:projects(id, name),
            operator:users!operator_id(id, full_name)
          `)
          .order('date', { ascending: false }),
      ])

      if (plantRes.error) throw plantRes.error
      if (logsRes.error) throw logsRes.error

      setPlantItems((plantRes.data || []) as Vehicle[])
      setUsageLogs((logsRes.data || []) as EquipmentUsageLog[])
    } catch (err) {
      console.error('[usePlantEquipment] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch plant data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('plant_equipment_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_usage_logs' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const logUsage = async ({
    vehicleId,
    projectId,
    timesheetId,
    startReading,
    endReading,
    unitsUsed,
    trackingType = 'hours',
    hourlyRate = 0,
    date = new Date().toISOString().slice(0, 10),
    notes,
  }: {
    vehicleId: string
    projectId: string
    timesheetId?: string
    startReading?: number
    endReading?: number
    unitsUsed: number
    trackingType?: 'hours' | 'km'
    hourlyRate?: number
    date?: string
    notes?: string
  }) => {
    const { data: authData } = await supabase.auth.getUser()
    const chargeAmount = unitsUsed * hourlyRate

    const { data, error: err } = await supabase
      .from('equipment_usage_logs')
      .insert({
        vehicle_id: vehicleId,
        project_id: projectId,
        timesheet_id: timesheetId || null,
        operator_id: authData?.user?.id || null,
        start_reading: startReading || 0,
        end_reading: endReading || 0,
        units_used: unitsUsed,
        tracking_type: trackingType,
        hourly_rate: hourlyRate,
        charge_amount: chargeAmount,
        date,
        notes: notes || null,
        invoiced: false,
      })
      .select()
      .single()

    if (err) throw err

    // Also update vehicle's current hours or odometer reading
    if (endReading && endReading > 0) {
      if (trackingType === 'hours') {
        await supabase.from('vehicles').update({ current_hours: endReading }).eq('id', vehicleId)
      } else {
        await supabase.from('vehicles').update({ current_odometer_km: endReading }).eq('id', vehicleId)
      }
    }

    await fetchData()
    return data as EquipmentUsageLog
  }

  const deleteLog = async (id: string) => {
    const { error: err } = await supabase.from('equipment_usage_logs').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  return {
    plantItems,
    usageLogs,
    loading,
    error,
    refresh: fetchData,
    logUsage,
    deleteLog,
  }
}
