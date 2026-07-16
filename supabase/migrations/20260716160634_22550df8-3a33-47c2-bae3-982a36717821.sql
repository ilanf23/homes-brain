CREATE POLICY "job media authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'job-media');