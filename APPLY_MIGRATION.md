# Quick Fix: Apply Xero Schema Migration

## What You Need to Do

Copy and paste this SQL into your **Supabase Dashboard → SQL Editor** and run it:

```sql
-- Add Xero-friendly columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Make fields nullable for Xero contacts
ALTER TABLE clients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- Update email constraint to allow placeholder emails
ALTER TABLE clients DROP CONSTRAINT IF EXISTS email_format;
ALTER TABLE clients ADD CONSTRAINT email_format CHECK (
  email IS NULL OR 
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR
  email LIKE 'noemail-%@xero.placeholder'
);
```

## Then Test

After running the SQL, test the Xero sync by clicking "Pull Contacts" in the Xero Settings page.

## What This Does

- Adds `name`, `contact_name`, `address`, `billing_address` columns to match Xero's contact structure
- Makes `first_name`, `last_name`, and `email` nullable (since Xero contacts may only have a company name)
- Allows placeholder emails for contacts without email addresses

This aligns your database with Xero as the source of truth!
