-- Xero Tokens Table for V2
-- Stores OAuth tokens and Xero tenant information

CREATE TABLE IF NOT EXISTS xero_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  id_token text,
  expires_at timestamp with time zone NOT NULL,
  tenant_id text,
  tenant_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own tokens
CREATE POLICY "xero_tokens_select_own" ON xero_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "xero_tokens_insert_own" ON xero_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "xero_tokens_update_own" ON xero_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "xero_tokens_delete_own" ON xero_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for frequent queries
CREATE INDEX idx_xero_tokens_user_id ON xero_tokens(user_id);
CREATE INDEX idx_xero_tokens_expires_at ON xero_tokens(expires_at);
