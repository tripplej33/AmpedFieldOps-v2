import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PurchaseOrder, PurchaseOrderFormData, POStatus } from '@/types'

export function usePurchaseOrders(projectId?: string, vehicleId?: string) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('purchase_orders')
        .select(
          `
          *,
          project:projects(id, name),
          cost_center:cost_centers(id, name, customer_po_number),
          vendor:clients(id, name, contact_name, email, phone, contact_type),
          vehicle:vehicles(id, registration_number, make_model),
          items:purchase_order_items(*)
        `
        )
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId)
      }

      const { data, error: err } = await query

      if (err) throw err
      setPurchaseOrders((data || []) as PurchaseOrder[])
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }, [projectId, vehicleId])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [fetchPurchaseOrders])

  return { purchaseOrders, loading, error, refresh: fetchPurchaseOrders }
}

export function useCreatePurchaseOrder() {
  const { user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (data: PurchaseOrderFormData) => {
      try {
        setIsPending(true)
        setError(null)

        // 1. Calculate subtotal, tax (15% default), and total
        const subtotal = data.items.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
          0
        )
        const tax = subtotal * 0.15 // 15% GST
        const total = subtotal + tax

        // 2. Insert PO record
        const { data: poRecord, error: poErr } = await supabase
          .from('purchase_orders')
          .insert({
            user_id: user?.id || null,
            order_type: data.order_type || 'project_job',
            project_id: data.project_id || null,
            cost_center_id: data.cost_center_id || null,
            vehicle_id: data.vehicle_id || null,
            vendor_id: data.vendor_id || null,
            po_number: data.po_number,
            order_date: data.order_date,
            expected_delivery_date: data.expected_delivery_date || null,
            delivery_address: data.delivery_address || null,
            delivery_notes: data.delivery_notes || null,
            subtotal,
            tax,
            total,
            notes: data.notes || null,
            status: 'ordered',
          })
          .select()
          .single()

        if (poErr) throw poErr

        // 3. Insert line items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map((item) => ({
            purchase_order_id: poRecord.id,
            item_code: item.item_code || null,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit_of_measure: item.unit_of_measure || 'EA',
            unit_cost: Number(item.unit_cost) || 0,
            total_cost: (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0),
            notes: item.notes || null,
          }))

          const { error: itemsErr } = await supabase
            .from('purchase_order_items')
            .insert(itemsToInsert)

          if (itemsErr) throw itemsErr
        }

        return poRecord as PurchaseOrder
      } catch (err) {
        console.error('Failed to create PO:', err)
        const msg = err instanceof Error ? err.message : 'Failed to create purchase order'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsPending(false)
      }
    },
    [user?.id]
  )

  return { create, isPending, error }
}

export function useUpdatePOStatus() {
  const [isPending, setIsPending] = useState(false)

  const updateStatus = useCallback(async (poId: string, status: POStatus) => {
    try {
      setIsPending(true)
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', poId)

      if (error) throw error
    } finally {
      setIsPending(false)
    }
  }, [])

  return { updateStatus, isPending }
}

export function useReceivePOItem() {
  const [isPending, setIsPending] = useState(false)

  const receiveItem = useCallback(
    async (itemId: string, receivedQuantity: number, poId: string) => {
      try {
        setIsPending(true)

        // 1. Get current item and parent PO details
        const [{ data: itemRecord }, { data: poRecord }] = await Promise.all([
          supabase.from('purchase_order_items').select('*').eq('id', itemId).single(),
          supabase.from('purchase_orders').select('*').eq('id', poId).single(),
        ])

        const diff = receivedQuantity - (itemRecord?.received_quantity || 0)

        // 2. Update item received_quantity
        const { error: itemErr } = await supabase
          .from('purchase_order_items')
          .update({ received_quantity: receivedQuantity })
          .eq('id', itemId)

        if (itemErr) throw itemErr

        // 3. If PO is a Van Restock, restock the vehicle inventory
        const currentPo = poRecord || (await supabase.from('purchase_orders').select('*').eq('id', poId).single()).data

        if (currentPo?.order_type === 'van_restock' && currentPo?.vehicle_id && diff > 0 && itemRecord) {
          // Find or create matching inventory item
          let inventoryItemId: string | null = null

          if (itemRecord.item_code) {
            const { data: found } = await supabase
              .from('inventory_items')
              .select('id')
              .eq('sku', itemRecord.item_code)
              .maybeSingle()
            if (found) inventoryItemId = found.id
          }

          if (!inventoryItemId) {
            const { data: foundByName } = await supabase
              .from('inventory_items')
              .select('id')
              .ilike('name', itemRecord.description)
              .maybeSingle()
            if (foundByName) inventoryItemId = foundByName.id
          }

          // If no item in catalog, create one
          if (!inventoryItemId) {
            const { data: createdItem } = await supabase
              .from('inventory_items')
              .insert({
                sku: itemRecord.item_code || `SKU-${Date.now().toString(36).toUpperCase()}`,
                name: itemRecord.description,
                category: 'Supplies',
                unit_of_measure: itemRecord.unit_of_measure || 'EA',
                unit_cost: itemRecord.unit_cost || 0,
                default_charge_rate: (itemRecord.unit_cost || 0) * 1.35,
                min_reorder_level: 5,
                vendor_id: currentPo.vendor_id || null,
              })
              .select('id')
              .single()

            if (createdItem) inventoryItemId = createdItem.id
          }

          if (inventoryItemId) {
            // Check if van stock record exists
            const { data: vanStock } = await supabase
              .from('van_inventory')
              .select('id, quantity_on_hand')
              .eq('vehicle_id', currentPo.vehicle_id)
              .eq('inventory_item_id', inventoryItemId)
              .maybeSingle()

            if (vanStock) {
              await supabase
                .from('van_inventory')
                .update({
                  quantity_on_hand: vanStock.quantity_on_hand + diff,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', vanStock.id)
            } else {
              await supabase.from('van_inventory').insert({
                vehicle_id: currentPo.vehicle_id,
                inventory_item_id: inventoryItemId,
                quantity_on_hand: diff,
                target_stock_level: Math.max(diff, 10),
              })
            }
          }
        }

        // 4. Update overall PO status
        const { data: allItems } = await supabase
          .from('purchase_order_items')
          .select('quantity, received_quantity')
          .eq('purchase_order_id', poId)

        if (allItems && allItems.length > 0) {
          const allReceived = allItems.every((i) => (i.received_quantity || 0) >= i.quantity)
          const partiallyReceived = allItems.some((i) => (i.received_quantity || 0) > 0)

          const newStatus: POStatus = allReceived
            ? 'received'
            : partiallyReceived
            ? 'partially_received'
            : 'ordered'

          await supabase
            .from('purchase_orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', poId)
        }
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { receiveItem, isPending }
}
