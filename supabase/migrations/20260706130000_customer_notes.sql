-- Customer notes: private CRM notes a pro keeps on a customer.
-- Powers the note composer on the customer record page. `pinned` is
-- stored for later; v0 UI does not surface it.
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same permissive v0 RLS as the core tables (auth is mocked; app queries scope by pro).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO anon, authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v0_open_all" ON public.customer_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_id);
CREATE INDEX idx_customer_notes_pro ON public.customer_notes(pro_id);
