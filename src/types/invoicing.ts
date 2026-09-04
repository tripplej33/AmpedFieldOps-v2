export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void'
export type InvoiceLineItemType = 'labor' | 'equipment_hire' | 'materials' | 'fixed_fee' | 'other'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  item_type: InvoiceLineItemType
  timesheet_id?: string | null
  inventory_item_id?: string | null
  equipment_usage_id?: string | null
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
  xero_item_code?: string | null
  created_at?: string
}

export interface Invoice {
  id: string
  invoice_number: string
  project_id?: string | null
  client_id?: string | null
  issue_date: string
  due_date: string
  status: InvoiceStatus
  subtotal: number
  tax_total: number
  total_amount: number
  tax_rate: number
  xero_invoice_id?: string | null
  xero_invoice_number?: string | null
  xero_status?: string | null
  notes?: string | null
  client_notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  project?: {
    id: string
    name: string
  } | null
  client?: {
    id: string
    name: string
    email?: string
    xero_contact_id?: string
    address?: string
  } | null
  line_items?: InvoiceLineItem[]
}
