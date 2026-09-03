-- Migration: Site Photos with Markups, Equipment Calibration & PAT Test-and-Tag

-- 1. Project Site Photos
CREATE TABLE IF NOT EXISTS public.project_site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'as_built', -- 'before', 'in_progress', 'as_built', 'defect', 'hazard'
  caption TEXT,
  annotations_svg TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  taken_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Equipment Calibration Register
CREATE TABLE IF NOT EXISTS public.equipment_calibration_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_name TEXT NOT NULL,
  asset_tag TEXT,
  serial_number TEXT NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'mft', -- 'mft', 'insulation', 'pat', 'clamp', 'gas_detector', 'other'
  last_calibration_date DATE,
  calibration_expiry_date DATE,
  calibration_cert_url TEXT,
  status TEXT NOT NULL DEFAULT 'valid', -- 'valid', 'due_soon', 'expired', 'out_for_service'
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PAT / Portable Appliance Test Logs
CREATE TABLE IF NOT EXISTS public.pat_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appliance_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  location_or_van TEXT,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retest_frequency_months INTEGER NOT NULL DEFAULT 6,
  next_test_date DATE NOT NULL,
  earth_continuity_pass BOOLEAN DEFAULT true,
  insulation_resistance_pass BOOLEAN DEFAULT true,
  visual_inspection_pass BOOLEAN DEFAULT true,
  overall_result TEXT NOT NULL DEFAULT 'pass', -- 'pass', 'fail'
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.project_site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_calibration_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pat_test_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to site photos" ON public.project_site_photos;
CREATE POLICY "Allow authenticated full access to site photos" ON public.project_site_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to equipment" ON public.equipment_calibration_register;
CREATE POLICY "Allow authenticated full access to equipment" ON public.equipment_calibration_register
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to pat logs" ON public.pat_test_logs;
CREATE POLICY "Allow authenticated full access to pat logs" ON public.pat_test_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_photos_proj ON public.project_site_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_pat_logs_date ON public.pat_test_logs(next_test_date);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_site_photos;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_calibration_register;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pat_test_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
