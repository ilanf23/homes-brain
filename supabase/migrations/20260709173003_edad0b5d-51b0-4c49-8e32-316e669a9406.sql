CREATE POLICY "Homeowners view their claimed homes"
ON public.homes
FOR SELECT
USING (claimed_by_homeowner = public.my_homeowner_id());