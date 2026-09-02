import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem, InventoryItemFormData } from '@/types'

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('inventory_items')
        .select('*, vendor:clients(id, name)')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (err) throw err
      setItems((data || []) as InventoryItem[])
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return { items, loading, error, refresh: fetchItems }
}

export function useCreateInventoryItem() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: InventoryItemFormData) => {
    try {
      setIsPending(true)
      setError(null)

      const { data: item, error: err } = await supabase
        .from('inventory_items')
        .insert({
          sku: data.sku.toUpperCase(),
          name: data.name,
          category: data.category || 'General',
          unit_of_measure: data.unit_of_measure || 'EA',
          unit_cost: Number(data.unit_cost) || 0,
          default_charge_rate: Number(data.default_charge_rate) || 0,
          min_reorder_level: Number(data.min_reorder_level) || 5,
          vendor_id: data.vendor_id || null,
        })
        .select()
        .single()

      if (err) throw err
      return item as InventoryItem
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add item'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsPending(false)
    }
  }, [])

  return { create, isPending, error }
}
