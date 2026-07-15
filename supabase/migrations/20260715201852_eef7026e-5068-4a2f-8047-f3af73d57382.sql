
-- 1) Canonical type normalization
CREATE OR REPLACE FUNCTION public.normalize_equipment_type(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_type IS NULL OR btrim(p_type) = '' THEN NULL
    WHEN lower(btrim(p_type)) IN ('softener','water softener','water_softener','watersoftener') THEN 'Water softener'
    WHEN lower(btrim(p_type)) IN ('fridge','refrigerator') THEN 'Refrigerator'
    WHEN lower(btrim(p_type)) IN ('water heater','waterheater','hot water heater','water_heater') THEN 'Water heater'
    WHEN lower(btrim(p_type)) IN ('ac','a/c','air conditioner','air conditioning','airconditioner') THEN 'Air conditioner'
    WHEN lower(btrim(p_type)) IN ('furnace') THEN 'Furnace'
    WHEN lower(btrim(p_type)) IN ('dishwasher') THEN 'Dishwasher'
    WHEN lower(btrim(p_type)) IN ('washer','washing machine','clothes washer') THEN 'Washer'
    WHEN lower(btrim(p_type)) IN ('dryer','clothes dryer') THEN 'Dryer'
    WHEN lower(btrim(p_type)) IN ('microwave') THEN 'Microwave'
    WHEN lower(btrim(p_type)) IN ('oven','range','stove') THEN 'Oven'
    WHEN lower(btrim(p_type)) IN ('sink') THEN 'Sink'
    WHEN lower(btrim(p_type)) IN ('toilet') THEN 'Toilet'
    WHEN lower(btrim(p_type)) IN ('garbage disposal','disposal') THEN 'Garbage disposal'
    ELSE initcap(btrim(p_type))
  END
$$;

-- 2) Normalize existing rows' type column
UPDATE public.equipment
   SET type = public.normalize_equipment_type(type)
 WHERE type IS DISTINCT FROM public.normalize_equipment_type(type);

