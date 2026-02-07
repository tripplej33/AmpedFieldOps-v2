-- Phase 7: Xero integration tables
-- Migration for xero_tokens and updates to existing tables

-- Create xero_tokens table for storing OAuth credentials
CREATE TABLE IF NOT EXISTS xero_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT UNIQUE,
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS to xero_tokens
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY xero_tokens_select_own ON xero_tokens FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY xero_tokens_insert_own ON xero_tokens FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY xero_tokens_update_own ON xero_tokens FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY xero_tokens_delete_own ON xero_tokens FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Add Xero-related columns to clients table
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS xero_contact_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS xero_synced_at TIMESTAMPTZ;

-- Create index for Xero lookups
CREATE INDEX IF NOT EXISTS idx_clients_xero_contact_id ON clients(xero_contact_id);

-- Add invoicing and Xero columns to timesheets (if not exists)
ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT;

-- Create invoices table for tracking Xero invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
  xero_invoice_id TEXT UNIQUE,
  invoice_number TEXT,
  total_amount DECIMAL(12, 2),
  payment_status TEXT CHECK (payment_status IN ('Draft', 'Submitted', 'Authorised', 'Paid', 'Voided', 'Deleted')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_cost_center_id ON invoices(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_invoices_xero_invoice_id ON invoices(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- RLS for invoices (admin and managers can manage)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'invoices_select_admin_manager') THEN
    EXECUTE 'DROP POLICY invoices_select_admin_manager ON invoices';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'invoices_insert_admin_manager') THEN
    EXECUTE 'DROP POLICY invoices_insert_admin_manager ON invoices';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'invoices_update_admin_manager') THEN
    EXECUTE 'DROP POLICY invoices_update_admin_manager ON invoices';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'invoices_delete_admin') THEN
    EXECUTE 'DROP POLICY invoices_delete_admin ON invoices';
  END IF;
END$$;

CREATE POLICY invoices_select_admin_manager ON invoices
FOR SELECT USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY invoices_insert_admin_manager ON invoices
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY invoices_update_admin_manager ON invoices
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY invoices_delete_admin ON invoices
FOR DELETE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- RLS for xero_tokens (service role and admin only)
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xero_tokens' AND policyname = 'xero_tokens_admin_service_only') THEN
    EXECUTE 'DROP POLICY xero_tokens_admin_service_only ON xero_tokens';
  END IF;
END$$;

CREATE POLICY xero_tokens_admin_service_only ON xero_tokens
FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);
