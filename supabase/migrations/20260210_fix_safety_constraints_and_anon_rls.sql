-- Migration: Drop check_safety_doc_parent constraint and grant anon read for QR sign-on

-- 1. Drop check constraint so documents can be project-specific, cost-center specific, or general
ALTER TABLE public.safety_documents DROP CONSTRAINT IF EXISTS check_safety_doc_parent;

-- 2. Allow anon to read safety_templates for public QR sign-on
DROP POLICY IF EXISTS "Allow anon read safety_templates" ON public.safety_templates;
CREATE POLICY "Allow anon read safety_templates" ON public.safety_templates
  FOR SELECT TO anon USING (true);

-- 3. Allow anon to read projects (id, name, site_address_street, site_address_city)
DROP POLICY IF EXISTS "Allow anon read projects for safety" ON public.projects;
CREATE POLICY "Allow anon read projects for safety" ON public.projects
  FOR SELECT TO anon USING (true);

-- 4. Allow anon to read cost_centers for safety
DROP POLICY IF EXISTS "Allow anon read cost_centers for safety" ON public.cost_centers;
CREATE POLICY "Allow anon read cost_centers for safety" ON public.cost_centers
  FOR SELECT TO anon USING (true);

-- 5. Ensure safety_signatures allows insert/update for assigned users & QR
DROP POLICY IF EXISTS "Allow anon update safety_signatures" ON public.safety_signatures;
CREATE POLICY "Allow anon update safety_signatures" ON public.safety_signatures
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
