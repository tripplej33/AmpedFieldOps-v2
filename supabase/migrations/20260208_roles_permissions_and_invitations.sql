-- Migration: Dynamic Roles, Granular Permissions & User Invitations

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY, -- role identifier slug (e.g. 'admin', 'manager', 'technician', 'apprentice')
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Standard Roles
INSERT INTO public.roles (id, name, description, is_system, permissions)
VALUES
  (
    'admin',
    'Administrator',
    'Full administrative control over all projects, financials, settings, Xero integration, and permissions.',
    true,
    '["projects.view","projects.create","projects.edit","projects.delete","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","purchase_orders.approve","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.view_all","timesheets.create","timesheets.approve","timesheets.delete","financials.view","financials.export","xero.manage","snags.manage","fleet.manage","safety.manage","users.manage","roles.manage","settings.manage"]'::jsonb
  ),
  (
    'manager',
    'Project Manager',
    'Manages projects, cost centers, timesheet approvals, purchase orders, quality snag lists, and site safety.',
    true,
    '["projects.view","projects.create","projects.edit","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","purchase_orders.approve","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.view_all","timesheets.create","timesheets.approve","financials.view","snags.manage","fleet.manage","safety.manage"]'::jsonb
  ),
  (
    'technician',
    'Field Electrician / Technician',
    'Records timesheets, logs job materials from van stock, completes vehicle check sheets, and views assigned jobs.',
    true,
    '["projects.view","purchase_orders.view","materials.view","materials.log","van_stock.manage","timesheets.view_own","timesheets.create","snags.manage","fleet.manage","safety.manage"]'::jsonb
  ),
  (
    'apprentice',
    'Apprentice Electrician',
    'Logs field hours, submits daily timesheets for approval, and records safety checklist items.',
    false,
    '["projects.view","timesheets.view_own","timesheets.create","materials.view","safety.manage"]'::jsonb
  ),
  (
    'office_admin',
    'Office & Accounts Administrator',
    'Oversees client invoices, timesheet payroll summaries, financial reporting, and purchase orders.',
    false,
    '["projects.view","clients.view","clients.manage","purchase_orders.view","purchase_orders.create","timesheets.view_all","financials.view","financials.export","settings.manage"]'::jsonb
  ),
  (
    'contractor',
    'Subcontractor / Trade',
    'Assigned external trade contractor with access to job site sign-in and allocated snag rectifications.',
    false,
    '["projects.view","snags.manage","safety.manage"]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- 2. Create User Invitations Table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roles & invitations
DROP POLICY IF EXISTS "Allow authenticated full access to roles" ON public.roles;
CREATE POLICY "Allow authenticated full access to roles" ON public.roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to user_invitations" ON public.user_invitations;
CREATE POLICY "Allow authenticated full access to user_invitations" ON public.user_invitations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public/anon to read pending invite by token (for onboarding)
DROP POLICY IF EXISTS "Allow public read of pending user_invitations" ON public.user_invitations;
CREATE POLICY "Allow public read of pending user_invitations" ON public.user_invitations
  FOR SELECT TO anon USING (status = 'pending');

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
