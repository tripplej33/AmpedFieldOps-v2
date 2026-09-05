import type { InventoryItem } from '@/types'

export type LocationType = 'warehouse' | 'workshop' | 'van' | 'site_container' | 'yard' | 'other'
export type TransactionType = 'transfer' | 'job_booking' | 'restock' | 'adjustment'

export interface InventoryLocation {
  id: string
  name: string
  location_type: LocationType
  vehicle_id?: string | null
  is_primary?: boolean
  created_at: string
  updated_at?: string
  vehicle?: {
    id: string
    registration_number: string
    make_model: string
  } | null
}

export interface InventoryStockLevel {
  id: string
  item_id: string
  location_id: string
  quantity_on_hand: number
  min_reorder_level: number
  target_stock_level: number
  bin_rack?: string | null
  last_counted_at?: string | null
  created_at: string
  updated_at?: string
  item?: InventoryItem | null
  location?: InventoryLocation | null
}

export interface InventoryTransaction {
  id: string
  item_id: string
  source_location_id?: string | null
  dest_location_id?: string | null
  project_id?: string | null
  transaction_type: TransactionType
  quantity: number
  unit_cost?: number | null
  charge_price?: number | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  item?: InventoryItem | null
  source_location?: InventoryLocation | null
  dest_location?: InventoryLocation | null
  project?: {
    id: string
    name: string
  } | null
  creator?: {
    id: string
    full_name: string
  } | null
}
