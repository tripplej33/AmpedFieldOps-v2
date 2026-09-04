export interface User {
  id: string
  email: string
  role: string
  full_name?: string
  phone?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  themeMode: 'dark' | 'light' | 'system'
  themeColor: 'cyan' | 'amber' | 'blue' | 'emerald' | 'violet' | string
  defaultLandingPage: string
  compactView: boolean
  enableSoundAlerts: boolean
  enableEmailNotifications: boolean
}

export interface UserProfileFormData {
  full_name: string
  phone?: string
  avatar_url?: string
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

export interface ActivityFeedItem {
  id: string
  userId: string
  userName: string
  action: 'timesheet_submitted' | 'timesheet_approved' | 'job_created' | 'job_updated' | 'project_updated'
  resourceType: 'timesheet' | 'job' | 'project'
  resourceId: string
  resourceName: string
  details: Record<string, unknown>
  createdAt: string
}

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  roles?: string[]
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
  contact_type?: 'customer' | 'vendor' | 'both'
  is_supplier?: boolean
  is_customer?: boolean
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
  contact_type?: 'customer' | 'vendor' | 'both'
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

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_in_project: string
  assigned_at: string
  user?: {
    id: string
    full_name?: string
    email: string
    role: string
  }
}

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
  address?: string | null
  suburb?: string | null
  city?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  site_access_notes?: string | null
  created_at: string
  updated_at: string
  // Optional: populated when fetching single project with client join
  clients?: {
    id?: string
    name?: string
    contact_name?: string
    company?: string
    first_name?: string
    last_name?: string
  }
  assigned_members?: ProjectMember[]
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
  address?: string
  suburb?: string
  city?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  site_access_notes?: string
  assigned_user_ids?: string[]
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
  start_time?: string | null
  end_time?: string | null
  break_minutes?: number | null
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
  start_time?: string | null
  end_time?: string | null
  break_minutes?: number | null
  notes?: string
}

export interface TimesheetEntryData {
  activity_type_id: string
  user_id: string
  hours: number
  start_time?: string | null
  end_time?: string | null
  break_minutes?: number | null
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
  clientId?: string
  contactType?: 'all' | 'customer' | 'vendor'
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

// Purchase Orders
export type POStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled' | 'invoiced'

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  item_code?: string | null
  description: string
  quantity: number
  unit_of_measure: string
  unit_cost: number
  total_cost: number
  received_quantity: number
  notes?: string | null
  created_at: string
}

