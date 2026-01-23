-- Migration: Create xero_sync_log table for Phase 5
-- Created: 2026-01-23
-- Purpose: Track Xero API sync operations and status

-- Create xero_sync_log table
CREATE TABLE IF NOT EXISTS xero_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL, -- 'activity_types', 'contacts', 'invoices', 'payments'
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error')),
  error_message TEXT,
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  synced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB -- Additional sync details
);

-- Create indexes for efficient queries
CREATE INDEX xero_sync_log_started_at_idx ON xero_sync_log(started_at DESC);
CREATE INDEX xero_sync_log_status_idx ON xero_sync_log(status);
CREATE INDEX xero_sync_log_sync_type_idx ON xero_sync_log(sync_type);
CREATE INDEX xero_sync_log_synced_by_idx ON xero_sync_log(synced_by);

-- Enable RLS
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read all sync logs
CREATE POLICY "Admins can read sync logs"
  ON xero_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- RLS Policy: Only service role can write sync logs (backend API)
-- No INSERT/UPDATE policy for users - sync logs created by backend only

-- Comments
COMMENT ON TABLE xero_sync_log IS 'Tracks Xero API sync operations and their status';
COMMENT ON COLUMN xero_sync_log.sync_type IS 'Type of resource being synced with Xero';
COMMENT ON COLUMN xero_sync_log.status IS 'Current status: pending, running, success, or error';
COMMENT ON COLUMN xero_sync_log.records_processed IS 'Total number of records processed in this sync';
COMMENT ON COLUMN xero_sync_log.metadata IS 'Additional sync details (xero_tenant_id, filter criteria, etc.)';

-- Create helper function to start a sync operation
CREATE OR REPLACE FUNCTION start_xero_sync(
  p_sync_type TEXT,
  p_synced_by UUID,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO xero_sync_log (
    sync_type,
    status,
    synced_by,
    metadata,
    started_at
  ) VALUES (
    p_sync_type,
    'pending',
    p_synced_by,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_sync_id;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to complete a sync operation
CREATE OR REPLACE FUNCTION complete_xero_sync(
  p_sync_id UUID,
  p_status TEXT,
  p_records_processed INT DEFAULT 0,
  p_records_created INT DEFAULT 0,
  p_records_updated INT DEFAULT 0,
  p_records_failed INT DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE xero_sync_log
  SET
    status = p_status,
    records_processed = p_records_processed,
    records_created = p_records_created,
    records_updated = p_records_updated,
    records_failed = p_records_failed,
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_sync_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial placeholder sync log (for UI testing)
INSERT INTO xero_sync_log (
  sync_type,
  status,
  records_processed,
  records_created,
  started_at,
  completed_at
) VALUES (
  'activity_types',
  'success',
  6,
  6,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '55 minutes'
) ON CONFLICT DO NOTHING;
