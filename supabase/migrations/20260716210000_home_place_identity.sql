-- Key homes by place, not by string. A home gains a Google place_id as its
-- identity when the address came through Places; string variants of the same
-- house ("72 Sunshine bass" vs "72 Sunshine Bass Court") stop creating
-- sibling home records. Typed addresses that never resolve stay string-keyed
-- and functional.
--
-- NOTE: migrations do not auto-apply on git sync. This file is the record;
-- the SQL is applied through the Lovable-managed database directly.

-- Mirrors normalizeAddress() in src/lib/hb.ts: lowercase, punctuation to
-- spaces, collapsed whitespace.
CREATE OR REPLACE FUNCTION public.hb_normalize_address(a text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(regexp_replace(regexp_replace(coalesce(a, ''), '[.,#]', ' ', 'g'), '\s+', ' ', 'g')))
$$;

ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS place_id text;

CREATE UNIQUE INDEX IF NOT EXISTS homes_place_id_key
  ON public.homes (place_id)
  WHERE place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS homes_address_normalized_idx
  ON public.homes (public.hb_normalize_address(address));

-- Replace the exact-string upsert with identity-aware matching. The old
-- one-argument signature is dropped so PostgREST has a single unambiguous
-- function; existing clients calling with only p_address keep working
-- through the defaults.
DROP FUNCTION IF EXISTS public.upsert_home_by_address(text);

CREATE OR REPLACE FUNCTION public.upsert_home_by_address(
  p_address text,
  p_place_id text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pro uuid := public.my_pro_id();
  v_id uuid;
  v_addr text := btrim(p_address);
  v_place text := nullif(btrim(coalesce(p_place_id, '')), '');
BEGIN
  IF v_pro IS NULL THEN
    RAISE EXCEPTION 'not a pro';
  END IF;
  IF v_addr IS NULL OR length(v_addr) = 0 THEN
    RAISE EXCEPTION 'address required';
  END IF;

  -- Identity, strongest first: place, exact string, normalized string.
  IF v_place IS NOT NULL THEN
    SELECT id INTO v_id FROM public.homes WHERE place_id = v_place LIMIT 1;
  END IF;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.homes WHERE address = v_addr LIMIT 1;
  END IF;
  IF v_id IS NULL THEN
    SELECT id INTO v_id
      FROM public.homes
     WHERE public.hb_normalize_address(address) = public.hb_normalize_address(v_addr)
     LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    -- Backfill identity the row is missing. The canonical address string is
    -- only trusted when a place_id accompanies it (it came from Google), and
    -- never overwrites into a collision with another row.
    UPDATE public.homes h
       SET place_id = coalesce(
             h.place_id,
             CASE WHEN v_place IS NOT NULL
                    AND NOT EXISTS (SELECT 1 FROM public.homes o WHERE o.place_id = v_place AND o.id <> h.id)
                  THEN v_place END),
           lat = coalesce(h.lat, p_lat),
           lng = coalesce(h.lng, p_lng),
           geocoded_at = CASE WHEN h.geocoded_at IS NULL AND p_lat IS NOT NULL THEN now()
                              ELSE h.geocoded_at END,
           address = CASE
             WHEN v_place IS NOT NULL
                  AND h.address <> v_addr
                  AND NOT EXISTS (SELECT 1 FROM public.homes o WHERE o.address = v_addr AND o.id <> h.id)
             THEN v_addr
             ELSE h.address END
     WHERE h.id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.homes (address, created_by_pro, place_id, lat, lng, geocoded_at)
  VALUES (v_addr, v_pro, v_place, p_lat, p_lng,
          CASE WHEN p_lat IS NOT NULL THEN now() END)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.upsert_home_by_address(text, text, double precision, double precision) TO authenticated;
