export interface CircuitTestRow {
  id: string
  circuitNumber: string
  description: string
  cableSize: string
  breakerRating: string
  breakerType: string
  rcdRating?: string
  rpe?: number | null // Earth continuity in Ohms
  rins?: number | null // Insulation resistance in MegaOhms (MΩ)
  polarity: boolean
  zs?: number | null // Fault loop impedance in Ohms
  rcdTripTime?: number | null // RCD trip time in milliseconds
  rcdTripCurrent?: number | null // RCD trip current in mA
  pass: boolean
}

export interface BondingChecks {
  water: boolean
  gas: boolean
  waste: boolean
  structural: boolean
}

export interface ElectricalTestSheet {
  id: string
  project_id: string
  technician_id?: string | null
  title: string
  test_date: string
  supply_system: string
  voltage: string
  main_switch_rating?: string | null
  main_earth_resistance?: number | null
  earth_electrode_type?: string | null
  bonding_checks: BondingChecks
  circuits: CircuitTestRow[]
  tester_serial_number?: string | null
  tester_model?: string | null
  tester_calibration_date?: string | null
  comments?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Relations
  technician?: {
    id: string
    full_name: string
    email: string
  } | null
  project?: {
    id: string
    name: string
    address?: string | null
    suburb?: string | null
    city?: string | null
    client?: {
      name: string
    } | null
  } | null
}

export type CertType = 'coc' | 'esc' | 'combined_coc_esc'
export type CertStatus = 'draft' | 'certified' | 'archived'

export interface ElectricalCertificate {
  id: string
  project_id: string
  test_sheet_id?: string | null
  cert_type: CertType
  cert_number: string
  installation_type: 'new_work' | 'alteration' | 'repair'
  is_high_risk: boolean
  high_risk_details?: string | null
  certifier_name: string
  certifier_registration: string
  certification_date: string
  certifier_signature_svg?: string | null
  client_signer_name?: string | null
  client_signature_svg?: string | null
  pdf_url?: string | null
  status: CertStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Relations
  test_sheet?: ElectricalTestSheet | null
  project?: {
    id: string
    name: string
    address?: string | null
    suburb?: string | null
    city?: string | null
    client?: {
      name: string
    } | null
  } | null
}

export interface SwitchboardCircuit {
  id: string
  circuitNo: string
  phase: 'L1' | 'L2' | 'L3' | 'Single'
  breakerRating: string
  poles: number
  cableSize: string
  rcdGroup?: string
  description: string
  isSpare: boolean
}

export interface SwitchboardSchedule {
  id: string
  project_id: string
  board_name: string
  location?: string | null
  incomer_rating?: string | null
  enclosure_type?: string | null
  circuits: SwitchboardCircuit[]
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}
