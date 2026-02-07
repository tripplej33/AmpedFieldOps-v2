-- Migration: Remove legacy fields from clients table
-- Date: 2026-02-07
-- Purpose: Simplify schema by removing legacy manual entry fields since Xero is source of truth

-- Step 1: Drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS select_own_clients ON clients;
DROP POLICY IF EXISTS insert_own_clients ON clients;
DROP POLICY IF EXISTS update_own_clients ON clients;
DROP POLICY IF EXISTS delete_own_clients ON clients;

-- Step 2: Drop legacy individual name fields (use name and contact_name instead)
ALTER TABLE clients DROP COLUMN IF EXISTS first_name;
ALTER TABLE clients DROP COLUMN IF EXISTS last_name;
ALTER TABLE clients DROP COLUMN IF EXISTS company;

-- Step 3: Drop legacy separate address fields (use address and billing_address instead)
ALTER TABLE clients DROP COLUMN IF EXISTS street_address;
ALTER TABLE clients DROP COLUMN IF EXISTS city;
ALTER TABLE clients DROP COLUMN IF EXISTS state_province;
ALTER TABLE clients DROP COLUMN IF EXISTS postal_code;
ALTER TABLE clients DROP COLUMN IF EXISTS country;

-- Step 4: Keep user_id but make it truly optional (for future team assignments)
-- All Xero contacts will have user_id = null for org-wide access

-- Step 5: Create new simplified RLS policies for org-wide access
-- Allow all authenticated users to view all clients
CREATE POLICY select_all_clients ON clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert clients (Xero sync)
CREATE POLICY insert_all_clients ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update clients (Xero sync)
CREATE POLICY update_all_clients ON clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to delete clients
CREATE POLICY delete_all_clients ON clients
  FOR DELETE
  TO authenticated
  USING (true);
