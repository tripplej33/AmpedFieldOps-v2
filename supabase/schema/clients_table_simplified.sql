-- Simplified clients table schema (Xero-only)
-- After removing legacy fields

CREATE TABLE IF NOT EXISTS clients (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership (nullable for org-wide access)
  user_id UUID REFERENCES users(id),
  
  -- Contact information from Xero
  name VARCHAR(255),           -- Primary display name (company/org from Xero)
  contact_name VARCHAR(255),   -- Person's full name (first + last from Xero)
  email VARCHAR(255),          -- Nullable, allows placeholder emails
  phone VARCHAR(50),
  
  -- Address from Xero
  address TEXT,                -- Full formatted street address from Xero
  billing_address TEXT,        -- Billing/postal address from Xero
  
  -- Status and notes
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  
  -- Xero integration
  xero_contact_id VARCHAR(255) UNIQUE,  -- Xero ContactID (GUID)
  xero_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_xero_contact_id ON clients(xero_contact_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Email constraint (allows NULL or valid emails or Xero placeholders)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS email_format;
ALTER TABLE clients ADD CONSTRAINT email_format CHECK (
  email IS NULL OR 
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR
  email LIKE 'noemail-%@xero.placeholder'
);

-- Comments for documentation
COMMENT ON TABLE clients IS 'Client contacts synced from Xero';
COMMENT ON COLUMN clients.name IS 'Primary display name (usually company name from Xero)';
COMMENT ON COLUMN clients.contact_name IS 'Contact person name (first + last from Xero)';
COMMENT ON COLUMN clients.address IS 'Full formatted street address from Xero';
COMMENT ON COLUMN clients.billing_address IS 'Billing/postal address from Xero';
COMMENT ON COLUMN clients.xero_contact_id IS 'Unique Xero ContactID (GUID) for deduplication';
COMMENT ON COLUMN clients.user_id IS 'Optional user assignment (null = org-wide access)';
