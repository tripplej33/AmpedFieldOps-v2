-- Clean slate: Remove ALL existing users policies and create minimal set
-- This fixes AbortError caused by duplicate/conflicting SELECT policies

-- Step 1: Drop ALL existing policies (force cleanup)
DROP POLICY IF EXISTS users_select_public ON users;
DROP POLICY IF EXISTS users_select_authenticated ON users;
DROP POLICY IF EXISTS users_select_as_admin ON users;
DROP POLICY IF EXISTS users_count_for_anon ON users;
DROP POLICY IF EXISTS users_select_self ON users;
DROP POLICY IF EXISTS users_anon_count ON users;
DROP POLICY IF EXISTS users_insert_authenticated ON users;
DROP POLICY IF EXISTS users_update_authenticated ON users;
DROP POLICY IF EXISTS users_delete_authenticated ON users;
DROP POLICY IF EXISTS users_insert_self ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_delete_self ON users;

-- Step 2: Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create ONLY the required policies (no duplicates)

-- Policy 1: Authenticated users can read ONLY their own profile
-- This is the ONLY SELECT policy (no duplicates!)
CREATE POLICY users_select_own
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Allow first user creation (when no auth.uid() exists yet)
-- This handles the signup flow where we create a user record during registration
CREATE POLICY users_insert_during_signup
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY users_update_own
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can do anything (bypass RLS via service_role key)
-- No explicit policy needed - service role bypasses RLS by default

-- Step 4: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Note: NO anon SELECT policy = anonymous users CANNOT query users table
-- This is intentional for security. If first-time setup check is needed,
-- use a Supabase Edge Function instead.
