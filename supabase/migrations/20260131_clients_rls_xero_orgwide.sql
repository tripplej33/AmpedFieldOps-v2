-- Migration: Remove hard dependency on local user_id for clients
-- Date: 2026-01-31

-- 1. Remove RLS policies that require user_id for SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS select_own_clients ON clients;
DROP POLICY IF EXISTS insert_own_clients ON clients;
DROP POLICY IF EXISTS update_own_clients ON clients;
DROP POLICY IF EXISTS delete_own_clients ON clients;

-- 2. Create new RLS policies:
-- Allow users to access clients where user_id matches OR xero_contact_id is present (org-wide)
CREATE POLICY select_clients ON clients
  FOR SELECT
  USING (user_id = auth.uid() OR xero_contact_id IS NOT NULL);

CREATE POLICY insert_clients ON clients
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR xero_contact_id IS NOT NULL);

CREATE POLICY update_clients ON clients
  FOR UPDATE
  USING (user_id = auth.uid() OR xero_contact_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid() OR xero_contact_id IS NOT NULL);

CREATE POLICY delete_clients ON clients
  FOR DELETE
  USING (user_id = auth.uid() OR xero_contact_id IS NOT NULL);

-- 3. (Optional) Add comment for future devs
COMMENT ON POLICY select_clients ON clients IS 'Allows access to org-wide (Xero) or user-owned clients.';
