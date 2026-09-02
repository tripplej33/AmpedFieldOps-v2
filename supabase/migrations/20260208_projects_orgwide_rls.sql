-- Migration: Update projects RLS policies for org-wide access
-- Date: 2026-02-08

-- Drop restrictive user-only policies
DROP POLICY IF EXISTS projects_select_own ON projects;
DROP POLICY IF EXISTS projects_insert_own ON projects;
DROP POLICY IF EXISTS projects_update_own ON projects;
DROP POLICY IF EXISTS projects_delete_own ON projects;
DROP POLICY IF EXISTS select_all_projects ON projects;
DROP POLICY IF EXISTS insert_all_projects ON projects;
DROP POLICY IF EXISTS update_all_projects ON projects;
DROP POLICY IF EXISTS delete_all_projects ON projects;

-- Create org-wide policies for authenticated users
CREATE POLICY select_all_projects ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY insert_all_projects ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY update_all_projects ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY delete_all_projects ON projects
  FOR DELETE
  TO authenticated
  USING (true);
