-- Migration: Refactor clients table to use xero_contact_id as unique key
-- Date: 2026-01-31

-- 1. Add xero_contact_id column (nullable for legacy, unique when present)
ALTER TABLE clients ADD COLUMN xero_contact_id VARCHAR(50) UNIQUE;

-- 2. Make user_id nullable (for Xero-only clients)
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add partial unique index for email+user_id only when xero_contact_id is null (to allow Xero as source of truth)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_user_id_null_xero ON clients(email, user_id) WHERE xero_contact_id IS NULL;

-- 4. (Optional) Add check constraint: at least one of user_id or xero_contact_id must be present
ALTER TABLE clients ADD CONSTRAINT clients_user_or_xero_id CHECK (user_id IS NOT NULL OR xero_contact_id IS NOT NULL);

-- 5. (Optional) Add comment for future devs
COMMENT ON COLUMN clients.xero_contact_id IS 'Xero Contact ID (source of truth when present)';

-- 6. (Optional) Update RLS policies if needed (not required for schema, but may be needed in code)
-- (No RLS change in this migration)
