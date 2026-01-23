-- Timesheets, Activity Types, Cost Centers schema and RLS policies
-- Safe re-run: drop policies if they exist, create tables if missing, add indexes

-- Note: RPC exec_sql in Supabase cannot run transaction commands; omit BEGIN/COMMIT.

-- Activity Types
CREATE TABLE IF NOT EXISTS activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_rate DECIMAL(10, 2),
  xero_item_id TEXT,
  xero_item_code TEXT,
  xero_tax_type TEXT,
  managed_by_xero BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget DECIMAL(12, 2),
  customer_po_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'invoiced')),
  notes TEXT,
  submitted_at TIMESTAMP,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  invoiced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Policies (Drop if exists then create)
-- Activity Types policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_select_authenticated') THEN
    EXECUTE 'DROP POLICY activity_types_select_authenticated ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_insert_admin') THEN
    EXECUTE 'DROP POLICY activity_types_insert_admin ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_update_admin') THEN
    EXECUTE 'DROP POLICY activity_types_update_admin ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_delete_admin') THEN
    EXECUTE 'DROP POLICY activity_types_delete_admin ON activity_types';
  END IF;
END $$;

CREATE POLICY activity_types_select_authenticated ON activity_types FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY activity_types_insert_admin ON activity_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_update_admin ON activity_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_delete_admin ON activity_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Cost Centers policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_select_own') THEN
    EXECUTE 'DROP POLICY cost_centers_select_own ON cost_centers';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_insert_own') THEN
    EXECUTE 'DROP POLICY cost_centers_insert_own ON cost_centers';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_update_own') THEN
    EXECUTE 'DROP POLICY cost_centers_update_own ON cost_centers';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_delete_own') THEN
    EXECUTE 'DROP POLICY cost_centers_delete_own ON cost_centers';
  END IF;
END $$;

CREATE POLICY cost_centers_select_own ON cost_centers FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY cost_centers_insert_own ON cost_centers FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY cost_centers_update_own ON cost_centers FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY cost_centers_delete_own ON cost_centers FOR DELETE USING (
  auth.uid() = user_id
);

-- Timesheets policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_select_own') THEN
    EXECUTE 'DROP POLICY timesheets_select_own ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_select_as_manager') THEN
    EXECUTE 'DROP POLICY timesheets_select_as_manager ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_insert_own') THEN
    EXECUTE 'DROP POLICY timesheets_insert_own ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_update_own_draft') THEN
    EXECUTE 'DROP POLICY timesheets_update_own_draft ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_update_as_manager') THEN
    EXECUTE 'DROP POLICY timesheets_update_as_manager ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_delete_own_draft') THEN
    EXECUTE 'DROP POLICY timesheets_delete_own_draft ON timesheets';
  END IF;
END $$;

CREATE POLICY timesheets_select_own ON timesheets FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY timesheets_select_as_manager ON timesheets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin')
  )
);

CREATE POLICY timesheets_insert_own ON timesheets FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY timesheets_update_own_draft ON timesheets FOR UPDATE USING (
  auth.uid() = user_id AND status = 'draft'
) WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY timesheets_update_as_manager ON timesheets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin')
  ) AND status = 'submitted'
) WITH CHECK (true);

CREATE POLICY timesheets_delete_own_draft ON timesheets FOR DELETE USING (
  auth.uid() = user_id AND status = 'draft'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project_id ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_entry_date ON timesheets(entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_created_at ON timesheets(created_at);

-- End of migration
