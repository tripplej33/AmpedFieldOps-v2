-- Migration: Create activity_log table for Phase 5
-- Created: 2026-01-23
-- Purpose: Denormalized activity feed for dashboard timeline

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'timesheet_submitted', 'timesheet_approved', 'job_created', 'project_updated', etc.
  resource_type TEXT NOT NULL, -- 'timesheet', 'job', 'project', 'activity_type'
  resource_id UUID,
  resource_name TEXT, -- Denormalized for display (e.g., "John Smith's Timesheet")
  details JSONB, -- { old_status: 'draft', new_status: 'approved', ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX activity_log_created_at_idx ON activity_log(created_at DESC);
CREATE INDEX activity_log_user_id_idx ON activity_log(user_id);
CREATE INDEX activity_log_resource_idx ON activity_log(resource_type, resource_id);
CREATE INDEX activity_log_action_idx ON activity_log(action);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read activity log
CREATE POLICY "Users can read activity log"
  ON activity_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: System can insert activity log entries (service role)
-- No INSERT policy for users - activity log is created by triggers/backend only

-- Comments
COMMENT ON TABLE activity_log IS 'Denormalized activity feed for dashboard timeline';
COMMENT ON COLUMN activity_log.resource_name IS 'Denormalized resource name for display without JOIN';
COMMENT ON COLUMN activity_log.details IS 'JSON metadata (status changes, related data, etc.)';

-- Create function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_resource_name TEXT,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    details
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for automatic activity logging on timesheets
CREATE OR REPLACE FUNCTION log_timesheet_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_activity(
      auth.uid(),
      'timesheet_' || NEW.status,
      'timesheet',
      NEW.id,
      'Timesheet #' || NEW.id::TEXT,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'project_id', NEW.project_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to timesheets table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheets') THEN
    DROP TRIGGER IF EXISTS log_timesheet_status_change ON timesheets;
    CREATE TRIGGER log_timesheet_status_change
      AFTER UPDATE OF status ON timesheets
      FOR EACH ROW
      EXECUTE FUNCTION log_timesheet_activity();
  END IF;
END $$;
