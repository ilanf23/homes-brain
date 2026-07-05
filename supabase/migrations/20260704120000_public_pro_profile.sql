-- Public verified pro profile for /pro/:city/:trade/:business.
-- Read-only, SECURITY DEFINER function so the page never touches tables
-- directly, consistent with the coming RLS lockdown. Returns NULL for
-- unknown slugs AND for inactive pros (no job logged in the last 90 days),
-- which the route turns into a noindex + graceful 404.

CREATE OR REPLACE FUNCTION public.hb_slugify(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.get_public_pro_profile(
  p_city text,
  p_trade text,
  p_business text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro public.pros%ROWTYPE;
  v_job_count int;
  v_last_job timestamptz;
  v_recalls int;
  v_activity jsonb;
BEGIN
  SELECT * INTO v_pro
  FROM public.pros p
  WHERE public.hb_slugify(p.business) = public.hb_slugify(p_business)
    AND public.hb_slugify(p.trade) = public.hb_slugify(p_trade)
    AND public.hb_slugify(p.service_area) = public.hb_slugify(p_city)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*), max(j.created_at)
  INTO v_job_count, v_last_job
  FROM public.jobs j
  WHERE j.pro_id = v_pro.id;

  -- Gate: only pros with recent verified activity get a public profile.
  IF v_last_job IS NULL OR v_last_job < now() - interval '90 days' THEN
    RETURN NULL;
  END IF;

  SELECT count(*)
  INTO v_recalls
  FROM public.jobs j
  JOIN public.equipment e ON e.id = j.equipment_id
  WHERE j.pro_id = v_pro.id
    AND e.recall_status NOT IN ('none', 'unknown');

  -- Recent activity is anonymized: what was done + equipment type + date.
  -- Never addresses, names, or contact details.
  SELECT coalesce(jsonb_agg(a.item), '[]'::jsonb)
  INTO v_activity
  FROM (
    SELECT jsonb_build_object(
      'what_done', j.what_done,
      'done_on', to_char(j.created_at, 'YYYY-MM-DD'),
      'equipment_type', e.type
    ) AS item
    FROM public.jobs j
    LEFT JOIN public.equipment e ON e.id = j.equipment_id
    WHERE j.pro_id = v_pro.id
    ORDER BY j.created_at DESC
    LIMIT 5
  ) a;

  RETURN jsonb_build_object(
    'business', v_pro.business,
    'trade', v_pro.trade,
    'city', v_pro.service_area,
    'logo', v_pro.logo,
    'google_rating', v_pro.google_rating,
    'job_count', v_job_count,
    'recalls_caught', v_recalls,
    'last_job_at', v_last_job,
    'activity', v_activity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hb_slugify(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_pro_profile(text, text, text) TO anon, authenticated;
