
-- Create storage bucket for chamado attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamado-anexos', 'chamado-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chamado-anexos');

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public can read anexos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chamado-anexos');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chamado-anexos');
