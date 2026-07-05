CREATE POLICY "Anon can create homeowner (v0)" ON public.homeowners FOR INSERT TO anon WITH CHECK (auth_user_id IS NULL);
GRANT INSERT ON public.homeowners TO anon;