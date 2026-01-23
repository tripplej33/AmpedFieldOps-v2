-- Users profile table (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'technician', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own row
CREATE POLICY users_select_self ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_insert_self ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_self ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY users_delete_self ON users FOR DELETE USING (auth.uid() = id);

-- Admin convenience: allow admins to read all users (optional, adjust as needed)
CREATE POLICY users_select_admin ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users AS u_admin
    WHERE u_admin.id = auth.uid() AND u_admin.role = 'admin'
  )
);
