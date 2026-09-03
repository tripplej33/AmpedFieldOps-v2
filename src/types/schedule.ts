export type ScheduleStatus =
  | 'scheduled'
  | 'dispatched'
  | 'en_route'
  | 'on_site'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'

export interface JobSchedule {
  id: string
  project_id: string | null
  cost_center_id?: string | null
  technician_id?: string | null
  assigned_crew_ids: string[]
  title: string
  description?: string | null
  status: ScheduleStatus
  start_time: string
  end_time: string
  all_day: boolean
  actual_start_time?: string | null
  actual_end_time?: string | null
  site_address?: string | null
  latitude?: number | null
  longitude?: number | null
  estimated_travel_minutes?: number
  requires_safety_doc: boolean
  completed_safety_doc_id?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Relations
  project?: {
    id: string
    name: string
    address?: string | null
    suburb?: string | null
    city?: string | null
    client?: {
      id?: string
      name: string
    } | null
  } | null
  cost_center?: {
    id: string
    name: string
    customer_po_number?: string | null
  } | null
  technician?: {
    id: string
    full_name: string
    email: string
    role?: string
    avatar_url?: string | null
    phone?: string | null
  } | null
  completed_safety_doc?: {
    id: string
    title: string
    status: string
    pdf_url?: string | null
  } | null
}

export interface ScheduleCreatePayload {
  id?: string
  project_id?: string | null
  cost_center_id?: string | null
  technician_id?: string | null
  assigned_crew_ids?: string[]
  title: string
  description?: string | null
  status?: ScheduleStatus
  start_time: string
  end_time: string
  all_day?: boolean
  site_address?: string | null
  latitude?: number | null
  longitude?: number | null
  estimated_travel_minutes?: number
  requires_safety_doc?: boolean
  notes?: string | null
}

export interface ScheduleUpdatePayload {
  project_id?: string | null
  cost_center_id?: string | null
  technician_id?: string | null
  assigned_crew_ids?: string[]
  title?: string
  description?: string | null
  status?: ScheduleStatus
  start_time?: string
  end_time?: string
  all_day?: boolean
  actual_start_time?: string | null
  actual_end_time?: string | null
  site_address?: string | null
  latitude?: number | null
  longitude?: number | null
  estimated_travel_minutes?: number
  requires_safety_doc?: boolean
  completed_safety_doc_id?: string | null
  notes?: string | null
}

export interface ScheduleFilterOptions {
  startDate?: string
  endDate?: string
  technicianId?: string
  projectId?: string
  status?: ScheduleStatus | 'all'
}
