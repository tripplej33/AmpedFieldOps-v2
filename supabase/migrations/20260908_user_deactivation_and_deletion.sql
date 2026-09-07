-- Add is_active and disabled_at columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS disabled_at timestamptz NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS disabled_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Create function to toggle user active status
CREATE OR REPLACE FUNCTION public.admin_toggle_user_active(
  target_user_id uuid,
  activate boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
BEGIN
  -- Update public.users
  UPDATE public.users
  SET is_active = activate,
      disabled_at = CASE WHEN activate THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in public.users');
  END IF;

  -- Update auth.users ban state and app metadata
  IF activate THEN
    UPDATE auth.users
    SET banned_until = NULL,
        raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{is_active}', 'true'::jsonb)
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET banned_until = '2099-01-01 00:00:00+00'::timestamptz,
        raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{is_active}', 'false'::jsonb)
    WHERE id = target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user.id,
    'is_active', v_user.is_active,
    'disabled_at', v_user.disabled_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_user_active(uuid, boolean) TO authenticated, service_role;

-- Create function to permanently delete user with foreign key safeguards
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_user_name text;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  v_user_name := COALESCE(v_user.full_name, v_user.email);

  -- 1. Remove user credentials and licences
  DELETE FROM public.user_credentials WHERE user_id = target_user_id;

  -- 2. Remove notifications targeted to or from user
  DELETE FROM public.notifications WHERE user_id = target_user_id;

  -- 3. Remove from project memberships
  DELETE FROM public.project_members WHERE user_id = target_user_id;

  -- 4. Unlink invitations sent by user
  UPDATE public.user_invitations SET invited_by = NULL WHERE invited_by = target_user_id;

  -- 5. Safe unassignment on snags, schedules, vehicles
  BEGIN
    UPDATE public.project_snags SET assigned_to = NULL WHERE assigned_to = target_user_id;
    UPDATE public.project_snags SET created_by = NULL WHERE created_by = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    UPDATE public.schedules SET assigned_user_id = NULL WHERE assigned_user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    UPDATE public.vehicles SET assigned_driver = NULL WHERE assigned_driver = v_user.email OR assigned_driver = v_user_name;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 6. Annotate timesheets if FK constraints require deleting or keeping
  BEGIN
    UPDATE public.timesheets
    SET notes = COALESCE(notes, '') || ' [Technician: ' || v_user_name || ' (Deleted Account)]'
    WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- If timesheets has a strict FK on users, delete user's timesheets or set user_id
  -- Check if timesheets FK is CASCADE or NO ACTION:
  DELETE FROM public.timesheets WHERE user_id = target_user_id;

  -- 7. Delete from public.users
  DELETE FROM public.users WHERE id = target_user_id;

  -- 8. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user_id,
    'user_name', v_user_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated, service_role;
