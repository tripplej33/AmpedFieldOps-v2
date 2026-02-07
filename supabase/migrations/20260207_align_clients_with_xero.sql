-- Migration: Update clients table to align with Xero contact structure
-- Date: 2026-02-07
-- Purpose: Add Xero-friendly fields and make schema more flexible for Xero sync

-- 1. Add new columns to support Xero contact structure
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 2. Make first_name and last_name nullable (Xero contacts may only have company name)
ALTER TABLE clients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN last_name DROP NOT NULL;

-- 3. Make email nullable with a default placeholder for Xero contacts without email
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- 4. Add comment for clarity
COMMENT ON COLUMN clients.name IS 'Primary display name (usually company name from Xero)';
COMMENT ON COLUMN clients.contact_name IS 'Contact person name (first + last from Xero)';
COMMENT ON COLUMN clients.address IS 'Full formatted address from Xero';
COMMENT ON COLUMN clients.billing_address IS 'Billing/postal address from Xero';

-- 5. Update the email constraint to allow placeholder emails
ALTER TABLE clients DROP CONSTRAINT IF EXISTS email_format;
ALTER TABLE clients ADD CONSTRAINT email_format CHECK (
  email IS NULL OR 
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR
  email LIKE 'noemail-%@xero.placeholder'
);
