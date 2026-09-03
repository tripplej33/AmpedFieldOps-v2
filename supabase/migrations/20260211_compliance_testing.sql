-- Migration: Electrical Compliance & Field Testing Suite (AS/NZS 3000, CoC/ESC, Switchboards)

DO $$ BEGIN
  CREATE TYPE public.certificate_type AS ENUM (
    'coc',
    'esc',
    'combined_coc_esc'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.certificate_status AS ENUM (
    'draft',
    'certified',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. AS/NZS 3000 Verification Test Sheets
CREATE TABLE IF NOT EXISTS public.electrical_test_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'AS/NZS 3000 Verification Test Sheet',
  test_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  supply_system TEXT NOT NULL DEFAULT 'MEN',
  voltage TEXT NOT NULL DEFAULT '230V / 400V 50Hz',
  main_switch_rating TEXT DEFAULT '63A',
  main_earth_resistance NUMERIC DEFAULT 0.5,
  earth_electrode_type TEXT DEFAULT 'Driven Copper Rod',
  bonding_checks JSONB DEFAULT '{"water": true, "gas": false, "waste": false, "structural": false}'::jsonb,
  circuits JSONB DEFAULT '[]'::jsonb,
  tester_serial_number TEXT,
  tester_model TEXT DEFAULT 'Fluke 1664 FC / Megger MFT1741',
  tester_calibration_date DATE,
  comments TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Certificates of Compliance & Electrical Safety Certificates (CoC / ESC)
CREATE TABLE IF NOT EXISTS public.electrical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  test_sheet_id UUID REFERENCES public.electrical_test_sheets(id) ON DELETE SET NULL,
  cert_type public.certificate_type NOT NULL DEFAULT 'combined_coc_esc',
  cert_number TEXT NOT NULL,
  installation_type TEXT NOT NULL DEFAULT 'new_work', -- 'new_work', 'alteration', 'repair'
  is_high_risk BOOLEAN DEFAULT false,
  high_risk_details TEXT,
  certifier_name TEXT NOT NULL,
  certifier_registration TEXT NOT NULL,
  certification_date DATE NOT NULL DEFAULT CURRENT_DATE,
  certifier_signature_svg TEXT,
  client_signer_name TEXT,
  client_signature_svg TEXT,
  pdf_url TEXT,
  status public.certificate_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Switchboard Circuit Directories & Schedules
CREATE TABLE IF NOT EXISTS public.switchboard_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  board_name TEXT NOT NULL DEFAULT 'Main Switchboard (MSB)',
  location TEXT DEFAULT 'Garage / Switchboard Cupboard',
  incomer_rating TEXT DEFAULT '63A 3-Phase',
  enclosure_type TEXT DEFAULT 'Surface Mount IP40',
  circuits JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.electrical_test_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electrical_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.switchboard_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to test_sheets" ON public.electrical_test_sheets;
CREATE POLICY "Allow authenticated full access to test_sheets" ON public.electrical_test_sheets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to certificates" ON public.electrical_certificates;
CREATE POLICY "Allow authenticated full access to certificates" ON public.electrical_certificates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to switchboards" ON public.switchboard_schedules;
CREATE POLICY "Allow authenticated full access to switchboards" ON public.switchboard_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_sheets_proj ON public.electrical_test_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_certificates_proj ON public.electrical_certificates(project_id);
CREATE INDEX IF NOT EXISTS idx_switchboards_proj ON public.switchboard_schedules(project_id);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.electrical_test_sheets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.electrical_certificates;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.switchboard_schedules;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
