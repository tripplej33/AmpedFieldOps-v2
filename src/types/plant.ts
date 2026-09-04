export type AssetCategory = 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'
export type UsageTrackingType = 'km' | 'hours'

export interface EquipmentUsageLog {
  id: string
  vehicle_id: string
  project_id: string
  timesheet_id?: string | null
  operator_id?: string | null
  start_reading: number
  end_reading: number
  units_used: number
  tracking_type: UsageTrackingType
  hourly_rate: number
  charge_amount: number
  date: string
  notes?: string | null
  invoiced: boolean
  invoice_id?: string | null
  created_at: string
  vehicle?: {
    id: string
    make_model: string
    registration_number: string
    asset_category: AssetCategory
  } | null
  project?: {
    id: string
    name: string
  } | null
  operator?: {
    id: string
    full_name: string
  } | null
}
