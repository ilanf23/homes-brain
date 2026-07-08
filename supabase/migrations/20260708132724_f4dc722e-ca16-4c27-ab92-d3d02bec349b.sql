
-- 1. Additive columns
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.equipment_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_equipment_set_updated_at ON public.equipment;
CREATE TRIGGER trg_equipment_set_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

-- 3. Index on home_id (idempotent; existing one is idx_equipment_home)
CREATE INDEX IF NOT EXISTS idx_equipment_home_id ON public.equipment(home_id);

-- 4. Helper: does the calling pro serve this home?
--    A pro "serves" a home if they created it, have a customers row for it,
--    or have a jobs row on it.
CREATE OR REPLACE FUNCTION public.pro_serves_home(p_home_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homes h
    WHERE h.id = p_home_id AND h.created_by_pro = public.my_pro_id()
  ) OR EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.home_id = p_home_id AND c.pro_id = public.my_pro_id()
  ) OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.home_id = p_home_id AND j.pro_id = public.my_pro_id()
  )
$$;

-- 5. Rebuild equipment RLS policies with broader pro access
DROP POLICY IF EXISTS "Pros view equipment on their homes" ON public.equipment;
DROP POLICY IF EXISTS "Owners insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Owners update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Owners delete equipment" ON public.equipment;

-- SELECT: homeowner of the claimed home, or any pro who serves the home
CREATE POLICY "View equipment (homeowner or serving pro)"
ON public.equipment FOR SELECT
TO authenticated
USING (
  home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())
  OR public.pro_serves_home(home_id)
);

-- INSERT: same
CREATE POLICY "Insert equipment (homeowner or serving pro)"
ON public.equipment FOR INSERT
TO authenticated
WITH CHECK (
  home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())
  OR public.pro_serves_home(home_id)
);

-- UPDATE: same
CREATE POLICY "Update equipment (homeowner or serving pro)"
ON public.equipment FOR UPDATE
TO authenticated
USING (
  home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())
  OR public.pro_serves_home(home_id)
)
WITH CHECK (
  home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id())
  OR public.pro_serves_home(home_id)
);

-- DELETE: keep to the actual owners (homeowner of the home, or pro who created the home)
CREATE POLICY "Delete equipment (homeowner or creating pro)"
ON public.equipment FOR DELETE
TO authenticated
USING (
  home_id IN (
    SELECT id FROM public.homes
    WHERE created_by_pro = public.my_pro_id()
       OR claimed_by_homeowner = public.my_homeowner_id()
  )
);

-- 6. Update homeowner RPCs to accept optional p_label
CREATE OR REPLACE FUNCTION public.homeowner_add_equipment(
  p_type text,
  p_make text,
  p_model text,
  p_serial text,
  p_warranty_until date,
  p_source text,
  p_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id(); v_home_id uuid; v_eq_id uuid;
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = v_ho LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.equipment(home_id, type, make, model, serial, warranty_until, source, recall_status, label)
  VALUES (v_home_id, p_type, p_make, p_model, p_serial, p_warranty_until, COALESCE(p_source,'homeowner'), 'unknown', NULLIF(btrim(p_label),''))
  RETURNING id INTO v_eq_id;
  RETURN v_eq_id;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_update_equipment(
  p_equipment_id uuid,
  p_type text DEFAULT NULL,
  p_make text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_warranty_until date DEFAULT NULL,
  p_label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.equipment e SET
    type = COALESCE(p_type, e.type),
    make = COALESCE(p_make, e.make),
    model = COALESCE(p_model, e.model),
    serial = COALESCE(p_serial, e.serial),
    warranty_until = COALESCE(p_warranty_until, e.warranty_until),
    label = COALESCE(NULLIF(btrim(p_label),''), e.label)
  WHERE e.id = p_equipment_id
    AND e.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = v_ho);
END $$;

-- 7. Pro upsert equipment RPC
CREATE OR REPLACE FUNCTION public.pro_upsert_equipment(
  p_home_id uuid,
  p_label text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_make text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial text DEFAULT NULL,
  p_warranty_until date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro uuid := public.my_pro_id();
  v_eq_id uuid;
  v_label text := NULLIF(btrim(p_label), '');
  v_serial text := NULLIF(btrim(p_serial), '');
  v_make text := NULLIF(btrim(p_make), '');
  v_model text := NULLIF(btrim(p_model), '');
BEGIN
  IF v_pro IS NULL THEN RAISE EXCEPTION 'not_a_pro'; END IF;
  IF p_home_id IS NULL THEN RAISE EXCEPTION 'home_required'; END IF;
  IF NOT public.pro_serves_home(p_home_id) THEN RAISE EXCEPTION 'not_authorized_for_home'; END IF;

  -- Try to match an existing unit on this home to avoid duplicates.
  -- 1) exact serial match (when provided)
  IF v_serial IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id AND lower(serial) = lower(v_serial)
     LIMIT 1;
  END IF;

  -- 2) same type + make + model when no serial hit
  IF v_eq_id IS NULL AND p_type IS NOT NULL AND v_make IS NOT NULL AND v_model IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id
       AND type = p_type
       AND lower(coalesce(make,'')) = lower(v_make)
       AND lower(coalesce(model,'')) = lower(v_model)
     LIMIT 1;
  END IF;

  -- 3) same label match
  IF v_eq_id IS NULL AND v_label IS NOT NULL THEN
    SELECT id INTO v_eq_id FROM public.equipment
     WHERE home_id = p_home_id AND lower(coalesce(label,'')) = lower(v_label)
     LIMIT 1;
  END IF;

  IF v_eq_id IS NOT NULL THEN
    UPDATE public.equipment SET
      label = COALESCE(v_label, label),
      type = COALESCE(p_type, type),
      make = COALESCE(v_make, make),
      model = COALESCE(v_model, model),
      serial = COALESCE(v_serial, serial),
      warranty_until = COALESCE(p_warranty_until, warranty_until)
    WHERE id = v_eq_id;
    RETURN v_eq_id;
  END IF;

  INSERT INTO public.equipment(home_id, label, type, make, model, serial, warranty_until, source, recall_status)
  VALUES (p_home_id, v_label, p_type, v_make, v_model, v_serial, p_warranty_until, 'pro', 'unknown')
  RETURNING id INTO v_eq_id;

  RETURN v_eq_id;
END $$;
