-- Migration: Advanced Inventory, Plant Equipment Fleet, Invoicing & Job Reports

-- 1. Fleet & Machinery Columns on vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS asset_category TEXT NOT NULL DEFAULT 'vehicle', -- 'vehicle', 'heavy_machinery', 'equipment', 'trailer'
  ADD COLUMN IF NOT EXISTS usage_tracking_type TEXT NOT NULL DEFAULT 'km', -- 'km', 'hours'
  ADD COLUMN IF NOT EXISTS current_hours NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_charge_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_charge_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_interval_hours INTEGER DEFAULT 250,
  ADD COLUMN IF NOT EXISTS service_due_hours NUMERIC DEFAULT 250;

-- 2. Equipment Usage Logs (for plant like Diggers, Pressure Washers, Compressors)
CREATE TABLE IF NOT EXISTS public.equipment_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  timesheet_id UUID REFERENCES public.timesheets(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  start_reading NUMERIC DEFAULT 0,
  end_reading NUMERIC DEFAULT 0,
  units_used NUMERIC NOT NULL DEFAULT 0,
  tracking_type TEXT NOT NULL DEFAULT 'hours', -- 'hours', 'km'
  hourly_rate NUMERIC DEFAULT 0,
  charge_amount NUMERIC DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Inventory Locations (Warehouse / Workshop, Vans, Site Containers)
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'van', -- 'warehouse', 'van', 'site_container', 'other'
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Location-Specific Stock Levels
CREATE TABLE IF NOT EXISTS public.inventory_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  min_reorder_level NUMERIC DEFAULT 5,
  target_stock_level NUMERIC DEFAULT 20,
  bin_rack TEXT,
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- 5. Stock Movement Transactions & Project Allocations
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  source_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  dest_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL DEFAULT 'transfer', -- 'transfer', 'job_booking', 'restock', 'adjustment'
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  charge_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Invoices & Invoicing Line Items
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'issued', 'paid', 'void'
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 15,
  xero_invoice_id TEXT,
  xero_invoice_number TEXT,
  xero_status TEXT,
  notes TEXT,
  client_notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'labor', -- 'labor', 'equipment_hire', 'materials', 'fixed_fee', 'other'
  timesheet_id UUID REFERENCES public.timesheets(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  equipment_usage_id UUID REFERENCES public.equipment_usage_logs(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 15,
  line_total NUMERIC NOT NULL DEFAULT 0,
  xero_item_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link invoices to timesheets and materials if not present
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.project_materials
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.equipment_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated full access to equipment_usage_logs" ON public.equipment_usage_logs;
CREATE POLICY "Allow authenticated full access to equipment_usage_logs" ON public.equipment_usage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to inventory_locations" ON public.inventory_locations;
CREATE POLICY "Allow authenticated full access to inventory_locations" ON public.inventory_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to inventory_stock_levels" ON public.inventory_stock_levels;
CREATE POLICY "Allow authenticated full access to inventory_stock_levels" ON public.inventory_stock_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated full access to inventory_transactions" ON public.inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated full access to invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Allow authenticated full access to invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime Publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_usage_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_locations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_levels;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_line_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
