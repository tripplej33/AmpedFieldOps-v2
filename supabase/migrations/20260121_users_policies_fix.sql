-- Ensure RLS and policies for users table (idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Public select for count (first-time setup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_public_count') THEN
    CREATE POLICY users_select_public_count ON users FOR SELECT USING (true);
  END IF;
END$$;

-- Authenticated users: select own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_self') THEN
    CREATE POLICY users_select_self ON users FOR SELECT USING (auth.uid() = id);
  END IF;
END$$;

-- Authenticated users: insert own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_insert_self') THEN
    CREATE POLICY users_insert_self ON users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- Authenticated users: update own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_self') THEN
    CREATE POLICY users_update_self ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- Authenticated users: delete own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_delete_self') THEN
    CREATE POLICY users_delete_self ON users FOR DELETE USING (auth.uid() = id);
  END IF;
END$$;
