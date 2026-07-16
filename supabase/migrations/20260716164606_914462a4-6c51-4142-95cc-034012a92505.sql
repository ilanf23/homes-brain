-- Security fix: replace the bucket-wide authenticated read on job-media
-- with scoped policies. Object paths are {pro_id}/{uuid}.{ext}.
DROP POLICY IF EXISTS "job media authenticated read" ON storage.objects;

-- SECURITY DEFINER so the check does not depend on the homeowner having
-- direct RLS access to jobs; same pattern as my_pro_id/my_homeowner_id.
CREATE OR REPLACE FUNCTION public.can_read_job_media(object_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_media jm
    JOIN public.jobs j ON j.id = jm.job_id
    JOIN public.homes h ON h.id = j.home_id
    WHERE (jm.url = object_name OR jm.thumbnail_url = object_name)
      AND h.claimed_by_homeowner IS NOT NULL
      AND h.claimed_by_homeowner = public.my_homeowner_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_job_media(text) FROM anon, public;

CREATE POLICY "job media pro read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'job-media'
         AND (storage.foldername(name))[1] = public.my_pro_id()::text);

CREATE POLICY "job media homeowner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'job-media' AND public.can_read_job_media(name));