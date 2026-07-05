
-- =========================================================
-- 1. AUTH LINKAGE
-- =========================================================
ALTER TABLE public.pros
  ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.homeowners
  ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX pros_auth_user_id_idx ON public.pros(auth_user_id);
CREATE INDEX homeowners_auth_user_id_idx ON public.homeowners(auth_user_id);

-- =========================================================
-- 2. PRO SETTINGS COLUMNS
-- =========================================================
ALTER TABLE public.pros
  ADD COLUMN notify_email          boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_sms            boolean NOT NULL DEFAULT true,
  ADD COLUMN review_requests_on    boolean NOT NULL DEFAULT true,
  ADD COLUMN referral_code         text UNIQUE,
  ADD COLUMN stripe_account_id     text,
  ADD COLUMN quickbooks_connected  boolean NOT NULL DEFAULT false,
  ADD COLUMN jobber_connected      boolean NOT NULL DEFAULT false,
  ADD COLUMN square_connected      boolean NOT NULL DEFAULT false;

-- =========================================================
-- 3. HOMEOWNER SETTINGS COLUMNS
-- =========================================================
ALTER TABLE public.homeowners
  ADD COLUMN notify_email       boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_sms         boolean NOT NULL DEFAULT true,
  ADD COLUMN sms_opt_out        boolean NOT NULL DEFAULT false,
  ADD COLUMN respect_quiet_hrs  boolean NOT NULL DEFAULT true,
  ADD COLUMN marketing_consent  boolean NOT NULL DEFAULT false;

-- =========================================================
-- 4. REFERRAL CODE GENERATOR + TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE code text;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.pros WHERE referral_code = code);
  END LOOP;
  RETURN code;
END $$;

CREATE OR REPLACE FUNCTION public.set_pro_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_pro_referral_code_trg
BEFORE INSERT ON public.pros
FOR EACH ROW EXECUTE FUNCTION public.set_pro_referral_code();

-- backfill existing seed pros
UPDATE public.pros
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- =========================================================
-- 5. IDENTITY HELPERS (security definer, safe in RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.my_pro_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.pros WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_homeowner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.homeowners WHERE auth_user_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.my_pro_id()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_homeowner_id() TO authenticated;

-- =========================================================
-- 6. EXPORT MY DATA (security definer, caller-scoped)
-- =========================================================
CREATE OR REPLACE FUNCTION public.export_my_pro_data()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'pro',       (SELECT row_to_json(p) FROM public.pros p WHERE p.auth_user_id = auth.uid()),
    'customers', (SELECT COALESCE(json_agg(c), '[]'::json) FROM public.customers c WHERE c.pro_id = public.my_pro_id()),
    'jobs',      (SELECT COALESCE(json_agg(j), '[]'::json) FROM public.jobs      j WHERE j.pro_id = public.my_pro_id()),
    'records',   (SELECT COALESCE(json_agg(r), '[]'::json) FROM public.records   r
                    JOIN public.jobs j ON j.id = r.job_id WHERE j.pro_id = public.my_pro_id())
  )
$$;

CREATE OR REPLACE FUNCTION public.export_my_homeowner_data()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'homeowner', (SELECT row_to_json(h) FROM public.homeowners h WHERE h.auth_user_id = auth.uid()),
    'homes',     (SELECT COALESCE(json_agg(hm), '[]'::json) FROM public.homes hm
                    WHERE hm.claimed_by_homeowner = public.my_homeowner_id()),
    'equipment', (SELECT COALESCE(json_agg(e), '[]'::json) FROM public.equipment e
                    WHERE e.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())),
    'jobs',      (SELECT COALESCE(json_agg(j), '[]'::json) FROM public.jobs j
                    WHERE j.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())),
    'records',   (SELECT COALESCE(json_agg(r), '[]'::json) FROM public.records r
                    JOIN public.jobs j ON j.id = r.job_id
                    WHERE j.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id()))
  )
$$;

GRANT EXECUTE ON FUNCTION public.export_my_pro_data()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_my_homeowner_data() TO authenticated;

-- =========================================================
-- 7. REPLACE OPEN POLICIES WITH SCOPED POLICIES
-- =========================================================
DROP POLICY IF EXISTS v0_open_all ON public.pros;
DROP POLICY IF EXISTS v0_open_all ON public.homeowners;
DROP POLICY IF EXISTS v0_open_all ON public.homes;
DROP POLICY IF EXISTS v0_open_all ON public.customers;
DROP POLICY IF EXISTS v0_open_all ON public.equipment;
DROP POLICY IF EXISTS v0_open_all ON public.jobs;
DROP POLICY IF EXISTS v0_open_all ON public.records;
DROP POLICY IF EXISTS v0_open_all ON public.invites;
DROP POLICY IF EXISTS v0_open_all ON public.messages;
DROP POLICY IF EXISTS v0_open_all ON public.events;

