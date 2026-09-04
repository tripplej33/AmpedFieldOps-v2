import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryLocation, InventoryStockLevel } from '@/types/inventory'

export function useInventoryLocations() {
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('inventory_locations')
        .select(`
          *,
          vehicle:vehicles(id, registration_number, make_model)
        `)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })

      if (err) throw err

      // If no locations exist yet, initialize default Warehouse
      if (!data || data.length === 0) {
        const { data: initData, error: initErr } = await supabase
          .from('inventory_locations')
          .insert([
            { name: 'Main HQ / Workshop Warehouse', location_type: 'warehouse', is_primary: true },
          ])
          .select()
        if (!initErr && initData) {
          setLocations(initData as InventoryLocation[])
          return
        }
      }

      setLocations((data || []) as InventoryLocation[])
    } catch (err) {
      console.error('[useInventoryLocations] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory locations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocations()

    const channel = supabase
      .channel('inventory_locations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_locations' }, () => fetchLocations())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLocations])

  return { locations, loading, error, refresh: fetchLocations }
}

export function useStockLevels(locationId?: string) {
  const [stockLevels, setStockLevels] = useState<InventoryStockLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStock = useCallback(async () => {
    if (!locationId) {
      setStockLevels([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('inventory_stock_levels')
        .select(`
          *,
          item:inventory_items(*),
          location:inventory_locations(*)
        `)
        .eq('location_id', locationId)
        .order('updated_at', { ascending: false })

      if (err) throw err
      setStockLevels((data || []) as InventoryStockLevel[])
    } catch (err) {
      console.error('[useStockLevels] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stock levels')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchStock()

    const channel = supabase
      .channel('inventory_stock_levels_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_stock_levels' }, () => fetchStock())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchStock])

  return { stockLevels, loading, error, refresh: fetchStock }
}

export function useInventoryOperations() {
  const [isPending, setIsPending] = useState(false)

  // 1. Transfer stock from source location to destination location
  const transferStock = async ({
    itemId,
    sourceLocationId,
    destLocationId,
    quantity,
    notes,
  }: {
    itemId: string
    sourceLocationId: string
    destLocationId: string
    quantity: number
    notes?: string
  }) => {
    setIsPending(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      // Fetch source stock level
      const { data: sourceData } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', sourceLocationId)
        .maybeSingle()

      const currentSourceQty = Number(sourceData?.quantity_on_hand || 0)
      const newSourceQty = Math.max(0, currentSourceQty - quantity)

      // Update source
      await supabase
        .from('inventory_stock_levels')
        .upsert({
          item_id: itemId,
          location_id: sourceLocationId,
          quantity_on_hand: newSourceQty,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id,location_id' })

      // Fetch dest stock level
      const { data: destData } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', destLocationId)
        .maybeSingle()

      const currentDestQty = Number(destData?.quantity_on_hand || 0)
      const newDestQty = currentDestQty + quantity

      // Update destination
      await supabase
        .from('inventory_stock_levels')
        .upsert({
          item_id: itemId,
          location_id: destLocationId,
          quantity_on_hand: newDestQty,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id,location_id' })

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        item_id: itemId,
        source_location_id: sourceLocationId,
        dest_location_id: destLocationId,
        transaction_type: 'transfer',
        quantity,
        notes: notes || 'Location to location stock transfer',
        created_by: authData?.user?.id || null,
      })
    } finally {
      setIsPending(false)
    }
  }

  // 2. Book stock out directly onto a project (Job Booking)
  const bookStockToProject = async ({
    itemId,
    sourceLocationId,
    projectId,
    quantity,
    chargePrice,
    notes,
  }: {
    itemId: string
    sourceLocationId: string
    projectId: string
    quantity: number
    chargePrice?: number
    notes?: string
  }) => {
    setIsPending(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      // Fetch item details
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .single()

      // Decrement source location stock
      const { data: sourceData } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', sourceLocationId)
        .maybeSingle()

      const currentSourceQty = Number(sourceData?.quantity_on_hand || 0)
      const newSourceQty = Math.max(0, currentSourceQty - quantity)

      await supabase
        .from('inventory_stock_levels')
        .upsert({
          item_id: itemId,
          location_id: sourceLocationId,
          quantity_on_hand: newSourceQty,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id,location_id' })

      const unitCost = Number(itemData?.unit_cost || 0)
      const sellPrice = chargePrice !== undefined ? chargePrice : Number(itemData?.default_charge_rate || unitCost * 1.25)

      // Add to project materials
      await supabase.from('project_materials').insert({
        project_id: projectId,
        item_id: itemId,
        name: itemData?.name || 'Inventory Item',
        quantity,
        unit_cost: unitCost,
        charge_rate: sellPrice,
        invoiced: false,
      })

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        item_id: itemId,
        source_location_id: sourceLocationId,
        project_id: projectId,
        transaction_type: 'job_booking',
        quantity,
        unit_cost: unitCost,
        charge_price: sellPrice,
        notes: notes || 'Allocated directly to project',
        created_by: authData?.user?.id || null,
      })
    } finally {
      setIsPending(false)
    }
  }

  // 3. Adjust quantity on hand
  const adjustStockLevel = async (locationId: string, itemId: string, newQuantity: number, binRack?: string) => {
    setIsPending(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      await supabase
        .from('inventory_stock_levels')
        .upsert({
          item_id: itemId,
          location_id: locationId,
          quantity_on_hand: Math.max(0, newQuantity),
          bin_rack: binRack || null,
          last_counted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id,location_id' })

      await supabase.from('inventory_transactions').insert({
        item_id: itemId,
        source_location_id: locationId,
        transaction_type: 'adjustment',
        quantity: newQuantity,
        notes: 'Stock count / level adjustment',
        created_by: authData?.user?.id || null,
      })
    } finally {
      setIsPending(false)
    }
  }

  return {
    isPending,
    transferStock,
    bookStockToProject,
    adjustStockLevel,
  }
}
