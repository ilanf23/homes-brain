GRANT SELECT, INSERT, UPDATE, DELETE ON public.homes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homeowners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;

GRANT INSERT ON public.pros TO anon;
GRANT SELECT ON public.pros TO anon;
GRANT INSERT ON public.events TO anon;
GRANT INSERT ON public.messages TO anon;
GRANT SELECT ON public.records TO anon;

GRANT ALL ON public.homes TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.equipment TO service_role;
GRANT ALL ON public.jobs TO service_role;
GRANT ALL ON public.records TO service_role;
GRANT ALL ON public.pros TO service_role;
GRANT ALL ON public.homeowners TO service_role;
GRANT ALL ON public.invites TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.events TO service_role;