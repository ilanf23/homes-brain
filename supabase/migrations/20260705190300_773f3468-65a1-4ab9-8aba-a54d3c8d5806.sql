
-- v0 mock-auth: dashboard pages read customers/homeowners/invites without a real auth.uid().
-- The strict SELECT policies added last migration made these tables invisible to the pro app.
-- Relax SELECT to public for now (matches jobs/homes/equipment/records which are already public).
-- Writes remain scoped to my_pro_id()/my_homeowner_id() so a real-auth cutover only touches writes.

DROP POLICY IF EXISTS "Pros view own customers" ON public.customers;
CREATE POLICY "Public can view customers (v0)"
  ON public.customers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Homeowners view themselves" ON public.homeowners;
DROP POLICY IF EXISTS "Pros view homeowners of their homes" ON public.homeowners;
CREATE POLICY "Public can view homeowners (v0)"
  ON public.homeowners FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Homeowners view own invites" ON public.invites;
CREATE POLICY "Public can view invites (v0)"
  ON public.invites FOR SELECT
  USING (true);

-- Make sure the roles have table-level SELECT.
GRANT SELECT ON public.customers  TO anon, authenticated;
GRANT SELECT ON public.homeowners TO anon, authenticated;
GRANT SELECT ON public.invites    TO anon, authenticated;
