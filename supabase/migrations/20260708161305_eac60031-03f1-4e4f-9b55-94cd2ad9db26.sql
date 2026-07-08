
-- =========================================================================
-- Security hardening pass.
-- =========================================================================

-- ---- INVOICES: create if missing, then lock down -----------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.invoices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v0_open_all" ON public.invoices;
DROP POLICY IF EXISTS "Pros view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Pros insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Pros update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Pros delete own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Homeowners view invoices on their claimed home" ON public.invoices;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_status_check') THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_status_check CHECK (status IN ('open','paid','void'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_total_check') THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_total_check CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_note_len_check') THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_note_len_check CHECK (note IS NULL OR length(note) <= 2000);
  END IF;
END $$;

CREATE POLICY "Pros view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (pro_id = public.my_pro_id());
CREATE POLICY "Pros insert own invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros update own invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (pro_id = public.my_pro_id())
  WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros delete own invoices" ON public.invoices
  FOR DELETE TO authenticated USING (pro_id = public.my_pro_id());
CREATE POLICY "Homeowners view invoices on their claimed home" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    home_id IN (
      SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id()
    )
    AND status <> 'void'
  );

CREATE INDEX IF NOT EXISTS idx_invoices_pro ON public.invoices(pro_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_home ON public.invoices(home_id);


-- ---- EVENTS: no anonymous injection ------------------------------------
DROP POLICY IF EXISTS "Anyone can log events" ON public.events;
REVOKE INSERT ON public.events FROM anon;
GRANT INSERT ON public.events TO authenticated;

CREATE POLICY "Authenticated can log bounded events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    length(type) BETWEEN 1 AND 80
    AND (actor IS NULL OR length(actor) <= 80)
    AND octet_length(coalesce(props::text, '')) <= 8000
  );


-- ---- MESSAGES: no client access at all ---------------------------------
DROP POLICY IF EXISTS "Anyone can log messages" ON public.messages;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.messages FROM anon, authenticated;
GRANT ALL ON public.messages TO service_role;


-- ---- Dead public-record helpers ----------------------------------------
DROP FUNCTION IF EXISTS public.get_public_record(uuid);
DROP FUNCTION IF EXISTS public.mark_record_viewed(uuid);


-- ---- lookup_login_method: no role disclosure ---------------------------
CREATE OR REPLACE FUNCTION public.lookup_login_method(p_email text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN RETURN 'none'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RETURN 'exists';
  END IF;
  RETURN 'none';
END $$;


-- ---- Revoke EXECUTE from anon on non-public SECURITY DEFINER fns -------
REVOKE EXECUTE ON FUNCTION public.claim_home(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.export_my_homeowner_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.export_my_pro_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_home_view() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_pro_signup() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_add_equipment(text, text, text, text, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_add_equipment(text, text, text, text, date, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_create_invite(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_delete_equipment(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_ensure(boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_signup(text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_equipment(uuid, text, text, text, text, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_equipment(uuid, text, text, text, text, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_home(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_profile(text, text, text, boolean, boolean, boolean, boolean, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_homeowner_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_pro_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pro_serves_home(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pro_upsert_equipment(uuid, text, text, text, text, text, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.upsert_home_by_address(text) FROM anon, public;

-- Truly public — keep anon EXECUTE.
GRANT EXECUTE ON FUNCTION public.get_public_pro_profile(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_login_method(text) TO anon, authenticated;
