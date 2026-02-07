export interface User {
  id: string
  email: string
  role: 'admin' | 'manager' | 'technician' | 'viewer'
  full_name?: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  roles?: Array<'admin' | 'manager' | 'technician' | 'viewer'>
}


export interface Client {
  id: string
  user_id: string | null
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  billing_address?: string
  status: 'active' | 'inactive'
  notes?: string
  xero_contact_id?: string
  created_at: string
  updated_at: string
}

export interface ClientFormData {
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  billing_address?: string
  status: 'active' | 'inactive'
  notes?: string
}

export interface Invoice {
  id: string
  client_id: string
  xero_invoice_id: string
  invoice_number: string
  status: string
  payment_status: 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'paid' | 'overdue' | 'void'
  issue_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  amount_paid: number
  amount_due: number
  currency: string
  client_name?: string
}

export interface InvoicePipelineItem {
  status: 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'paid' | 'overdue' | 'void'
  count: number
  amount: number
}

export type ProjectStatus = 'Pending' | 'Active' | 'On Hold' | 'Completed' | 'Invoiced' | 'Archived'

export interface Project {
  id: string
  user_id: string
  client_id: string
  name: string
  description?: string
  status: ProjectStatus
  start_date?: string
  end_date?: string
  budget?: number
  notes?: string
  created_at: string
  updated_at: string
  // Optional: populated when fetching single project with client join
  clients?: {
    company?: string
    first_name?: string
    last_name?: string
  }
}

export interface ProjectFormData {
  name: string
  description?: string
  client_id: string
  status: ProjectStatus
  start_date?: string
  end_date?: string
  budget?: number
  notes?: string
}

export interface ProjectFilters {
  status?: ProjectStatus[]
  startDate?: string
  endDate?: string
  clientId?: string
}

// Timesheets
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'invoiced'

export interface ActivityType {
  id: string
  user_id: string
  name: string
  default_rate?: number | null
  xero_item_id?: string | null
  xero_item_code?: string | null
  xero_tax_type?: string | null
  managed_by_xero: boolean
  created_at: string
  updated_at: string
}

export interface ActivityTypeFormData {
  name: string
  default_rate?: number
  xero_item_id?: string
  xero_item_code?: string
  xero_tax_type?: string
  managed_by_xero?: boolean
}

export interface CostCenter {
  id: string
  user_id: string
  project_id: string
  name: string
  budget?: number | null
  customer_po_number?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  project?: Project
}

export interface CostCenterFormData {
  project_id: string
  name: string
  budget?: number
  customer_po_number?: string
  notes?: string
}

export interface Timesheet {
  id: string
  user_id: string
  project_id: string
  cost_center_id?: string | null
  activity_type_id: string
  entry_date: string // ISO date
  hours: number
  status: TimesheetStatus
  notes?: string | null
  submitted_at?: string | null
  submitted_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
  invoiced_at?: string | null
  created_at: string
  updated_at: string
  project?: Project
  cost_center?: CostCenter
  activity_type?: ActivityType
  user?: { id: string; email: string; full_name: string }
}

export interface TimesheetFormData {
  project_id: string
  cost_center_id?: string
  activity_type_id: string
  entry_date: string
  hours: number
  notes?: string
}

export interface TimesheetEntryData {
  activity_type_id: string
  user_id: string
  hours: number
  notes?: string
}

export interface BulkTimesheetFormData {
  project_id: string
  cost_center_id?: string
  entry_date: string
  entries: TimesheetEntryData[]
}

export interface TimesheetFilters {
  startDate?: string
  endDate?: string
  projectId?: string
  status?: TimesheetStatus[]
  userId?: string
}
// Files
export interface ProjectFile {
  id: string
  project_id: string
  path: string
  name: string
  size_bytes: number
  mime_type?: string | null
  uploaded_by: string
  created_at: string
}