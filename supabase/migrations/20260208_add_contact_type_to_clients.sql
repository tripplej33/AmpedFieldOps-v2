-- Add contact_type column to clients table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'contact_type'
  ) THEN
    ALTER TABLE clients ADD COLUMN contact_type TEXT DEFAULT 'customer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'is_supplier'
  ) THEN
    ALTER TABLE clients ADD COLUMN is_supplier BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'is_customer'
  ) THEN
    ALTER TABLE clients ADD COLUMN is_customer BOOLEAN DEFAULT true;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
