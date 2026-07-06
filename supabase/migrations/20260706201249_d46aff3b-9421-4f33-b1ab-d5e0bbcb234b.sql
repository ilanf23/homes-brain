
CREATE POLICY "Pros update own records" ON public.records
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = records.job_id AND j.pro_id = public.my_pro_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = records.job_id AND j.pro_id = public.my_pro_id()));
