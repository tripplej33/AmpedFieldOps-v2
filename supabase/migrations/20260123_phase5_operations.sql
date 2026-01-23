-- Phase 5: Operations & Scheduling tables and RLS updates
-- This migration is idempotent and safe to re-run via exec_sql (no transaction statements).

-- Align activity_types with Phase 5 schema
ALTER TABLE activity_types
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS xero_code TEXT,
  ADD COLUMN IF NOT EXISTS xero_managed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Backfill new columns from existing data where applicable
UPDATE activity_types
SET
  hourly_rate = COALESCE(hourly_rate, default_rate),
  xero_code = COALESCE(xero_code, xero_item_code),
  xero_managed = COALESCE(xero_managed, managed_by_xero, false)
WHERE
  hourly_rate IS NULL
  OR xero_code IS NULL
  OR xero_managed IS NULL;

-- Ensure hourly_rate is non-null and non-negative
UPDATE activity_types
SET hourly_rate = 0
WHERE hourly_rate IS NULL;

ALTER TABLE activity_types
  ALTER COLUMN hourly_rate SET DEFAULT 0,
  ALTER COLUMN hourly_rate SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_types_hourly_rate_non_negative'
  ) THEN
    ALTER TABLE activity_types ADD CONSTRAINT activity_types_hourly_rate_non_negative CHECK (hourly_rate >= 0);
  END IF;
END$$;

-- Indexes and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_types_name_unique ON activity_types(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_types_xero_code_unique ON activity_types(xero_code) WHERE xero_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_types_enabled ON activity_types(enabled);

-- RLS: reset policies for activity_types
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_select_enabled') THEN
    EXECUTE 'DROP POLICY activity_types_select_enabled ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_insert_admin_v2') THEN
    EXECUTE 'DROP POLICY activity_types_insert_admin_v2 ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_update_admin_v2') THEN
    EXECUTE 'DROP POLICY activity_types_update_admin_v2 ON activity_types';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_types' AND policyname = 'activity_types_delete_admin_v2') THEN
    EXECUTE 'DROP POLICY activity_types_delete_admin_v2 ON activity_types';
  END IF;
END$$;

CREATE POLICY activity_types_select_enabled ON activity_types FOR SELECT USING (
  enabled = TRUE
  OR auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_insert_admin_v2 ON activity_types FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_update_admin_v2 ON activity_types FOR UPDATE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_delete_admin_v2 ON activity_types FOR DELETE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Activity log table for dashboard feed
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  resource_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource_type, resource_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'activity_log_select_all') THEN
    EXECUTE 'DROP POLICY activity_log_select_all ON activity_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'activity_log_insert_self') THEN
    EXECUTE 'DROP POLICY activity_log_insert_self ON activity_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'activity_log_update_admin') THEN
    EXECUTE 'DROP POLICY activity_log_update_admin ON activity_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'activity_log_delete_admin') THEN
    EXECUTE 'DROP POLICY activity_log_delete_admin ON activity_log';
  END IF;
END$$;

CREATE POLICY activity_log_select_all ON activity_log FOR SELECT USING (
  auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

CREATE POLICY activity_log_insert_self ON activity_log FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY activity_log_update_admin ON activity_log FOR UPDATE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY activity_log_delete_admin ON activity_log FOR DELETE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

-- Xero sync log table for financials
CREATE TABLE IF NOT EXISTS xero_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  records_processed INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  synced_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_xero_sync_log_started_at ON xero_sync_log(started_at DESC);

ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xero_sync_log' AND policyname = 'xero_sync_log_select_admin') THEN
    EXECUTE 'DROP POLICY xero_sync_log_select_admin ON xero_sync_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xero_sync_log' AND policyname = 'xero_sync_log_insert_admin') THEN
    EXECUTE 'DROP POLICY xero_sync_log_insert_admin ON xero_sync_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xero_sync_log' AND policyname = 'xero_sync_log_update_admin') THEN
    EXECUTE 'DROP POLICY xero_sync_log_update_admin ON xero_sync_log';
  END IF;
END$$;

CREATE POLICY xero_sync_log_select_admin ON xero_sync_log FOR SELECT USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY xero_sync_log_insert_admin ON xero_sync_log FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY xero_sync_log_update_admin ON xero_sync_log FOR UPDATE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
  )
);

-- End of Phase 5 migration
