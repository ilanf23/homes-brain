-- Invoices: pro-side track-only ledger (v0, no payments).
-- A pro bills a customer for a job or ad hoc; homeowner gets read-only
-- visibility on their claimed home's dashboard. Line items live in jsonb
-- ([{ description, amount }]) since v0 never queries items independently.
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'paid' | 'void'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same permissive v0 RLS as the core tables (auth is mocked; app queries scope by pro/home).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v0_open_all" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_invoices_pro ON public.invoices(pro_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_home ON public.invoices(home_id);
