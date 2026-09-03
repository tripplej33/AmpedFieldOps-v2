-- Migration: Job Scheduling and Resource Dispatch

DO $$ BEGIN
  CREATE TYPE public.schedule_status AS ENUM (
    'scheduled',
    'dispatched',
    'en_route',
    'on_site',
    'completed',
    'rescheduled',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_crew_ids UUID[] DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  status public.schedule_status NOT NULL DEFAULT 'scheduled',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  site_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  estimated_travel_minutes INTEGER DEFAULT 0,
  requires_safety_doc BOOLEAN DEFAULT true,
  completed_safety_doc_id UUID REFERENCES public.safety_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to job_schedules" ON public.job_schedules;
CREATE POLICY "Allow authenticated full access to job_schedules" ON public.job_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_schedules_range ON public.job_schedules(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_job_schedules_tech ON public.job_schedules(technician_id, start_time);
CREATE INDEX IF NOT EXISTS idx_job_schedules_project ON public.job_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_job_schedules_status ON public.job_schedules(status);

-- Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_schedules;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
