-- Migration: Fix activity_log trigger constraint and timesheet policies
-- Allows null user_id in activity_log and fixes log_timesheet_activity

ALTER TABLE IF EXISTS public.activity_log ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_resource_name TEXT,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_effective_user UUID;
BEGIN
  v_effective_user := COALESCE(p_user_id, auth.uid());
  INSERT INTO public.activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    details
  ) VALUES (
    v_effective_user,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_timesheet_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      COALESCE(auth.uid(), NEW.approved_by, NEW.submitted_by, NEW.user_id, OLD.user_id),
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

-- Ensure RLS policies allow admin/manager to update and delete timesheets
DO $$
BEGIN
  DROP POLICY IF EXISTS timesheets_delete_admin_mgr ON public.timesheets;
  CREATE POLICY timesheets_delete_admin_mgr ON public.timesheets
    FOR DELETE
    USING (
      auth.uid() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
        OR (auth.uid() = user_id AND status = 'draft')
      )
    );

  DROP POLICY IF EXISTS timesheets_update_admin_mgr ON public.timesheets;
  CREATE POLICY timesheets_update_admin_mgr ON public.timesheets
    FOR UPDATE
    USING (
      auth.uid() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
        OR (auth.uid() = user_id AND status = 'draft')
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
        OR auth.uid() = user_id
      )
    );
END $$;
