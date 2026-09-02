-- Phase 3 Migration: Project Snag Lists & Vehicle Check Sheets

-- 1. Create Project Snags Table
CREATE TABLE IF NOT EXISTS public.project_snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT, -- e.g. Level 2 DB-A, Master Bedroom Ensuite
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'ready_for_inspection', 'closed')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  rectification_photo_urls JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Vehicle Check Sheets Table (Monthly / Weekly Fleet Inspections)
CREATE TABLE IF NOT EXISTS public.vehicle_check_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  check_date DATE DEFAULT CURRENT_DATE,
  odometer_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  oil_level TEXT NOT NULL DEFAULT 'pass' CHECK (oil_level IN ('pass', 'fail')),
  coolant_level TEXT NOT NULL DEFAULT 'pass' CHECK (coolant_level IN ('pass', 'fail')),
  brake_fluid TEXT NOT NULL DEFAULT 'pass' CHECK (brake_fluid IN ('pass', 'fail')),
  tire_tread_and_pressure TEXT NOT NULL DEFAULT 'pass' CHECK (tire_tread_and_pressure IN ('pass', 'fail')),
  exterior_cleanliness TEXT NOT NULL DEFAULT 'pass' CHECK (exterior_cleanliness IN ('pass', 'fail')),
  lights_and_indicators TEXT NOT NULL DEFAULT 'pass' CHECK (lights_and_indicators IN ('pass', 'fail')),
  status TEXT NOT NULL DEFAULT 'passed' CHECK (status IN ('passed', 'attention_required', 'failed')),
  notes TEXT,
  damage_photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_snags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_check_sheets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated full access to project_snags" ON public.project_snags;
CREATE POLICY "Allow authenticated full access to project_snags" ON public.project_snags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to vehicle_check_sheets" ON public.vehicle_check_sheets;
CREATE POLICY "Allow authenticated full access to vehicle_check_sheets" ON public.vehicle_check_sheets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
