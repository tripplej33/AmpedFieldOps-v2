-- Phase 6: Project file storage, RLS, and signed URL helper
-- Safe to re-run; uses IF NOT EXISTS and drops/replaces policies/functions

-- Helper: determine if the current user can access a project
CREATE OR REPLACE FUNCTION public.has_project_access(target_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = target_project_id
      AND p.user_id = auth.uid()
  );
END;
$$;

-- Helper: extract project_id from storage object path: project_<uuid>/filename
CREATE OR REPLACE FUNCTION public.project_files_get_project_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  first_segment text;
BEGIN
  IF object_name IS NULL THEN
    RETURN NULL;
  END IF;

  first_segment := split_part(object_name, '/', 1);

  IF first_segment ~ '^project_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN substring(first_segment from 9)::uuid;
  END IF;

  RETURN NULL;
END;
$$;

-- Metadata table for project files
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Ensure path prefix matches project id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_files_path_matches_project'
  ) THEN
    ALTER TABLE project_files
    ADD CONSTRAINT project_files_path_matches_project CHECK (
      split_part(path, '/', 1) = 'project_' || project_id::text
    );
  END IF;
END$$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_files_path ON project_files(path);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);

-- RLS policies for project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_files' AND policyname = 'project_files_select_access') THEN
    EXECUTE 'DROP POLICY project_files_select_access ON project_files';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_files' AND policyname = 'project_files_insert_admin_manager') THEN
    EXECUTE 'DROP POLICY project_files_insert_admin_manager ON project_files';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_files' AND policyname = 'project_files_update_admin_manager') THEN
    EXECUTE 'DROP POLICY project_files_update_admin_manager ON project_files';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_files' AND policyname = 'project_files_delete_admin_manager') THEN
    EXECUTE 'DROP POLICY project_files_delete_admin_manager ON project_files';
  END IF;
END$$;

CREATE POLICY project_files_select_access ON project_files
FOR SELECT USING (
  has_project_access(project_id)
);

CREATE POLICY project_files_insert_admin_manager ON project_files
FOR INSERT WITH CHECK (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
  AND (
    auth.role() = 'service_role'
    OR uploaded_by = auth.uid()
  )
);

CREATE POLICY project_files_update_admin_manager ON project_files
FOR UPDATE USING (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
) WITH CHECK (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

CREATE POLICY project_files_delete_admin_manager ON project_files
FOR DELETE USING (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

-- Storage bucket for project files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  20971520, -- 20MB max per object
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage objects in project-files bucket (requires table owner). If not owner, the block emits a NOTICE and skips policy changes.
DO $$
DECLARE
  is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
      AND r.rolname = current_user
  ) INTO is_owner;

  IF NOT is_owner THEN
    RAISE NOTICE 'Skipping storage.objects policy changes; current user % is not the table owner. Run this migration as the storage table owner (e.g., supabase_admin/postgres).', current_user;
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_select') THEN
    EXECUTE 'DROP POLICY project_files_storage_select ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_insert') THEN
    EXECUTE 'DROP POLICY project_files_storage_insert ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_update') THEN
    EXECUTE 'DROP POLICY project_files_storage_update ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_delete') THEN
    EXECUTE 'DROP POLICY project_files_storage_delete ON storage.objects';
  END IF;

  EXECUTE '
    CREATE POLICY project_files_storage_select ON storage.objects
    FOR SELECT USING (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
    );
  ';

  EXECUTE '
    CREATE POLICY project_files_storage_insert ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = ''project-files''
      AND project_files_get_project_id(name) IS NOT NULL
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    );
  ';

  EXECUTE '
    CREATE POLICY project_files_storage_update ON storage.objects
    FOR UPDATE USING (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    ) WITH CHECK (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    );
  ';

  EXECUTE '
    CREATE POLICY project_files_storage_delete ON storage.objects
    FOR DELETE USING (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    );
  ';
END;
$$;

-- Optional RPC: create signed download URL for a file the caller can access
CREATE OR REPLACE FUNCTION public.create_signed_download_url(p_file_id uuid, expires_in_seconds integer DEFAULT 900)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_project_id uuid;
  v_expires integer := COALESCE(expires_in_seconds, 900);
  v_result jsonb;
BEGIN
  SELECT path, project_id INTO v_path, v_project_id
  FROM project_files
  WHERE id = p_file_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'File not found';
  END IF;

  IF v_expires <= 0 THEN
    v_expires := 900;
  END IF;

  IF NOT has_project_access(v_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_result := storage.generate_signed_url('project-files', v_path, v_expires);
  RETURN v_result ->> 'signed_url';
END;
$$;
