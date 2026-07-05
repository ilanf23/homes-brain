CREATE POLICY "Anon can create home (v0)" ON public.homes FOR INSERT TO anon WITH CHECK (created_by_pro IS NULL);
GRANT INSERT ON public.homes TO anon;