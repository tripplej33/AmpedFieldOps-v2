-- Phase 1 Migration: Purchase Orders, PO Items, and Project Site Contacts

-- 1. Create Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled', 'invoiced')),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  delivery_address TEXT,
  delivery_notes TEXT,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  tax NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0,
  xero_po_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_of_measure TEXT DEFAULT 'EA',
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Project Site Contacts Table
CREATE TABLE IF NOT EXISTS public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL, -- e.g. Site Manager, Project Director, Main Contractor Lead, Health & Safety Rep
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_emergency BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access to POs and Contacts for the organization
DROP POLICY IF EXISTS "Allow authenticated full access to purchase_orders" ON public.purchase_orders;
CREATE POLICY "Allow authenticated full access to purchase_orders" ON public.purchase_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Allow authenticated full access to purchase_order_items" ON public.purchase_order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to project_contacts" ON public.project_contacts;
CREATE POLICY "Allow authenticated full access to project_contacts" ON public.project_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
