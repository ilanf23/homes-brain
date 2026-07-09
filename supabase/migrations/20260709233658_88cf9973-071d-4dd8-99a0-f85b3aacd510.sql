
-- 1. Columns on pros
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_since timestamptz;

-- 2. Plans catalog
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly integer NOT NULL DEFAULT 0,
  tagline text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans public read" ON public.plans;
CREATE POLICY "plans public read" ON public.plans FOR SELECT USING (true);

-- 3. Plan features catalog
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  tier text NOT NULL CHECK (tier IN ('free','pro')),
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_features TO anon, authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_features public read" ON public.plan_features;
CREATE POLICY "plan_features public read" ON public.plan_features FOR SELECT USING (true);

-- Seed plans
INSERT INTO public.plans (id, name, price_monthly, tagline, sort_order) VALUES
  ('free','Free',0,'Log jobs and own your records — free forever.',1),
  ('pro','Pro',19,'The money features: get paid, get rebooked, get reviews — on autopilot.',2)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, price_monthly=EXCLUDED.price_monthly,
  tagline=EXCLUDED.tagline, sort_order=EXCLUDED.sort_order;

-- Seed features
INSERT INTO public.plan_features (feature_key, label, description, tier, sort_order) VALUES
  ('log_jobs','Log jobs','Record every job you do at a home.','free',10),
  ('send_records','Send & own service records','Give homeowners a verified record they keep.','free',20),
  ('reminders_basic','Basic reminders','Simple service-due reminders.','free',30),
  ('collect_reviews','Collect reviews','Gather reviews from happy customers.','free',40),
  ('review_automation','Automated review requests','Auto-ask every customer for a review at the right time.','pro',110),
  ('invoicing_get_paid','Invoicing + get paid','Send invoices and get paid through HomesBrain.','pro',120),
  ('rebooking_automation','Rebooking & retention','Automated campaigns that bring customers back.','pro',130),
  ('crm','Customer CRM','Your full customer + property history in one place.','pro',140),
  ('analytics','Analytics & insights','See revenue, rebook rate, and what drives it.','pro',150),
  ('team_seats','Team seats','Add your crew to the account.','pro',160)
ON CONFLICT (feature_key) DO UPDATE SET
  label=EXCLUDED.label, description=EXCLUDED.description,
  tier=EXCLUDED.tier, sort_order=EXCLUDED.sort_order;

-- 4. is_pro() helper
CREATE OR REPLACE FUNCTION public.is_pro()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pros
    WHERE auth_user_id = auth.uid()
      AND plan = 'pro'
      AND plan_status = 'active'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_pro() TO authenticated;

-- 5. mock_set_plan RPC (no payment)
CREATE OR REPLACE FUNCTION public.mock_set_plan(p_plan text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_plan NOT IN ('free','pro') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  UPDATE public.pros
    SET plan = p_plan,
        plan_status = 'active',
        plan_since = CASE WHEN p_plan = 'pro' THEN now() ELSE plan_since END
    WHERE auth_user_id = v_uid;
  RETURN p_plan;
END $$;
GRANT EXECUTE ON FUNCTION public.mock_set_plan(text) TO authenticated;
