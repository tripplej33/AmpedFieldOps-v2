## 1. Clients Table Alignment

Copy and paste this SQL into your **Supabase Dashboard → SQL Editor**:

```sql
-- Add Xero-friendly columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS xero_contact_id UUID UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS xero_synced_at TIMESTAMPTZ;

-- Make fields nullable for Xero contacts
ALTER TABLE clients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
```

## 2. Invoices Table Alignment

The new Financials page requires the `xero_invoices` table to store synchronized ledger data:

```sql
-- Create xero_invoices table
CREATE TABLE IF NOT EXISTS xero_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_invoice_id UUID UNIQUE NOT NULL,
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL, -- e.g., 'AUTHORIZED', 'PAID', 'VOIDED'
  payment_status TEXT NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  tax_total DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  amount_due DECIMAL(12,2) DEFAULT 0.00,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  currency_code TEXT DEFAULT 'NZD',
  xero_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

## Then Test

After running the SQL, navigate to **Settings → Xero** and click **"Sync Everything"**. This will pull all your Xero contacts and invoices into these tables.

## Why This Matters

- **Deduplication**: Uses `xero_contact_id` and `xero_invoice_id` to prevent duplicate records.
- **Ledger Intelligence**: Enables the tabbed Financials view with accurate Overdue/Paid totals.
- **Xero Source of Truth**: Ensures local data reflects Xero perfectly.
