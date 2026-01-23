-- Hotfix: Phase 6 RLS policies to allow all authenticated users to upload files
-- Issue: Original policies restricted uploads to admin/manager only; should allow all authenticated users

-- Drop restrictive policies and replace with permissive ones
DO $$
BEGIN
  -- Drop old restrictive policies
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

-- New INSERT policy: allow all authenticated users who have project access
CREATE POLICY project_files_insert_authenticated ON project_files
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND has_project_access(project_id)
  AND uploaded_by = auth.uid()
);

-- New UPDATE policy: allow managers/admins to update metadata (e.g., name field for future use)
CREATE POLICY project_files_update_owner_admin ON project_files
FOR UPDATE USING (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
) WITH CHECK (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

-- New DELETE policy: allow owner or admin/manager to delete
CREATE POLICY project_files_delete_owner_admin ON project_files
FOR DELETE USING (
  has_project_access(project_id)
  AND (
    auth.role() = 'service_role'
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

-- Storage RLS updates (only if user is table owner; otherwise NOTICE is raised)
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
    RAISE NOTICE 'Skipping storage.objects policy changes; current user % is not the table owner.', current_user;
    RETURN;
  END IF;

  -- Drop old restrictive storage policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_insert') THEN
    EXECUTE 'DROP POLICY project_files_storage_insert ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_update') THEN
    EXECUTE 'DROP POLICY project_files_storage_update ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'project_files_storage_delete') THEN
    EXECUTE 'DROP POLICY project_files_storage_delete ON storage.objects';
  END IF;

  -- New storage INSERT policy: allow all authenticated users with project access
  EXECUTE '
    CREATE POLICY project_files_storage_insert_auth ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = ''project-files''
      AND project_files_get_project_id(name) IS NOT NULL
      AND has_project_access(project_files_get_project_id(name))
      AND auth.role() = ''authenticated''
    );
  ';

  -- New storage UPDATE policy: allow owner, admin, or manager
  EXECUTE '
    CREATE POLICY project_files_storage_update_owner_admin ON storage.objects
    FOR UPDATE USING (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    ) WITH CHECK (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    );
  ';

  -- New storage DELETE policy: allow owner, admin, or manager
  EXECUTE '
    CREATE POLICY project_files_storage_delete_owner_admin ON storage.objects
    FOR DELETE USING (
      bucket_id = ''project-files''
      AND has_project_access(project_files_get_project_id(name))
      AND (
        auth.role() = ''service_role''
        OR owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''manager'')
        )
      )
    );
  ';
END;
$$;
