-- Phase 7+ Migration: App Settings for Xero Credentials
-- Created: 2026-01-28
-- Purpose: Store encrypted Xero credentials in database (not just env vars)

-- Create app_settings table for encrypted credential storage
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- RLS: Only admins can read/write app settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins full access" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role always has access (for backend operations)
CREATE POLICY "Service role bypass" ON app_settings
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Insert initial placeholder values (optional - can be set via Settings UI)
-- These will be NULL until admin configures them
INSERT INTO app_settings (key, value, is_encrypted) VALUES
  ('xero_client_id', NULL, true),
  ('xero_client_secret', NULL, true),
  ('xero_redirect_uri', NULL, false)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Global app settings including encrypted Xero credentials';
COMMENT ON COLUMN app_settings.key IS 'Setting key (unique)';
COMMENT ON COLUMN app_settings.value IS 'Setting value (encrypted if is_encrypted=true)';
COMMENT ON COLUMN app_settings.is_encrypted IS 'Whether value is encrypted with AES-256-CBC';
