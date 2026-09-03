-- Migration: Create public safety-documents bucket and configure storage policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('safety-documents', 'safety-documents', true, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies for safety-documents
DROP POLICY IF EXISTS "Public full access to safety-documents bucket" ON storage.objects;
CREATE POLICY "Public full access to safety-documents bucket" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'safety-documents')
  WITH CHECK (bucket_id = 'safety-documents');
