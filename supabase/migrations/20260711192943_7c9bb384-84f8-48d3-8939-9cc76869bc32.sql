
-- 1. Events role tag
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS role text;
UPDATE public.events SET role = CASE
  WHEN actor LIKE 'pro:%' THEN 'pro'
  WHEN actor LIKE 'user:%' OR actor LIKE 'homeowner:%' THEN 'homeowner'
  ELSE 'system'
END
WHERE role IS NULL;
CREATE INDEX IF NOT EXISTS events_role_type_created_idx ON public.events (role, type, created_at DESC);
CREATE INDEX IF NOT EXISTS events_created_idx ON public.events (created_at DESC);

-- 2. Admins allowlist
CREATE TABLE IF NOT EXISTS public.admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: only reachable via SECURITY DEFINER is_admin().
INSERT INTO public.admins(email) VALUES
  ('ilanfridman23@gmail.com'),
  ('ilan@maverich.ai')
ON CONFLICT (email) DO NOTHING;

-- 3. is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. Backfill historical events (safe to re-run)
-- pro_first_job
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'pro:'||j.pro_id, 'pro_first_job',
       jsonb_build_object('job_id', j.id, 'backfill', true), 'pro', j.created_at
FROM (
  SELECT DISTINCT ON (pro_id) id, pro_id, created_at
  FROM public.jobs
  ORDER BY pro_id, created_at ASC
) j
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.type = 'pro_first_job' AND e.actor = 'pro:'||j.pro_id
);

-- pro_second_job
WITH ranked AS (
  SELECT id, pro_id, created_at,
         row_number() OVER (PARTITION BY pro_id ORDER BY created_at ASC) AS r
  FROM public.jobs
)
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'pro:'||r.pro_id, 'pro_second_job',
       jsonb_build_object('job_id', r.id, 'backfill', true), 'pro', r.created_at
FROM ranked r
WHERE r.r = 2
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.type='pro_second_job' AND e.actor='pro:'||r.pro_id
  );

-- record_sent
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'pro:'||j.pro_id, 'record_sent',
       jsonb_build_object('record_id', r.id, 'backfill', true), 'pro',
       COALESCE(r.sent_sms_at, r.sent_email_at, r.created_at)
FROM public.records r
JOIN public.jobs j ON j.id = r.job_id
WHERE (r.sent_sms_at IS NOT NULL OR r.sent_email_at IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.type='record_sent' AND (e.props->>'record_id') = r.id::text
  );

-- record_viewed
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'system', 'record_viewed',
       jsonb_build_object('record_id', r.id, 'backfill', true), 'system', r.viewed_at
FROM public.records r
WHERE r.viewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.type='record_viewed' AND (e.props->>'record_id') = r.id::text
  );

-- home_claimed
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'homeowner:'||h.claimed_by_homeowner, 'home_claimed',
       jsonb_build_object('home_id', h.id, 'backfill', true), 'homeowner', h.claimed_at
FROM public.homes h
WHERE h.claimed_at IS NOT NULL AND h.claimed_by_homeowner IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.type='home_claimed' AND (e.props->>'home_id') = h.id::text
  );

-- plan_upgraded
INSERT INTO public.events(actor, type, props, role, created_at)
SELECT 'pro:'||p.id, 'plan_upgraded',
       jsonb_build_object('plan','pro','backfill',true), 'pro',
       COALESCE(p.plan_since, p.created_at, now())
FROM public.pros p
WHERE p.plan='pro' AND p.plan_status='active'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.type='plan_upgraded' AND e.actor='pro:'||p.id
  );

