-- Manual fix for storage RLS policies
-- Run this as the storage table owner (postgres or supabase_admin)
-- This allows authenticated users to upload files to projects they have access to

-- Drop old restrictive policies on storage.objects
DROP POLICY IF EXISTS project_files_storage_select ON storage.objects;
DROP POLICY IF EXISTS project_files_storage_insert ON storage.objects;
DROP POLICY IF EXISTS project_files_storage_update ON storage.objects;
DROP POLICY IF EXISTS project_files_storage_delete ON storage.objects;

-- Create new permissive policies on storage.objects

-- SELECT: Allow users to read files from projects they have access to
CREATE POLICY project_files_storage_select ON storage.objects
FOR SELECT USING (
  bucket_id = 'project-files'
  AND has_project_access(project_files_get_project_id(name))
);

-- INSERT: Allow authenticated users to upload files
CREATE POLICY project_files_storage_insert_auth ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'project-files'
  AND project_files_get_project_id(name) IS NOT NULL
  AND has_project_access(project_files_get_project_id(name))
  AND auth.role() = 'authenticated'
);

CREATE POLICY project_files_storage_update_owner_admin ON storage.objects
FOR UPDATE USING (
  bucket_id = 'project-files'
  AND has_project_access(project_files_get_project_id(name))
  AND (
    auth.role() = 'service_role'
    OR owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
) WITH CHECK (
  bucket_id = 'project-files'
  AND has_project_access(project_files_get_project_id(name))
  AND (
    auth.role() = 'service_role'
    OR owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

CREATE POLICY project_files_storage_delete_owner_admin ON storage.objects
FOR DELETE USING (
  bucket_id = 'project-files'
  AND has_project_access(project_files_get_project_id(name))
  AND (
    auth.role() = 'service_role'
    OR owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
  )
);

-- Also fix project_files table policies
DROP POLICY IF EXISTS project_files_insert_admin_manager ON project_files;

CREATE POLICY project_files_insert_authenticated ON project_files
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND has_project_access(project_id)
  AND uploaded_by = auth.uid()
);
