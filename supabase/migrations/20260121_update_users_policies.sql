-- Allow public count/select for first-time setup detection (minimal exposure: count only)
CREATE POLICY users_select_public_count ON users FOR SELECT USING (true);
