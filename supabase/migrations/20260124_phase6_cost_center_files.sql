-- Phase 6 Enhancement: Cost Center-scoped file uploads
-- Allows timesheet files to be organized by cost center within projects
-- Path format: project_{projectId}/cost_center_{costCenterId}/filename
--          or: project_{projectId}/filename (for non-cost-center files)
--
-- The existing project_files_get_project_id() function works with both formats
-- since it only extracts the first path segment (project_{uuid})

-- This migration is optional; the constraint and policies already support this structure.
-- No changes needed - the RLS policies permit any path starting with project_{projectId}

-- NOTE: To use cost center folders in your application:
-- 1. When uploading, build path as: `project_${projectId}/cost_center_${costCenterId}/filename`
-- 2. When uploading without cost center, use: `project_${projectId}/filename`
-- 3. RLS will validate the project_id from the first path segment
-- 4. Cost center is informational in the path; no separate RLS needed

-- Example paths:
-- - project_f47ac10b-58cc-4372-a567-0e02b2c3d479/contract.pdf
-- - project_f47ac10b-58cc-4372-a567-0e02b2c3d479/cost_center_a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6/timesheet_notes.pdf
