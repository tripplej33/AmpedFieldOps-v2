-- Phase 2 Migration: Inventory Items, Vehicles, Van Stock, and Project Materials

-- 1. Create Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  make_model TEXT NOT NULL,
  year INTEGER,
  vin TEXT,
  assigned_technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  wof_expiry_date DATE,
  rego_expiry_date DATE,
  ruc_due_km NUMERIC(10, 2),
  current_odometer_km NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'decommissioned')),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Inventory Items Table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit_of_measure TEXT NOT NULL DEFAULT 'EA',
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_charge_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_reorder_level NUMERIC(10, 2) DEFAULT 5,
  vendor_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  xero_item_code TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Van Inventory Table (Mobile Warehouse Stock)
CREATE TABLE IF NOT EXISTS public.van_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target_stock_level NUMERIC(10, 2) NOT NULL DEFAULT 10,
  last_counted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, inventory_item_id)
);

-- 4. Create Project Materials Table (Job Costing Allocation)
CREATE TABLE IF NOT EXISTS public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_of_measure TEXT DEFAULT 'EA',
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  charge_out_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'van_stock' CHECK (source IN ('van_stock', 'direct_po', 'warehouse')),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  logged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

-- Full access policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated full access to vehicles" ON public.vehicles;
CREATE POLICY "Allow authenticated full access to vehicles" ON public.vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to inventory_items" ON public.inventory_items;
CREATE POLICY "Allow authenticated full access to inventory_items" ON public.inventory_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to van_inventory" ON public.van_inventory;
CREATE POLICY "Allow authenticated full access to van_inventory" ON public.van_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to project_materials" ON public.project_materials;
CREATE POLICY "Allow authenticated full access to project_materials" ON public.project_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial standard electrical items
INSERT INTO public.inventory_items (sku, name, category, unit_of_measure, unit_cost, default_charge_rate, min_reorder_level)
VALUES
  ('TPS-2.5-100', '2.5mm Twin & Earth TPS Cable (100m Drum)', 'Cable & Conduit', 'DRUM', 145.00, 215.00, 2),
  ('TPS-1.5-100', '1.5mm Twin & Earth TPS Cable (100m Drum)', 'Cable & Conduit', 'DRUM', 98.00, 150.00, 2),
  ('SW-1G-W', 'Single Gang Light Switch (White)', 'Switchgear', 'EA', 8.50, 18.00, 10),
  ('SW-2G-W', 'Double Gang Light Switch (White)', 'Switchgear', 'EA', 12.00, 24.00, 10),
  ('GPO-2G-W', 'Double Power Point Outlet (White)', 'Switchgear', 'EA', 11.50, 22.50, 15),
  ('RCBO-16A', '16A 30mA 1P+N Type A RCBO Breaker', 'Distribution', 'EA', 34.00, 65.00, 6),
  ('RCBO-20A', '20A 30mA 1P+N Type A RCBO Breaker', 'Distribution', 'EA', 36.00, 68.00, 6),
  ('DL-10W-TRI', '10W Tri-Colour LED Recessed Downlight', 'Lighting', 'EA', 14.00, 29.50, 12),
  ('SMOKE-10YR', '10-Year Photoelectric Sealed Smoke Alarm', 'Safety', 'EA', 48.00, 89.00, 4)
ON CONFLICT (sku) DO NOTHING;

-- Seed demo service van if none exists
INSERT INTO public.vehicles (registration_number, make_model, year, status, wof_expiry_date, rego_expiry_date, ruc_due_km, current_odometer_km)
VALUES
  ('AMPED01', 'Toyota HiAce LWB 2023', 2023, 'active', CURRENT_DATE + INTERVAL '180 days', CURRENT_DATE + INTERVAL '120 days', 45000, 38240),
  ('AMPED02', 'Ford Transit Custom 2022', 2022, 'active', CURRENT_DATE + INTERVAL '45 days', CURRENT_DATE + INTERVAL '15 days', 60000, 56890)
ON CONFLICT (registration_number) DO NOTHING;

-- Reload schema
NOTIFY pgrst, 'reload schema';
