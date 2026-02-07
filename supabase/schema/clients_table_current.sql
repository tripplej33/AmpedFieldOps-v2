-- Current clients table schema after Xero integration migration
-- This shows the complete unified schema supporting both Xero and manual entries

CREATE TABLE IF NOT EXISTS clients (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership (nullable for org-wide Xero contacts)
  user_id UUID REFERENCES users(id),
  
  -- Legacy fields (for manual entries)
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company VARCHAR(255),
  street_address VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  -- Xero-friendly fields (for synced contacts)
  name VARCHAR(255),           -- Primary display name (company/org from Xero)
  contact_name VARCHAR(255),   -- Person's full name (first + last from Xero)
  address TEXT,                -- Full formatted street address from Xero
  billing_address TEXT,        -- Billing/postal address from Xero
  
  -- Shared fields
  email VARCHAR(255),          -- Nullable, allows placeholder emails
  phone VARCHAR(50),
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
COMMENT ON COLUMN clients.name IS 'Primary display name (usually company name from Xero)';
COMMENT ON COLUMN clients.contact_name IS 'Contact person name (first + last from Xero)';
COMMENT ON COLUMN clients.address IS 'Full formatted address from Xero';
COMMENT ON COLUMN clients.billing_address IS 'Billing/postal address from Xero';
COMMENT ON COLUMN clients.xero_contact_id IS 'Unique Xero ContactID (GUID) for deduplication';
