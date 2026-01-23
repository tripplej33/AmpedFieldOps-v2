-- Migration: Update activity_types table for Phase 5
-- Created: 2026-01-23
-- Purpose: Activity types management (maps to Xero Products/Services)
-- Note: Table already exists from Phase 4, this migration adds missing columns

-- Add missing columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_types' AND column_name='description') THEN
    ALTER TABLE activity_types ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_types' AND column_name='hourly_rate') THEN
    ALTER TABLE activity_types ADD COLUMN hourly_rate DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_types' AND column_name='xero_code') THEN
    ALTER TABLE activity_types ADD COLUMN xero_code TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_types' AND column_name='xero_managed') THEN
    ALTER TABLE activity_types ADD COLUMN xero_managed BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_types' AND column_name='enabled') THEN
    ALTER TABLE activity_types ADD COLUMN enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Update existing data: copy default_rate to hourly_rate if hourly_rate is null
UPDATE activity_types SET hourly_rate = default_rate WHERE hourly_rate IS NULL OR hourly_rate = 0;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS update_activity_types_updated_at ON activity_types;
CREATE TRIGGER update_activity_types_updated_at
  BEFORE UPDATE ON activity_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies and create new ones
DO $$ BEGIN
  -- Drop policy that requires user_id match
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_types' AND policyname = 'activity_types_select_authenticated') THEN
    DROP POLICY activity_types_select_authenticated ON activity_types;
  END IF;
END $$;

-- RLS Policy: Everyone can read enabled activity types
CREATE POLICY IF NOT EXISTS "Anyone can read enabled activity types"
  ON activity_types FOR SELECT
  USING (enabled = TRUE);

-- RLS Policy: Admins can manage all activity types  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_types' AND policyname = 'Admins can CRUD activity types') THEN
    EXECUTE 'CREATE POLICY "Admins can CRUD activity types" ON activity_types FOR ALL USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = ''admin''
      )
    )';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS activity_types_name_idx ON activity_types(name);
CREATE INDEX IF NOT EXISTS activity_types_enabled_idx ON activity_types(enabled);
CREATE INDEX IF NOT EXISTS activity_types_xero_code_idx ON activity_types(xero_code) WHERE xero_code IS NOT NULL;

-- Comments
COMMENT ON TABLE activity_types IS 'Service types/categories that map to Xero Products/Services';
COMMENT ON COLUMN activity_types.xero_code IS 'Xero ProductCode for two-way sync';
COMMENT ON COLUMN activity_types.xero_managed IS 'If TRUE, updates come from Xero (read-only in app)';
COMMENT ON COLUMN activity_types.hourly_rate IS 'Standard hourly rate for this activity type';
COMMENT ON COLUMN activity_types.enabled IS 'Whether this activity type is active and selectable';
