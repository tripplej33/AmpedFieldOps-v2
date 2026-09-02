-- Phase 4 Migration: Site Attendance, Selfie Sign-In & Emergency Evacuation Roll Call

-- 1. Create Site Attendances Table
CREATE TABLE IF NOT EXISTS public.site_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  person_name TEXT NOT NULL,
  person_type TEXT NOT NULL DEFAULT 'subcontractor' CHECK (person_type IN ('technician', 'subcontractor', 'visitor', 'inspector')),
  company_name TEXT,
  phone TEXT,
  emergency_contact_phone TEXT,
  signed_in_at TIMESTAMPTZ DEFAULT now(),
  signed_out_at TIMESTAMPTZ,
  selfie_photo_url TEXT,
  induction_confirmed BOOLEAN DEFAULT true,
  hazards_acknowledged BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'on_site' CHECK (status IN ('on_site', 'signed_out')),
  accounted_for BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Site Evacuations Table (Drills & Emergency Incident Audit Log)
CREATE TABLE IF NOT EXISTS public.site_evacuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  drill_type TEXT NOT NULL DEFAULT 'fire_drill' CHECK (drill_type IN ('fire_drill', 'emergency_evacuation', 'gas_leak', 'earthquake')),
  total_on_site INTEGER NOT NULL DEFAULT 0,
  accounted_for_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_evacuations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated full access to site_attendances" ON public.site_attendances;
CREATE POLICY "Allow authenticated full access to site_attendances" ON public.site_attendances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to site_evacuations" ON public.site_evacuations;
CREATE POLICY "Allow authenticated full access to site_evacuations" ON public.site_evacuations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public access for Kiosk Tablet / Mobile QR Site Sign-In
DROP POLICY IF EXISTS "Allow public insert and read for site_attendances" ON public.site_attendances;
CREATE POLICY "Allow public insert and read for site_attendances" ON public.site_attendances
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
