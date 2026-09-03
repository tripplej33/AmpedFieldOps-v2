export type EquipmentType = 'mft' | 'insulation' | 'pat' | 'clamp' | 'gas_detector' | 'other'
export type EquipmentStatus = 'valid' | 'due_soon' | 'expired' | 'out_for_service'

export interface EquipmentItem {
  id: string
  equipment_name: string
  asset_tag?: string | null
  serial_number: string
  equipment_type: EquipmentType
  last_calibration_date?: string | null
  calibration_expiry_date?: string | null
  calibration_cert_url?: string | null
  status: EquipmentStatus
  assigned_user_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  assigned_user?: {
    id: string
    full_name: string
  } | null
}

export interface PatTestLog {
  id: string
  appliance_name: string
  barcode: string
  location_or_van?: string | null
  test_date: string
  retest_frequency_months: number
  next_test_date: string
  earth_continuity_pass: boolean
  insulation_resistance_pass: boolean
  visual_inspection_pass: boolean
  overall_result: 'pass' | 'fail'
  technician_id?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
  technician?: {
    id: string
    full_name: string
  } | null
}
