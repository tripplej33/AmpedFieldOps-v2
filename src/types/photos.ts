export type PhotoCategory = 'before' | 'in_progress' | 'as_built' | 'defect' | 'hazard'

export interface ProjectSitePhoto {
  id: string
  project_id: string
  photo_url: string
  category: PhotoCategory
  caption?: string | null
  annotations_svg?: string | null
  latitude?: number | null
  longitude?: number | null
  taken_at: string
  uploaded_by?: string | null
  created_at: string
  updated_at?: string
  uploader?: {
    id: string
    full_name: string
  } | null
}
