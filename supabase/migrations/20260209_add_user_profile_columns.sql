-- Migration: Add User Profile fields and enable self-management & role management

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS policies to ensure users can edit their profile and admins can manage roles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_select" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_insert" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_update" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_delete" ON public.users;

CREATE POLICY "authenticated_users_select" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_insert" ON public.users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_users_update" ON public.users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_users_delete" ON public.users
  FOR DELETE TO authenticated USING (true);

-- Ensure update_user_role function exists with security definer
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_row jsonb;
BEGIN
  UPDATE public.users
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id
  RETURNING to_jsonb(public.users.*) INTO updated_row;

  -- Also update raw_user_meta_data in auth.users if exists
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
  WHERE id = target_user_id;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
