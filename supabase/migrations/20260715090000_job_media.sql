-- Media attachments for jobs: the pro's walkthrough video and unit photos.
-- One row per object; the storage object lives in the job-media bucket.
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

-- Pros manage media on their own jobs.
CREATE POLICY job_media_pro_all ON public.job_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j
                      WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()));

-- Records are readable by anyone with the link; media follows the record.
CREATE POLICY job_media_public_read ON public.job_media
  FOR SELECT USING (true);

-- Public bucket: objects are served by URL, matching link-public records.
-- 200MB server-side cap mirrors the client-side check.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-media', 'job-media', true, 209715200, ARRAY['video/*','image/*'])
ON CONFLICT (id) DO NOTHING;

-- Pros upload only under their own {pro_id}/ prefix. No update policy:
-- every upload takes a fresh uuid path, replace = upload new + delete old.
CREATE POLICY "job media pro insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-media'
              AND (storage.foldername(name))[1] = public.my_pro_id()::text);

CREATE POLICY "job media pro delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-media'
         AND (storage.foldername(name))[1] = public.my_pro_id()::text);

-- records.hidden_fields was written by the app since 20260708 but its
-- migration never landed in the repo or the database; add it for real so
-- both the existing hide-a-field feature and the function below work.
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS hidden_fields text[];

-- get_home_view: records entries gain hidden_fields so the homeowner record
-- page can hide exactly what the pro excluded (video/photos included).
CREATE OR REPLACE FUNCTION public.get_home_view()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho_id uuid := public.my_homeowner_id();
BEGIN
  IF v_ho_id IS NULL THEN
    -- Auto-create on first authenticated view (magic-link login without prior signup)
    IF auth.uid() IS NOT NULL THEN v_ho_id := public.homeowner_ensure(NULL); END IF;
  END IF;
  IF v_ho_id IS NULL THEN RETURN NULL; END IF;

  RETURN (
    WITH h AS (SELECT * FROM public.homes WHERE claimed_by_homeowner = v_ho_id LIMIT 1)
    SELECT json_build_object(
      'homeowner', (SELECT row_to_json(ho) FROM public.homeowners ho WHERE ho.id = v_ho_id),
      'home',      (SELECT row_to_json(h) FROM h),
      'equipment', COALESCE((SELECT json_agg(row_to_json(e) ORDER BY e.created_at DESC)
                               FROM public.equipment e WHERE e.home_id = (SELECT id FROM h)), '[]'::json),
      'jobs',      COALESCE((SELECT json_agg(row_to_json(j) ORDER BY j.created_at DESC)
                               FROM public.jobs j WHERE j.home_id = (SELECT id FROM h)), '[]'::json),
      'pros',      COALESCE((SELECT json_agg(json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                                                'logo',p.logo,'google_rating',p.google_rating))
                               FROM public.pros p
                               WHERE p.id IN (SELECT DISTINCT pro_id FROM public.jobs WHERE home_id = (SELECT id FROM h))),
                            '[]'::json),
      'invites',   COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.created_at DESC)
                               FROM public.invites i WHERE i.home_id = (SELECT id FROM h)), '[]'::json),
      'records',   COALESCE((SELECT json_agg(json_build_object('id',r.id,'public_url',r.public_url,'viewed_at',r.viewed_at,'created_at',r.created_at,'job_id',r.job_id,'hidden_fields',r.hidden_fields))
                               FROM public.records r JOIN public.jobs j ON j.id = r.job_id WHERE j.home_id = (SELECT id FROM h)), '[]'::json)
    )
  );
END $$;