export interface PurchaseOrder {
  id: string
  user_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  vendor_id?: string | null
  vehicle_id?: string | null
  order_type: 'project_job' | 'van_restock'
  po_number: string
  status: POStatus
  order_date: string
  expected_delivery_date?: string | null
  delivery_address?: string | null
  delivery_notes?: string | null
  subtotal: number
  tax: number
  total: number
  xero_po_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  project?: Project
  cost_center?: CostCenter
  vendor?: Client
  vehicle?: Vehicle
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItemFormData {
  item_code?: string
  description: string
  quantity: number
  unit_of_measure: string
  unit_cost: number
  notes?: string
}

export interface PurchaseOrderFormData {
  order_type?: 'project_job' | 'van_restock'
  project_id?: string
  cost_center_id?: string
  vehicle_id?: string
  vendor_id: string
  po_number: string
  order_date: string
  expected_delivery_date?: string
  delivery_address?: string
  delivery_notes?: string
  notes?: string
  items: PurchaseOrderItemFormData[]
}

// In-App Notification Center
export type NotificationCategory =
  | 'all'
  | 'direct_tasks'
  | 'credentials'
  | 'safety_fleet'
  | 'timesheets'
  | 'procurement_stock'
  | 'qc_snags'

export type NotificationPriority = 'urgent' | 'warning' | 'info'

// Direct Actionable User-to-User Notifications
export type DirectNotificationStatus = 'pending' | 'acknowledged' | 'declined' | 'completed'

export interface DirectNotification {
  id: string
  sender_id?: string | null
  recipient_id: string
  category: string
  title: string
  message: string
  link_url?: string | null
  action_type: 'acknowledge_decline' | 'view_only' | 'action_required'
  status: DirectNotificationStatus
  response_note?: string | null
  sender_cleared?: boolean
  recipient_cleared?: boolean
  created_at: string
  actioned_at?: string | null
  sender?: { id: string; full_name?: string; email: string; avatar_url?: string | null }
  recipient?: { id: string; full_name?: string; email: string; avatar_url?: string | null }
}

export interface AppNotification {
  id: string
  title: string
  message: string
  category: NotificationCategory
  priority: NotificationPriority
  timestamp: string
  linkUrl: string
  read: boolean
  actionLabel?: string
  directNotification?: DirectNotification
}

// User Credentials / Compliance Documents
export type UserCredentialCategory =
  | 'electrical_license'
  | 'drivers_license'
  | 'site_safe'
  | 'first_aid'
  | 'training_course'
  | 'other'

export interface UserCredential {
  id: string
  user_id: string
  category: UserCredentialCategory
  document_name: string
  document_number?: string | null
  issued_date?: string | null
  expiry_date?: string | null
  file_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface UserCredentialFormData {
  category: UserCredentialCategory
  document_name: string
  document_number?: string
  issued_date?: string
  expiry_date?: string
  file_url?: string
  notes?: string
}

// Project Site Contacts
export interface ProjectContact {
  id: string
  project_id: string
  role_title: string
  name: string
  company_name?: string | null
  phone?: string | null
  mobile?: string | null
  email?: string | null
  is_primary: boolean
  is_emergency: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectContactFormData {
  role_title: string
  name: string
  company_name?: string
  phone?: string
  mobile?: string
  email?: string
  is_primary?: boolean
  is_emergency?: boolean
  notes?: string
}

// Fleet & Vehicles / Plant Equipment
export interface Vehicle {
  id: string
  registration_number: string
  make_model: string
  year?: number | null
  vin?: string | null
  asset_category?: 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'
  usage_tracking_type?: 'km' | 'hours'
  current_hours?: number | null
  hourly_charge_rate?: number | null
  daily_charge_rate?: number | null
  service_interval_hours?: number | null
  service_due_hours?: number | null
  assigned_technician_id?: string | null
  wof_expiry_date?: string | null
  rego_expiry_date?: string | null
  ruc_due_km?: number | null
  current_odometer_km: number
  status: 'active' | 'maintenance' | 'decommissioned'
  photo_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  technician?: { id: string; full_name: string; email: string }
}

export interface VehicleFormData {
  registration_number: string
  make_model: string
  year?: number
  vin?: string
  asset_category?: 'vehicle' | 'heavy_machinery' | 'equipment' | 'trailer'
  usage_tracking_type?: 'km' | 'hours'
  current_hours?: number
  hourly_charge_rate?: number
  daily_charge_rate?: number
  service_interval_hours?: number
  service_due_hours?: number
  assigned_technician_id?: string
  wof_expiry_date?: string
  rego_expiry_date?: string
  ruc_due_km?: number
  current_odometer_km?: number
  status?: 'active' | 'maintenance' | 'decommissioned'
  notes?: string
}

// Inventory & Supply Chain
export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  unit_of_measure: string
  unit_cost: number
  default_charge_rate: number
  min_reorder_level: number
  vendor_id?: string | null
  xero_item_code?: string | null
  barcode?: string | null
  created_at: string
  updated_at: string
  vendor?: Client
}

export interface InventoryItemFormData {
  sku: string
  name: string
  category: string
  unit_of_measure: string
  unit_cost: number
  default_charge_rate: number
  min_reorder_level: number
  vendor_id?: string
}

export interface VanInventoryItem {
  id: string
  vehicle_id: string
  inventory_item_id: string
  quantity_on_hand: number
  target_stock_level: number
  last_counted_at: string
  created_at: string
  updated_at: string
  item?: InventoryItem
  vehicle?: Vehicle
}

// Project Materials Costing
export interface ProjectMaterial {
  id: string
  project_id: string
  cost_center_id?: string | null
  inventory_item_id?: string | null
  description: string
  quantity_used: number
  unit_of_measure: string
  unit_cost: number
  charge_out_rate: number
  total_cost: number
  source: 'van_stock' | 'direct_po' | 'warehouse'
  vehicle_id?: string | null
  logged_by?: string | null
  entry_date: string
  notes?: string | null
  created_at: string
  project?: Project
  cost_center?: CostCenter
  inventory_item?: InventoryItem
  vehicle?: Vehicle
  user?: { id: string; full_name: string; email: string }
}

export interface ProjectMaterialFormData {
  project_id: string
  cost_center_id?: string
  inventory_item_id?: string
  description: string
  quantity_used: number
  unit_of_measure?: string
  unit_cost: number
  charge_out_rate: number
  source: 'van_stock' | 'direct_po' | 'warehouse'
  vehicle_id?: string
  entry_date?: string
  notes?: string
}

// Quality Control & Snag Lists
export type SnagPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SnagStatus = 'open' | 'in_progress' | 'ready_for_inspection' | 'closed'

export interface ProjectSnag {
  id: string
  project_id: string
  cost_center_id?: string | null
  title: string
  description?: string | null
  location?: string | null
  priority: SnagPriority
  status: SnagStatus
  assigned_to?: string | null
  due_date?: string | null
  resolved_at?: string | null
  photo_urls?: string[]
  rectification_photo_urls?: string[]
  created_by?: string | null
  created_at: string
  updated_at: string
  project?: Project
  cost_center?: CostCenter
  assignee?: { id: string; full_name: string; email: string }
}

export interface ProjectSnagFormData {
  project_id: string
  cost_center_id?: string
  title: string
  description?: string
  location?: string
  priority: SnagPriority
  assigned_to?: string
  due_date?: string
  photo_urls?: string[]
}

// Vehicle Inspection Check Sheets
export interface VehicleCheckSheet {
  id: string
  vehicle_id: string
  technician_id?: string | null
  check_date: string
  odometer_km: number
  oil_level: 'pass' | 'fail'
  coolant_level: 'pass' | 'fail'
  brake_fluid: 'pass' | 'fail'
  tire_tread_and_pressure: 'pass' | 'fail'
  exterior_cleanliness: 'pass' | 'fail'
  lights_and_indicators: 'pass' | 'fail'
  status: 'passed' | 'attention_required' | 'failed'
  notes?: string | null
  damage_photos?: string[]
  created_at: string
  vehicle?: Vehicle
  technician?: { id: string; full_name: string; email: string }
}

export interface VehicleCheckSheetFormData {
  vehicle_id: string
  check_date?: string
  odometer_km: number
  oil_level: 'pass' | 'fail'
  coolant_level: 'pass' | 'fail'
  brake_fluid: 'pass' | 'fail'
  tire_tread_and_pressure: 'pass' | 'fail'
  exterior_cleanliness: 'pass' | 'fail'
  lights_and_indicators: 'pass' | 'fail'
  notes?: string
}

// Site Safety, Biometric/Selfie Sign-In & Emergency Evacuation
export type PersonType = 'technician' | 'subcontractor' | 'visitor' | 'inspector'

export interface SiteAttendance {
  id: string
  project_id: string
  user_id?: string | null
  person_name: string
  person_type: PersonType
  company_name?: string | null
  phone?: string | null
  emergency_contact_phone?: string | null
  signed_in_at: string
  signed_out_at?: string | null
  selfie_photo_url?: string | null
  induction_confirmed: boolean
  hazards_acknowledged: boolean
  status: 'on_site' | 'signed_out'
  accounted_for: boolean
  notes?: string | null
  created_at: string
  project?: Project
  user?: { id: string; full_name: string; email: string }
}

export interface SiteAttendanceFormData {
  project_id: string
  person_name: string
  person_type: PersonType
  company_name?: string
  phone?: string
  emergency_contact_phone?: string
  selfie_photo_url?: string
  induction_confirmed?: boolean
  hazards_acknowledged?: boolean
  notes?: string
}

export interface SiteEvacuation {
  id: string
  project_id: string
  initiated_by?: string | null
  initiated_at: string
  completed_at?: string | null
  drill_type: 'fire_drill' | 'emergency_evacuation' | 'gas_leak' | 'earthquake'
  total_on_site: number
  accounted_for_count: number
  missing_count: number
  notes?: string | null
  created_at: string
  initiator?: { id: string; full_name: string; email: string }
}

// Roles & Dynamic Permissions
export type PermissionKey =
  | 'projects.view'
  | 'projects.view_all'
  | 'projects.view_assigned'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'projects.assign_members'
  | 'clients.view'
  | 'clients.manage'
  | 'purchase_orders.view'
  | 'purchase_orders.create'
  | 'purchase_orders.approve'
  | 'materials.view'
  | 'materials.log'
  | 'van_stock.manage'
  | 'timesheets.view_own'
  | 'timesheets.view_all'
  | 'timesheets.create'
  | 'timesheets.approve'
  | 'timesheets.delete'
  | 'financials.view'
  | 'financials.export'
  | 'xero.manage'
  | 'snags.manage'
  | 'fleet.manage'
  | 'safety.manage'
  | 'files.view'
  | 'files.upload'
  | 'files.rename'
  | 'files.create_folder'
  | 'files.delete'
  | 'users.manage'
  | 'roles.manage'
  | 'settings.manage'

export interface Role {
  id: string
  name: string
  description?: string | null
  is_system: boolean
  permissions: PermissionKey[]
  created_at: string
  updated_at: string
}

export interface RoleFormData {
  id: string
  name: string
  description?: string
  permissions: PermissionKey[]
}

// User Invitations
export interface UserInvitation {
  id: string
  email: string
  full_name: string
  role_id: string
  token: string
  invited_by?: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  created_at: string
  role?: Role
  inviter?: { id: string; full_name: string; email: string }
}

export interface InviteUserFormData {
  email: string
  full_name: string
  role_id: string
}

export * from './safety'