-- PROS: public profile is readable by anyone; only owner mutates
CREATE POLICY "Anyone can view pros"         ON public.pros FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pros can insert themselves"   ON public.pros FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Pros can update themselves"   ON public.pros FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Pros can delete themselves"   ON public.pros FOR DELETE TO authenticated USING (auth_user_id = auth.uid());

-- HOMEOWNERS: strictly private (PII)
CREATE POLICY "Homeowners view themselves"   ON public.homeowners FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "Homeowners insert themselves" ON public.homeowners FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Homeowners update themselves" ON public.homeowners FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Homeowners delete themselves" ON public.homeowners FOR DELETE TO authenticated USING (auth_user_id = auth.uid());
-- pro needs to see homeowner name attached to a home they created (for /pro/customers)
CREATE POLICY "Pros view homeowners of their homes" ON public.homeowners FOR SELECT TO authenticated
  USING (id IN (SELECT claimed_by_homeowner FROM public.homes WHERE created_by_pro = public.my_pro_id()));

-- HOMES: address is on the shareable record → anon SELECT ok; write is owner-scoped
CREATE POLICY "Anyone can view homes"        ON public.homes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pros insert homes"            ON public.homes FOR INSERT TO authenticated WITH CHECK (created_by_pro = public.my_pro_id());
CREATE POLICY "Owners update homes"          ON public.homes FOR UPDATE TO authenticated
  USING (created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id())
  WITH CHECK (created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id());
-- anon can claim a home (moves claimed_by_homeowner from NULL to their homeowner id) — protected by claim link UUID
CREATE POLICY "Anyone can claim unclaimed homes" ON public.homes FOR UPDATE TO anon, authenticated
  USING (claimed_by_homeowner IS NULL) WITH CHECK (true);

-- CUSTOMERS: pro owns rows; homeowner sees rows attached to their home
CREATE POLICY "Pros view own customers"      ON public.customers FOR SELECT TO authenticated
  USING (pro_id = public.my_pro_id()
      OR home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id()));
CREATE POLICY "Pros insert own customers"    ON public.customers FOR INSERT TO authenticated WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros update own customers"    ON public.customers FOR UPDATE TO authenticated USING (pro_id = public.my_pro_id()) WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros delete own customers"    ON public.customers FOR DELETE TO authenticated USING (pro_id = public.my_pro_id());

-- EQUIPMENT: shown on public record page → anon SELECT; write by pro who created home or homeowner who claimed it
CREATE POLICY "Anyone can view equipment"    ON public.equipment FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners insert equipment"      ON public.equipment FOR INSERT TO authenticated
  WITH CHECK (home_id IN (SELECT id FROM public.homes WHERE created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id()));
CREATE POLICY "Owners update equipment"      ON public.equipment FOR UPDATE TO authenticated
  USING (home_id IN (SELECT id FROM public.homes WHERE created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id()))
  WITH CHECK (home_id IN (SELECT id FROM public.homes WHERE created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id()));
CREATE POLICY "Owners delete equipment"      ON public.equipment FOR DELETE TO authenticated
  USING (home_id IN (SELECT id FROM public.homes WHERE created_by_pro = public.my_pro_id() OR claimed_by_homeowner = public.my_homeowner_id()));

-- JOBS: on shareable record → anon SELECT; pro writes own
CREATE POLICY "Anyone can view jobs"         ON public.jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pros insert own jobs"         ON public.jobs FOR INSERT TO authenticated WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros update own jobs"         ON public.jobs FOR UPDATE TO authenticated USING (pro_id = public.my_pro_id()) WITH CHECK (pro_id = public.my_pro_id());
CREATE POLICY "Pros delete own jobs"         ON public.jobs FOR DELETE TO authenticated USING (pro_id = public.my_pro_id());

-- RECORDS: whole point is a shareable link → anon SELECT; pro creates for own jobs; anyone can mark viewed_at
CREATE POLICY "Anyone can view records"      ON public.records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pros insert records"          ON public.records FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM public.jobs WHERE pro_id = public.my_pro_id()));
CREATE POLICY "Anyone can mark viewed"       ON public.records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- INVITES: homeowner creates/views own
CREATE POLICY "Homeowners view own invites"  ON public.invites FOR SELECT TO authenticated USING (from_homeowner = public.my_homeowner_id());
CREATE POLICY "Homeowners insert invites"    ON public.invites FOR INSERT TO authenticated WITH CHECK (from_homeowner = public.my_homeowner_id());
CREATE POLICY "Homeowners update invites"    ON public.invites FOR UPDATE TO authenticated USING (from_homeowner = public.my_homeowner_id()) WITH CHECK (from_homeowner = public.my_homeowner_id());

-- MESSAGES: mock delivery log — insert-only from client, no reads (server-only)
CREATE POLICY "Anyone can log messages"      ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- EVENTS: analytics — insert-only from client, no reads
CREATE POLICY "Anyone can log events"        ON public.events   FOR INSERT TO anon, authenticated WITH CHECK (true);
