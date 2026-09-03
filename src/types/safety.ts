export type SafetyCategory =
  | 'jsa'
  | 'swms'
  | 'confined_space'
  | 'take5'
  | 'hot_work'
  | 'custom'

export type SafetyDocStatus = 'draft' | 'pending_signatures' | 'completed' | 'expired'

export type SignatureType = 'on_the_spot' | 'remote' | 'qr_code'

export interface RiskMatrixRow {
  step: string
  hazard: string
  initial_likelihood: number // 1-5
  initial_consequence: number // 1-5
  controls: string
  residual_likelihood: number // 1-5
  residual_consequence: number // 1-5
}

export interface GasTestRow {
  test_time: string
  oxygen: string
  lel_flammable: string
  co_carbon_monoxide: string
  h2s_hydrogen_sulfide: string
  tester_name: string
  result: 'PASS' | 'FAIL'
}

export interface PPEItem {
  id: string
  label: string
  icon: string
  default?: boolean
}

export interface SafetyFormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'time' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: string[]
  default_value?: any
}

export interface SafetyFormSection {
  id: string
  title: string
  description?: string
  type?: 'standard' | 'ppe_grid' | 'risk_matrix_table' | 'gas_test_table' | 'checkbox_group'
  fields?: SafetyFormField[]
  items?: PPEItem[]
  options?: string[]
  default_rows?: RiskMatrixRow[] | GasTestRow[]
}

export interface SafetySchema {
  sections: SafetyFormSection[]
}

export interface SafetyTemplate {
  id: string
  title: string
  category: SafetyCategory
  description?: string | null
  schema: SafetySchema
  is_system_default: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SafetySignature {
  id: string
  document_id: string
  user_id?: string | null
  signer_name: string
  signer_role: string
  signature_data: string // base64 data URI
  sign_type: SignatureType
  status: 'signed' | 'pending'
  signed_at?: string | null
  geo_location?: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  created_at: string
}

export interface SafetyDocument {
  id: string
  template_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  title: string
  category: SafetyCategory
  status: SafetyDocStatus
  form_data: Record<string, any>
  storage_path?: string | null
  pdf_url?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Joined relations
  template?: SafetyTemplate
  project?: {
    id: string
    name: string
    address?: string | null
    suburb?: string | null
    city?: string | null
    client?: { name: string } | null
  }
  cost_center?: {
    id: string
    name: string
    customer_po_number?: string | null
  }
  signatures?: SafetySignature[]
}
