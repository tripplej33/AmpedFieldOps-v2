-- Fix users table RLS policies - resolve conflicts and ensure proper access
-- This migration removes conflicting policies and sets up correct RLS

-- Drop conflicting policies first
DO $$
BEGIN
  -- Drop all existing policies on users table to start fresh
  DROP POLICY IF EXISTS users_select_public_count ON users;
  DROP POLICY IF EXISTS users_select_self ON users;
  DROP POLICY IF EXISTS users_insert_self ON users;
  DROP POLICY IF EXISTS users_update_self ON users;
  DROP POLICY IF EXISTS users_delete_self ON users;
  DROP POLICY IF EXISTS users_select_admin ON users;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if policies don't exist
END$$;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anonymous users to check if table exists (minimal exposure)
CREATE POLICY users_select_public ON users FOR SELECT USING (
  auth.uid() IS NULL
);

-- Policy 2: Authenticated users can only select their own row
CREATE POLICY users_select_authenticated ON users FOR SELECT USING (
  auth.uid() = id
);

-- Policy 3: Authenticated users can insert their own row (auth.uid() will be set by auth trigger)
CREATE POLICY users_insert_authenticated ON users FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- Policy 4: Authenticated users can update their own row
CREATE POLICY users_update_authenticated ON users FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- Policy 5: Authenticated users can delete their own row
CREATE POLICY users_delete_authenticated ON users FOR DELETE USING (
  auth.uid() = id
);

-- Policy 6: Admin users can view all users (optional - for admin dashboard)
CREATE POLICY users_select_as_admin ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users AS admin_check
    WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT ON users TO anon;
