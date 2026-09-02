-- Migration: User Avatars, Direct Notifications, and User Credentials Compliance
-- File: supabase/migrations/20260209_user_avatars_notifications_credentials.sql

-- 1. Ensure avatar_url column on public.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. Create direct_notifications table
CREATE TABLE IF NOT EXISTS public.direct_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  action_type TEXT NOT NULL DEFAULT 'acknowledge_decline',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, acknowledged, declined, completed
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actioned_at TIMESTAMPTZ
);

-- Index for fast recipient lookup
CREATE INDEX IF NOT EXISTS idx_direct_notifications_recipient ON public.direct_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_notifications_status ON public.direct_notifications(status);

-- Enable RLS
ALTER TABLE public.direct_notifications ENABLE ROW LEVEL SECURITY;

-- Permissive policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users full access to direct_notifications" ON public.direct_notifications;
CREATE POLICY "Authenticated users full access to direct_notifications"
  ON public.direct_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Create user_credentials table (Licences, Courses, Certifications)
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other', -- electrical_license, drivers_license, site_safe, first_aid, training_course, other
  document_name TEXT NOT NULL,
  document_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user credentials lookup
CREATE INDEX IF NOT EXISTS idx_user_credentials_user ON public.user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_expiry ON public.user_credentials(expiry_date);

-- Enable RLS
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Permissive policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users full access to user_credentials" ON public.user_credentials;
CREATE POLICY "Authenticated users full access to user_credentials"
  ON public.user_credentials FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. RPC: send_direct_notification
CREATE OR REPLACE FUNCTION public.send_direct_notification(
  p_recipient_id UUID,
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT 'acknowledge_decline'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id UUID;
  v_new_id UUID;
BEGIN
  v_sender_id := auth.uid();

  INSERT INTO public.direct_notifications (
    sender_id,
    recipient_id,
    category,
    title,
    message,
    link_url,
    action_type,
    status
  ) VALUES (
    v_sender_id,
    p_recipient_id,
    p_category,
    p_title,
    p_message,
    p_link_url,
    p_action_type,
    'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. RPC: update_notification_status
CREATE OR REPLACE FUNCTION public.update_notification_status(
  p_notification_id UUID,
  p_status TEXT,
  p_response_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notif RECORD;
BEGIN
  SELECT * INTO v_notif FROM public.direct_notifications WHERE id = p_notification_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;

  UPDATE public.direct_notifications
  SET 
    status = p_status,
    response_note = COALESCE(p_response_note, response_note),
    actioned_at = now()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
