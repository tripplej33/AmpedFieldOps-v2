-- Migration: Password Reset Tokens & Management Functions

-- 1. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON public.password_reset_tokens(user_id);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Allow authenticated full access to password_reset_tokens" ON public.password_reset_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access to read and verify password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Allow anon access to read and verify password_reset_tokens" ON public.password_reset_tokens
  FOR SELECT TO anon USING (true);

-- 2. Function for Admins or Forgot-Password to generate reset token
CREATE OR REPLACE FUNCTION public.generate_password_reset_token(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rec RECORD;
  new_token TEXT;
BEGIN
  SELECT id, email, full_name INTO user_rec
  FROM public.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  -- Invalidate previous unused tokens for this user
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE user_id = user_rec.id AND used_at IS NULL;

  INSERT INTO public.password_reset_tokens (user_id, token, email, expires_at)
  VALUES (user_rec.id, new_token, user_rec.email, now() + interval '48 hours');

  RETURN jsonb_build_object(
    'success', true,
    'token', new_token,
    'email', user_rec.email,
    'full_name', user_rec.full_name
  );
END;
$$;

-- 3. Function to generate token by email (for public forgot password)
CREATE OR REPLACE FUNCTION public.generate_password_reset_by_email(target_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rec RECORD;
  new_token TEXT;
BEGIN
  SELECT id, email, full_name INTO user_rec
  FROM public.users
  WHERE lower(email) = lower(trim(target_email));

  IF NOT FOUND THEN
    -- Return success true even if not found to prevent user enumeration
    RETURN jsonb_build_object('success', true, 'message', 'If an account exists, a reset link was generated');
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE user_id = user_rec.id AND used_at IS NULL;

  INSERT INTO public.password_reset_tokens (user_id, token, email, expires_at)
  VALUES (user_rec.id, new_token, user_rec.email, now() + interval '48 hours');

  RETURN jsonb_build_object(
    'success', true,
    'token', new_token,
    'email', user_rec.email,
    'full_name', user_rec.full_name
  );
END;
$$;

-- 4. Function to reset password using token
CREATE OR REPLACE FUNCTION public.reset_password_with_token(reset_token TEXT, new_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_rec RECORD;
BEGIN
  SELECT * INTO token_rec
  FROM public.password_reset_tokens
  WHERE token = reset_token AND used_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This password reset link is invalid or has expired');
  END IF;

  -- Ensure pgcrypto is active
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- Update auth.users encrypted password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = token_rec.user_id;

  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE id = token_rec.id;

  RETURN jsonb_build_object('success', true, 'email', token_rec.email);
END;
$$;

-- 5. Function for Admins to directly set user password
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id UUID, new_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_password_reset_token(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_password_reset_by_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