-- 5. Admin RPCs (all check is_admin())
CREATE OR REPLACE FUNCTION public.admin_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_logging_pros int;
  v_pro_activation_48h numeric;
  v_record_open_rate numeric;
  v_homeowner_claim_rate numeric;
  v_second_pro_rate numeric;
  v_pro_retention_2wk numeric;
  v_total_pros int;
  v_pros_with_job int;
  v_pros_activated int;
  v_records_sent int;
  v_records_viewed int;
  v_total_homes int;
  v_claimed_homes int;
  v_pros_multi_second_job int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(DISTINCT pro_id) INTO v_active_logging_pros
    FROM public.jobs WHERE created_at > now() - interval '14 days';

  SELECT COUNT(*) INTO v_total_pros FROM public.pros;
  SELECT COUNT(DISTINCT j.pro_id) INTO v_pros_with_job FROM public.jobs j;

  SELECT COUNT(*) INTO v_pros_activated
    FROM public.pros p
    WHERE EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.pro_id = p.id
        AND j.created_at <= p.created_at + interval '48 hours'
    );
  v_pro_activation_48h := CASE WHEN v_total_pros = 0 THEN 0
                          ELSE round(v_pros_activated::numeric / v_total_pros, 3) END;

  SELECT COUNT(*) INTO v_records_sent FROM public.records
    WHERE sent_sms_at IS NOT NULL OR sent_email_at IS NOT NULL;
  SELECT COUNT(*) INTO v_records_viewed FROM public.records WHERE viewed_at IS NOT NULL;
  v_record_open_rate := CASE WHEN v_records_sent = 0 THEN 0
                        ELSE round(v_records_viewed::numeric / v_records_sent, 3) END;

  SELECT COUNT(*) INTO v_total_homes FROM public.homes;
  SELECT COUNT(*) INTO v_claimed_homes FROM public.homes WHERE claimed_at IS NOT NULL;
  v_homeowner_claim_rate := CASE WHEN v_total_homes = 0 THEN 0
                            ELSE round(v_claimed_homes::numeric / v_total_homes, 3) END;

  WITH per_home AS (
    SELECT home_id, COUNT(DISTINCT pro_id) AS pros
    FROM public.jobs GROUP BY home_id
  )
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE pros >= 1) = 0 THEN 0
         ELSE round(
           COUNT(*) FILTER (WHERE pros >= 2)::numeric
           / COUNT(*) FILTER (WHERE pros >= 1), 3) END
  INTO v_second_pro_rate FROM per_home;

  WITH ranked AS (
    SELECT pro_id, created_at,
           row_number() OVER (PARTITION BY pro_id ORDER BY created_at ASC) r,
           MIN(created_at) OVER (PARTITION BY pro_id) first_at
    FROM public.jobs
  )
  SELECT COUNT(DISTINCT pro_id) INTO v_pros_multi_second_job
  FROM ranked WHERE r = 2 AND created_at <= first_at + interval '14 days';
  v_pro_retention_2wk := CASE WHEN v_pros_with_job = 0 THEN 0
                         ELSE round(v_pros_multi_second_job::numeric / v_pros_with_job, 3) END;

  RETURN jsonb_build_object(
    'active_logging_pros', jsonb_build_object('actual', v_active_logging_pros, 'target', NULL, 'label', 'Active logging pros (14d)'),
    'pro_activation_48h', jsonb_build_object('actual', v_pro_activation_48h, 'target', 0.60, 'label', 'Pro activation (first job < 48h)'),
    'record_open_rate', jsonb_build_object('actual', v_record_open_rate, 'target', 0.50, 'label', 'Record open rate'),
    'homeowner_claim_rate', jsonb_build_object('actual', v_homeowner_claim_rate, 'target', 0.25, 'label', 'Homeowner claim rate'),
    'second_pro_rate', jsonb_build_object('actual', v_second_pro_rate, 'target', 0.20, 'label', 'Second pro added rate'),
    'pro_retention_2wk', jsonb_build_object('actual', v_pro_retention_2wk, 'target', 0.50, 'label', 'Pro retention (2nd job in 14d)'),
    'totals', jsonb_build_object(
      'pros', v_total_pros,
      'pros_with_job', v_pros_with_job,
      'homes', v_total_homes,
      'claimed_homes', v_claimed_homes,
      'records_sent', v_records_sent,
      'records_viewed', v_records_viewed
    )
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_kpis() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_pro_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reached int;
  v_signed_up int;
  v_first_job int;
  v_repeat int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COUNT(DISTINCT actor) INTO v_reached FROM public.events WHERE type='pro_reached';
  SELECT COUNT(*) INTO v_signed_up FROM public.pros;
  SELECT COUNT(DISTINCT pro_id) INTO v_first_job FROM public.jobs;
  WITH c AS (SELECT pro_id, COUNT(*) n FROM public.jobs GROUP BY pro_id)
    SELECT COUNT(*) INTO v_repeat FROM c WHERE n >= 2;
  v_reached := GREATEST(v_reached, v_signed_up); -- fallback so funnel never inverts
  RETURN jsonb_build_array(
    jsonb_build_object('step','reached','label','Reached',   'count', v_reached,   'pct', 1.0),
    jsonb_build_object('step','signup', 'label','Signed up', 'count', v_signed_up, 'pct', CASE WHEN v_reached=0 THEN 0 ELSE round(v_signed_up::numeric/v_reached,3) END),
    jsonb_build_object('step','first_job','label','First job','count', v_first_job,'pct', CASE WHEN v_signed_up=0 THEN 0 ELSE round(v_first_job::numeric/v_signed_up,3) END),
    jsonb_build_object('step','repeat','label','Repeat (2nd job)','count', v_repeat,'pct', CASE WHEN v_first_job=0 THEN 0 ELSE round(v_repeat::numeric/v_first_job,3) END)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_pro_funnel() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_homeowner_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent int;
  v_opened int;
  v_claimed int;
  v_second int;
  v_guide int;
  v_dir int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COUNT(*) INTO v_sent FROM public.events WHERE type='claim_invite_sent';
  SELECT COUNT(*) INTO v_opened FROM public.events WHERE type='claim_opened';
  SELECT COUNT(*) INTO v_claimed FROM public.homes WHERE claimed_at IS NOT NULL;
  SELECT COUNT(*) INTO v_second FROM public.events WHERE type IN ('homeowner_second_pro_added','second_pro_added');
  SELECT COUNT(*) INTO v_guide FROM public.events WHERE type='guide_viewed';
  SELECT COUNT(*) INTO v_dir FROM public.events WHERE type='directory_viewed';
  IF v_sent < v_claimed THEN v_sent := v_claimed; END IF;
  IF v_opened < v_claimed THEN v_opened := v_claimed; END IF;
  RETURN jsonb_build_object(
    'funnel', jsonb_build_array(
      jsonb_build_object('step','invite_sent','label','Claim invite sent','count', v_sent, 'pct', 1.0),
      jsonb_build_object('step','opened','label','Claim opened','count', v_opened, 'pct', CASE WHEN v_sent=0 THEN 0 ELSE round(v_opened::numeric/v_sent,3) END),
      jsonb_build_object('step','claimed','label','Home claimed','count', v_claimed, 'pct', CASE WHEN v_opened=0 THEN 0 ELSE round(v_claimed::numeric/v_opened,3) END)
    ),
    'spread', jsonb_build_object(
      'second_pro_added', v_second,
      'guide_viewed', v_guide,
      'directory_viewed', v_dir
    )
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_homeowner_funnel() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_timeseries(p_metric text, p_grain text DEFAULT 'day')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grain text := CASE WHEN p_grain = 'week' THEN 'week' ELSE 'day' END;
  v_res jsonb;
  v_days int := CASE WHEN v_grain = 'week' THEN 84 ELSE 30 END;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_metric = 'active_logging_pros' THEN
    EXECUTE format($f$
      WITH buckets AS (
        SELECT generate_series(date_trunc(%L, now()) - (%L::int - 1) * ('1 '||%L)::interval,
                               date_trunc(%L, now()), ('1 '||%L)::interval) AS t
      )
      SELECT jsonb_agg(jsonb_build_object('t', to_char(b.t,'YYYY-MM-DD'),
                                          'v', COALESCE(x.v, 0)) ORDER BY b.t)
      FROM buckets b
      LEFT JOIN (
        SELECT date_trunc(%L, created_at) t, COUNT(DISTINCT pro_id) v
        FROM public.jobs GROUP BY 1
      ) x ON x.t = b.t
    $f$, v_grain, v_days, v_grain, v_grain, v_grain, v_grain) INTO v_res;
  ELSIF p_metric = 'signups' THEN
    EXECUTE format($f$
      WITH buckets AS (
        SELECT generate_series(date_trunc(%L, now()) - (%L::int - 1) * ('1 '||%L)::interval,
                               date_trunc(%L, now()), ('1 '||%L)::interval) AS t
      )
      SELECT jsonb_agg(jsonb_build_object('t', to_char(b.t,'YYYY-MM-DD'),
                                          'v', COALESCE(x.v, 0)) ORDER BY b.t)
      FROM buckets b
      LEFT JOIN (
        SELECT date_trunc(%L, created_at) t, COUNT(*) v
        FROM public.pros GROUP BY 1
      ) x ON x.t = b.t
    $f$, v_grain, v_days, v_grain, v_grain, v_grain, v_grain) INTO v_res;
  ELSIF p_metric = 'claims' THEN
    EXECUTE format($f$
      WITH buckets AS (
        SELECT generate_series(date_trunc(%L, now()) - (%L::int - 1) * ('1 '||%L)::interval,
                               date_trunc(%L, now()), ('1 '||%L)::interval) AS t
      )
      SELECT jsonb_agg(jsonb_build_object('t', to_char(b.t,'YYYY-MM-DD'),
                                          'v', COALESCE(x.v, 0)) ORDER BY b.t)
      FROM buckets b
      LEFT JOIN (
        SELECT date_trunc(%L, claimed_at) t, COUNT(*) v
        FROM public.homes WHERE claimed_at IS NOT NULL GROUP BY 1
      ) x ON x.t = b.t
    $f$, v_grain, v_days, v_grain, v_grain, v_grain, v_grain) INTO v_res;
  ELSE
    RAISE EXCEPTION 'unknown_metric';
  END IF;
  RETURN COALESCE(v_res, '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recent_events(p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_res jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_res FROM (
    SELECT created_at, role, actor, type, props
    FROM public.events
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  ) x;
  RETURN v_res;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_recent_events(int) TO authenticated;
