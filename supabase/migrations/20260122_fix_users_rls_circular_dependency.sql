-- Fix circular dependency in users RLS policies (P0)

-- Drop problematic policies
DROP POLICY IF EXISTS users_select_public ON users;
DROP POLICY IF EXISTS users_select_as_admin ON users;

-- Replace with safe policies

-- Policy 1: Anonymous users can only count (block row returns)
CREATE POLICY users_count_for_anon ON users FOR SELECT USING (
  auth.uid() IS NULL AND false
);

-- Policy 2: Authenticated users can select their own row
CREATE POLICY users_select_self ON users FOR SELECT USING (
  auth.uid() = id
);

-- Note: Service role bypasses RLS automatically; no policy needed
-- Insert/Update/Delete policies remain unchanged
