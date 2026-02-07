-- Migration: Create proper xero_invoices table
-- Date: 2026-02-07
-- Purpose: Match the backend code's expectations and Xero API structure

-- 1. Drop the incorrect 'invoices' table from previous migration
DROP TABLE IF EXISTS invoices CASCADE;

-- 2. Create xero_invoices table with correct schema
CREATE TABLE IF NOT EXISTS xero_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to local client (which is synced from Xero)
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Xero specific fields
  xero_invoice_id TEXT UNIQUE NOT NULL, -- Xero InvoiceID (GUID)
  invoice_number TEXT,
  
  -- Financial details
  currency VARCHAR(10) DEFAULT 'NZD',
  subtotal DECIMAL(12, 2),
  tax DECIMAL(12, 2),
  total DECIMAL(12, 2),
  amount_paid DECIMAL(12, 2),
  amount_due DECIMAL(12, 2),
  
  -- Status fields
  status TEXT,          -- DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED
  payment_status TEXT,  -- draft, sent, paid, overdue, void (internal mapping)
  
  -- Dates
  issue_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- For soft deletes
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xero_invoices_client_id ON xero_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_xero_invoice_id ON xero_invoices(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero_invoices(status);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_payment_status ON xero_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_issue_date ON xero_invoices(issue_date);

-- 4. Enable RLS
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;

-- 5. Create org-wide policies (all authenticated users can access)
CREATE POLICY select_all_invoices ON xero_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_all_invoices ON xero_invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY update_all_invoices ON xero_invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY delete_all_invoices ON xero_invoices
  FOR DELETE TO authenticated USING (true);

-- 6. Add documentation comments
COMMENT ON TABLE xero_invoices IS 'Invoices synced from Xero';
COMMENT ON COLUMN xero_invoices.xero_invoice_id IS 'Unique Xero InvoiceID (GUID)';
COMMENT ON COLUMN xero_invoices.status IS 'Raw status from Xero (DRAFT, AUTHORISED, etc)';
COMMENT ON COLUMN xero_invoices.payment_status IS 'Mapped status for UI (draft, paid, overdue)';
