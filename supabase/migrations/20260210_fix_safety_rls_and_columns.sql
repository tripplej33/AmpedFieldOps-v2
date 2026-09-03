-- Migration: Comprehensive Permissive RLS Policies for Safety Module

-- Drop any restrictive policies
DROP POLICY IF EXISTS "Allow authenticated full access to safety_templates" ON public.safety_templates;
DROP POLICY IF EXISTS "Allow anon read safety_templates" ON public.safety_templates;
CREATE POLICY "Allow public all on safety_templates" ON public.safety_templates
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to safety_documents" ON public.safety_documents;
DROP POLICY IF EXISTS "Allow public read of active safety_documents" ON public.safety_documents;
CREATE POLICY "Allow public all on safety_documents" ON public.safety_documents
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to safety_signatures" ON public.safety_signatures;
DROP POLICY IF EXISTS "Allow public insert of safety_signatures via QR" ON public.safety_signatures;
DROP POLICY IF EXISTS "Allow public read of safety_signatures" ON public.safety_signatures;
DROP POLICY IF EXISTS "Allow anon update safety_signatures" ON public.safety_signatures;
CREATE POLICY "Allow public all on safety_signatures" ON public.safety_signatures
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Ensure projects and cost_centers can be read by any public client for safety selection
DROP POLICY IF EXISTS "Allow public read projects for safety" ON public.projects;
CREATE POLICY "Allow public read projects for safety" ON public.projects
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read cost_centers for safety" ON public.cost_centers;
CREATE POLICY "Allow public read cost_centers for safety" ON public.cost_centers
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read users for safety" ON public.users;
CREATE POLICY "Allow public read users for safety" ON public.users
  FOR SELECT TO public USING (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
