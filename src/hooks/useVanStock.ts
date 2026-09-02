import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { VanInventoryItem } from '@/types'

export function useVanStock(vehicleId?: string) {
  const [stock, setStock] = useState<VanInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStock = useCallback(async () => {
    if (!vehicleId) {
      setStock([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('van_inventory')
        .select(`
          *,
          item:inventory_items(*),
          vehicle:vehicles(id, registration_number, make_model)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setStock((data || []) as VanInventoryItem[])
    } catch (err) {
      console.error('Failed to fetch van stock:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch van stock')
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  return { stock, loading, error, refresh: fetchStock }
}

export function useAdjustVanStock() {
  const [isPending, setIsPending] = useState(false)

  const adjustStock = useCallback(async (vanInventoryId: string, newQuantity: number) => {
    try {
      setIsPending(true)
      const { error } = await supabase
        .from('van_inventory')
        .update({
          quantity_on_hand: Math.max(0, newQuantity),
          last_counted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', vanInventoryId)

      if (error) throw error
    } finally {
      setIsPending(false)
    }
  }, [])

  const addStockItem = useCallback(
    async (vehicleId: string, inventoryItemId: string, qty: number, targetQty = 10) => {
      try {
        setIsPending(true)
        const { error } = await supabase.from('van_inventory').upsert(
          {
            vehicle_id: vehicleId,
            inventory_item_id: inventoryItemId,
            quantity_on_hand: qty,
            target_stock_level: targetQty,
            last_counted_at: new Date().toISOString(),
          },
          { onConflict: 'vehicle_id,inventory_item_id' }
        )

        if (error) throw error
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { adjustStock, addStockItem, isPending }
}
