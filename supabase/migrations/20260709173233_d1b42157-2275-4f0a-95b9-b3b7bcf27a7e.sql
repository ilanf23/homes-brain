CREATE POLICY "Homeowners view pros who invoiced their home"
ON public.pros
FOR SELECT
USING (
  id IN (
    SELECT pro_id FROM public.invoices
    WHERE home_id IN (
      SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id()
    )
  )
);