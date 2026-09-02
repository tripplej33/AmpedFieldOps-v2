-- Migration: Project Members Assignment & Scoped Visibility Permissions

-- 1. Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL DEFAULT 'technician',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_project_user_assignment UNIQUE(project_id, user_id)
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- 3. Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to project_members" ON public.project_members;
CREATE POLICY "Allow authenticated full access to project_members" ON public.project_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Update standard roles permissions to include granular project view permissions
UPDATE public.roles
SET permissions = '["projects.view","projects.view_all","projects.view_assigned","projects.create","projects.edit","projects.delete","projects.assign_members","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","purchase_orders.approve","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.view_all","timesheets.create","timesheets.approve","timesheets.delete","financials.view","financials.export","xero.manage","snags.manage","fleet.manage","safety.manage","users.manage","roles.manage","settings.manage"]'::jsonb
WHERE id = 'admin';

UPDATE public.roles
SET permissions = '["projects.view","projects.view_all","projects.view_assigned","projects.create","projects.edit","projects.assign_members","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","purchase_orders.approve","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.view_all","timesheets.create","timesheets.approve","financials.view","snags.manage","fleet.manage","safety.manage"]'::jsonb
WHERE id = 'manager';

UPDATE public.roles
SET permissions = '["projects.view","projects.view_assigned","purchase_orders.view","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.create","snags.manage","fleet.manage","safety.manage"]'::jsonb
WHERE id = 'technician';

UPDATE public.roles
SET permissions = '["projects.view","projects.view_assigned","timesheets.view_own","timesheets.create","materials.view","safety.manage"]'::jsonb
WHERE id = 'apprentice';

UPDATE public.roles
SET permissions = '["projects.view","projects.view_all","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","timesheets.view_all","financials.view","financials.export","settings.manage"]'::jsonb
WHERE id = 'office_admin';

UPDATE public.roles
SET permissions = '["projects.view","projects.view_assigned","snags.manage","safety.manage"]'::jsonb
WHERE id = 'contractor';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
