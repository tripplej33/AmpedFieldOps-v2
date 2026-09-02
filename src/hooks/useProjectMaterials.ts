import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectMaterial, ProjectMaterialFormData } from '@/types'

export function useProjectMaterials(projectId?: string) {
  const [materials, setMaterials] = useState<ProjectMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterials = useCallback(async () => {
    if (!projectId) {
      setMaterials([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [{ data: rows, error: err }, { data: usersData }] = await Promise.all([
        supabase
          .from('project_materials')
          .select(`
            *,
            cost_center:cost_centers(id, name, customer_po_number),
            inventory_item:inventory_items(id, sku, name, category),
            vehicle:vehicles(id, registration_number, make_model)
          `)
          .eq('project_id', projectId)
          .order('entry_date', { ascending: false }),
        supabase.from('users').select('id, full_name, email'),
      ])

      if (err) throw err

      const userMap = new Map((usersData || []).map((u) => [u.id, u]))
      const enriched = (rows || []).map((m: any) => ({
        ...m,
        user: m.logged_by ? userMap.get(m.logged_by) : undefined,
      }))

      setMaterials(enriched as ProjectMaterial[])
    } catch (err) {
      console.error('Failed to fetch project materials:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project materials')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  return { materials, loading, error, refresh: fetchMaterials }
}

export function useLogProjectMaterial() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logMaterial = useCallback(
    async (data: ProjectMaterialFormData) => {
      try {
        setIsPending(true)
        setError(null)

        const qty = Number(data.quantity_used) || 1
        const unitCost = Number(data.unit_cost) || 0
        const totalCost = qty * unitCost

        const { data: record, error: insertErr } = await supabase
          .from('project_materials')
          .insert({
            project_id: data.project_id,
            cost_center_id: data.cost_center_id || null,
            inventory_item_id: data.inventory_item_id || null,
            description: data.description,
            quantity_used: qty,
            unit_of_measure: data.unit_of_measure || 'EA',
            unit_cost: unitCost,
            charge_out_rate: Number(data.charge_out_rate) || 0,
            total_cost: totalCost,
            source: data.source || 'van_stock',
            vehicle_id: data.vehicle_id || null,
            logged_by: user?.id || null,
            entry_date: data.entry_date || new Date().toISOString().slice(0, 10),
            notes: data.notes || null,
          })
          .select()
          .single()

        if (insertErr) throw insertErr

        // If pulled from van stock, automatically deduct quantity_on_hand from van_inventory!
        if (data.source === 'van_stock' && data.vehicle_id && data.inventory_item_id) {
          const { data: currentVanStock } = await supabase
            .from('van_inventory')
            .select('id, quantity_on_hand')
            .eq('vehicle_id', data.vehicle_id)
            .eq('inventory_item_id', data.inventory_item_id)
            .maybeSingle()

          if (currentVanStock) {
            const newQty = Math.max(0, currentVanStock.quantity_on_hand - qty)
            await supabase
              .from('van_inventory')
              .update({ quantity_on_hand: newQty, last_counted_at: new Date().toISOString() })
              .eq('id', currentVanStock.id)
          }
        }

        return record as ProjectMaterial
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to log material'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { logMaterial, isPending, error }
}
