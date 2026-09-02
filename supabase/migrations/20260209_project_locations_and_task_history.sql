-- Migration: Project Locations, Multi-Recipient Notifications, and Task History Clearing
-- File: supabase/migrations/20260209_project_locations_and_task_history.sql

-- 1. Add Address and Location columns to public.projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN address TEXT;
    ALTER TABLE public.projects ADD COLUMN suburb TEXT;
    ALTER TABLE public.projects ADD COLUMN city TEXT;
    ALTER TABLE public.projects ADD COLUMN postal_code TEXT;
    ALTER TABLE public.projects ADD COLUMN latitude NUMERIC;
    ALTER TABLE public.projects ADD COLUMN longitude NUMERIC;
    ALTER TABLE public.projects ADD COLUMN site_access_notes TEXT;
  END IF;
END $$;

-- 2. Add history clearing flags to public.direct_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_notifications' AND column_name = 'sender_cleared'
  ) THEN
    ALTER TABLE public.direct_notifications ADD COLUMN sender_cleared BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.direct_notifications ADD COLUMN recipient_cleared BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. RPC: send_bulk_direct_notifications
CREATE OR REPLACE FUNCTION public.send_bulk_direct_notifications(
  p_recipient_ids UUID[],
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
  v_recipient_id UUID;
  v_count INT := 0;
BEGIN
  v_sender_id := auth.uid();

  FOREACH v_recipient_id IN ARRAY p_recipient_ids LOOP
    IF v_recipient_id IS NOT NULL THEN
      INSERT INTO public.direct_notifications (
        sender_id,
        recipient_id,
        category,
        title,
        message,
        link_url,
        action_type,
        status,
        sender_cleared,
        recipient_cleared
      ) VALUES (
        v_sender_id,
        v_recipient_id,
        p_category,
        p_title,
        p_message,
        p_link_url,
        p_action_type,
        'pending',
        false,
        false
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. RPC: clear_notification_history
CREATE OR REPLACE FUNCTION public.clear_notification_history(
  p_notification_id UUID,
  p_as_sender BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF p_as_sender THEN
    UPDATE public.direct_notifications
    SET sender_cleared = true
    WHERE id = p_notification_id AND sender_id = v_user_id;
  ELSE
    UPDATE public.direct_notifications
    SET recipient_cleared = true
    WHERE id = p_notification_id AND recipient_id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
