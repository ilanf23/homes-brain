
CREATE POLICY "Anon can insert equipment (v0)" ON public.equipment FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update equipment (v0)" ON public.equipment FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete equipment (v0)" ON public.equipment FOR DELETE TO anon USING (true);
