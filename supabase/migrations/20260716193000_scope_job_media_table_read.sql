-- Scope job_media table reads to the owning pro and the claiming homeowner.
--
-- The prior "job_media_public_read" policy (roles = public, USING true) let any
-- caller holding the public anon key enumerate every job's media row metadata
-- (storage paths, job_id, kind, duration, timestamps) across all pros and homes.
-- The media files themselves are already protected (private job-media bucket +
-- per-tenant storage.objects policies), so this exposed only row metadata, not
-- image/video bytes. The public policy is nonetheless unnecessary:
--   * pros read their own rows via job_media_pro_all,
--   * the anonymous claim preview reads via the claim-exchange edge function
--     (service role, bypasses RLS),
--   * homeowners need a scoped read of their own claimed home's media, added here.

DROP POLICY IF EXISTS "job_media_public_read" ON public.job_media;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_media'
      AND policyname = 'job_media_homeowner_read'
  ) THEN
    CREATE POLICY "job_media_homeowner_read" ON public.job_media
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.jobs j
          JOIN public.homes h ON h.id = j.home_id
          WHERE j.id = job_media.job_id
            AND h.claimed_by_homeowner = public.my_homeowner_id()
        )
      );
  END IF;
END$$;
