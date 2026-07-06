-- v0 mock-auth: the settings pages (/pro/settings, /home/settings) update the
-- signed-in pro's or homeowner's own row by id, but there is no real auth.uid()
-- yet, so the scoped UPDATE policies match zero rows and every save fails
-- silently. Relax UPDATE to public for now, same pattern as the earlier
-- "Public can view ... (v0)" SELECT relaxation. The real-auth cutover
-- re-scopes these to auth_user_id = auth.uid().

CREATE POLICY "Public can update pros (v0)"
  ON public.pros FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can update homeowners (v0)"
  ON public.homeowners FOR UPDATE
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON public.pros       TO anon, authenticated;
GRANT UPDATE ON public.homeowners TO anon, authenticated;