-- 3) Backfill: merge duplicates on the same home with identical
--    (normalized type, make, model, serial) — treating blanks as equal.
--    Keep the earliest row, fill blank fields from siblings, repoint jobs,
--    then delete the losers.
WITH grouped AS (
  SELECT
    id,
    home_id,
    public.normalize_equipment_type(type) AS ntype,
    lower(btrim(coalesce(make,'')))   AS nmake,
    lower(btrim(coalesce(model,'')))  AS nmodel,
    lower(btrim(coalesce(serial,''))) AS nserial,
    created_at
  FROM public.equipment
),
ranked AS (
  SELECT
    id, home_id, ntype, nmake, nmodel, nserial,
    MIN(id::text) OVER w AS _dummy,  -- unused, keeps window valid
    FIRST_VALUE(id) OVER (PARTITION BY home_id, ntype, nmake, nmodel, nserial
                          ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM grouped
  WINDOW w AS (PARTITION BY home_id, ntype, nmake, nmodel, nserial)
),
losers AS (
  SELECT id, keeper_id FROM ranked WHERE id <> keeper_id
),
-- Fill keeper blanks from any loser value
keeper_fills AS (
  SELECT
    r.keeper_id,
    (array_agg(e.make   ORDER BY e.created_at) FILTER (WHERE NULLIF(btrim(coalesce(e.make,'')),'')   IS NOT NULL))[1] AS make,
    (array_agg(e.model  ORDER BY e.created_at) FILTER (WHERE NULLIF(btrim(coalesce(e.model,'')),'')  IS NOT NULL))[1] AS model,
    (array_agg(e.serial ORDER BY e.created_at) FILTER (WHERE NULLIF(btrim(coalesce(e.serial,'')),'') IS NOT NULL))[1] AS serial,
    (array_agg(e.label  ORDER BY e.created_at) FILTER (WHERE NULLIF(btrim(coalesce(e.label,'')),'')  IS NOT NULL))[1] AS label,
    MAX(e.warranty_until) AS warranty_until
  FROM ranked r
  JOIN public.equipment e ON e.id IN (r.keeper_id) OR e.id = r.id
  GROUP BY r.keeper_id
)
UPDATE public.equipment k
   SET make           = COALESCE(NULLIF(btrim(coalesce(k.make,'')),''),   kf.make),
       model          = COALESCE(NULLIF(btrim(coalesce(k.model,'')),''),  kf.model),
       serial         = COALESCE(NULLIF(btrim(coalesce(k.serial,'')),''), kf.serial),
       label          = COALESCE(NULLIF(btrim(coalesce(k.label,'')),''),  kf.label),
       warranty_until = COALESCE(k.warranty_until, kf.warranty_until)
  FROM keeper_fills kf
 WHERE k.id = kf.keeper_id
   AND EXISTS (SELECT 1 FROM losers l WHERE l.keeper_id = kf.keeper_id);

-- Repoint jobs from losers to keeper
UPDATE public.jobs j
   SET equipment_id = l.keeper_id
  FROM (
    SELECT
      id,
      FIRST_VALUE(id) OVER (PARTITION BY home_id,
                            public.normalize_equipment_type(type),
                            lower(btrim(coalesce(make,''))),
                            lower(btrim(coalesce(model,''))),
                            lower(btrim(coalesce(serial,'')))
                            ORDER BY created_at ASC, id ASC) AS keeper_id
    FROM public.equipment
  ) l
 WHERE j.equipment_id = l.id
   AND l.id <> l.keeper_id;

-- Delete losers
DELETE FROM public.equipment e
 USING (
   SELECT
     id,
     FIRST_VALUE(id) OVER (PARTITION BY home_id,
                           public.normalize_equipment_type(type),
                           lower(btrim(coalesce(make,''))),
                           lower(btrim(coalesce(model,''))),
                           lower(btrim(coalesce(serial,'')))
                           ORDER BY created_at ASC, id ASC) AS keeper_id
   FROM public.equipment
 ) l
 WHERE e.id = l.id AND l.id <> l.keeper_id;

-- 4) Updated upsert: normalize type on write, add type-only dedupe pass
CREATE OR REPLACE FUNCTION public.pro_upsert_equipment(
  p_home_id uuid,
  p_label text DEFAULT NULL::text,
  p_type text DEFAULT NULL::text,
  p_make text DEFAULT NULL::text,
  p_model text DEFAULT NULL::text,
  p_serial text DEFAULT NULL::text,
  p_warranty_until date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pro uuid := public.my_pro_id();
  v_eq_id uuid;
  v_label text := NULLIF(btrim(p_label), '');
  v_serial text := NULLIF(btrim(p_serial), '');
  v_make text := NULLIF(btrim(p_make), '');
  v_model text := NULLIF(btrim(p_model), '');
  v_type text := public.normalize_equipment_type(p_type);
BEGIN
  IF v_pro IS NULL THEN RAISE EXCEPTION 'not_a_pro'; END IF;
  IF p_home_id IS NULL THEN RAISE EXCEPTION 'home_required'; END IF;
  IF NOT public.pro_serves_home(p_home_id) THEN RAISE EXCEPTION 'not_authorized_for_home'; END IF;

  -- 1) exact serial match
  IF v_serial IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id AND lower(serial) = lower(v_serial)
     LIMIT 1;
  END IF;

  -- 2) same normalized type + make + model
  IF v_eq_id IS NULL AND v_type IS NOT NULL AND v_make IS NOT NULL AND v_model IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id
       AND public.normalize_equipment_type(type) = v_type
       AND lower(coalesce(make,'')) = lower(v_make)
       AND lower(coalesce(model,'')) = lower(v_model)
     LIMIT 1;
  END IF;

  -- 3) label match
  IF v_eq_id IS NULL AND v_label IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id AND lower(coalesce(label,'')) = lower(v_label)
     LIMIT 1;
  END IF;

  -- 4) type-only match: bare "Refrigerator" should attach to an existing
  --    generic row of the same normalized type on this home. Only fires
  --    when the incoming payload has no make/model/serial/label, so a
  --    detailed unit never collapses onto an unrelated one.
  IF v_eq_id IS NULL AND v_type IS NOT NULL
     AND v_make IS NULL AND v_model IS NULL AND v_serial IS NULL AND v_label IS NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id
       AND public.normalize_equipment_type(type) = v_type
     ORDER BY created_at ASC
     LIMIT 1;
  END IF;

  IF v_eq_id IS NOT NULL THEN
    UPDATE public.equipment SET
      label = COALESCE(v_label, label),
      type = COALESCE(v_type, type),
      make = COALESCE(v_make, make),
      model = COALESCE(v_model, model),
      serial = COALESCE(v_serial, serial),
      warranty_until = COALESCE(p_warranty_until, warranty_until)
    WHERE id = v_eq_id;
    RETURN v_eq_id;
  END IF;

  INSERT INTO public.equipment(home_id, label, type, make, model, serial, warranty_until, source, recall_status)
  VALUES (p_home_id, v_label, v_type, v_make, v_model, v_serial, p_warranty_until, 'pro', 'unknown')
  RETURNING id INTO v_eq_id;

  RETURN v_eq_id;
END $function$;
