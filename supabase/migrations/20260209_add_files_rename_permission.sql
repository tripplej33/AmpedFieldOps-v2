-- Migration: Add files.rename permission and update_at column to project_files

-- 1. Add updated_at column to project_files if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_files' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE project_files ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. Ensure RLS UPDATE policy on project_files covers owners, managers, and admins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_files' AND policyname = 'project_files_update_owner_admin') THEN
    EXECUTE 'DROP POLICY project_files_update_owner_admin ON project_files';
  END IF;
END $$;

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

-- 3. Update default permissions for system roles
UPDATE roles
SET permissions = array_cat(permissions, ARRAY['files.rename'])
WHERE id IN ('admin', 'manager')
  AND NOT ('files.rename' = ANY(permissions));
