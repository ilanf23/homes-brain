ALTER TABLE public.records ADD COLUMN IF NOT EXISTS hidden_fields text[];

CREATE TABLE public.job_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video')),
  url text NOT NULL,
  thumbnail_url text,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_media_job_id_idx ON public.job_media(job_id);
ALTER TABLE public.job_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_media_pro_all ON public.job_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j
                      WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()));

CREATE POLICY job_media_public_read ON public.job_media
  FOR SELECT USING (true);

CREATE POLICY "job media pro insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-media'
              AND (storage.foldername(name))[1] = public.my_pro_id()::text);

CREATE POLICY "job media pro delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-media'
         AND (storage.foldername(name))[1] = public.my_pro_id()::text);