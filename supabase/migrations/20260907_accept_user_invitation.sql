CREATE OR REPLACE FUNCTION public.accept_user_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
BEGIN
  -- 1. Locate invitation by token
  SELECT * INTO v_inv
  FROM public.user_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token');
  END IF;

  IF v_inv.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has been revoked');
  END IF;

  IF v_inv.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been accepted');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- 2. Upsert into public.users
  INSERT INTO public.users (id, email, full_name, role, updated_at)
  VALUES (p_user_id, v_inv.email, v_inv.full_name, v_inv.role_id, now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now();

  -- 3. Confirm email and role in auth.users
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(v_inv.role_id)
      )
  WHERE id = p_user_id;

  -- 4. Mark invitation as accepted
  UPDATE public.user_invitations
  SET status = 'accepted'
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_inv.email,
    'full_name', v_inv.full_name,
    'role', v_inv.role_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_user_invitation(text, uuid) TO anon, authenticated, service_role;
