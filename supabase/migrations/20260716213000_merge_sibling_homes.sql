-- One-time cleanup: fold sibling home records that are the same physical
-- house into one. Siblings arise from address string variants typed before
-- place-identity keying (20260716210000_home_place_identity.sql) existed.
--
-- A pair is a sibling when either:
--   - their addresses normalize to the same string, or
--   - both are geocoded within 75 meters with the same leading street number.
-- A pair is only merged when the claims are compatible: unclaimed on at least
-- one side, or claimed by the same homeowner. Two homes claimed by different
-- homeowners are NEVER auto-merged.
--
-- Survivor: earliest claim, else geocoded, else oldest. Everything that
-- points at the loser is repointed first (jobs, equipment, customers,
-- invoices, invites, payments, claim_tokens), then claim/identity fields
-- backfill onto the survivor, then the loser is deleted.
--
-- NOTE: migrations do not auto-apply on git sync. This file is the record;
-- the SQL is applied through the Lovable-managed database directly.

DO $$
DECLARE
  pair record;
  v_survivor uuid;
  v_loser uuid;
  merged int := 0;
BEGIN
  LOOP
    SELECT a.id AS id_a, b.id AS id_b
      INTO pair
      FROM public.homes a
      JOIN public.homes b ON a.id < b.id
     WHERE (
             public.hb_normalize_address(a.address) = public.hb_normalize_address(b.address)
             OR (
               a.lat IS NOT NULL AND b.lat IS NOT NULL
               AND (regexp_match(btrim(a.address), '^\d+'))[1] IS NOT NULL
               AND (regexp_match(btrim(a.address), '^\d+'))[1] = (regexp_match(btrim(b.address), '^\d+'))[1]
               AND 2 * 6371000 * asin(sqrt(
                     power(sin(radians(b.lat - a.lat) / 2), 2)
                     + cos(radians(a.lat)) * cos(radians(b.lat))
                       * power(sin(radians(b.lng - a.lng) / 2), 2)
                   )) < 75
             )
           )
       AND (a.claimed_by_homeowner IS NULL
            OR b.claimed_by_homeowner IS NULL
            OR a.claimed_by_homeowner = b.claimed_by_homeowner)
     LIMIT 1;
    EXIT WHEN pair IS NULL;

    SELECT id INTO v_survivor
      FROM public.homes
     WHERE id IN (pair.id_a, pair.id_b)
     ORDER BY (claimed_at IS NULL), claimed_at, (geocoded_at IS NULL), created_at
     LIMIT 1;
    v_loser := CASE WHEN v_survivor = pair.id_a THEN pair.id_b ELSE pair.id_a END;

    UPDATE public.jobs SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.equipment SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.customers SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.invoices SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.invites SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.payments SET home_id = v_survivor WHERE home_id = v_loser;
    UPDATE public.claim_tokens SET home_id = v_survivor WHERE home_id = v_loser;

    UPDATE public.homes s
       SET claimed_by_homeowner = coalesce(s.claimed_by_homeowner, l.claimed_by_homeowner),
           claimed_at = coalesce(s.claimed_at, l.claimed_at),
           place_id = coalesce(s.place_id, l.place_id),
           lat = coalesce(s.lat, l.lat),
           lng = coalesce(s.lng, l.lng),
           geocoded_at = coalesce(s.geocoded_at, l.geocoded_at)
      FROM public.homes l
     WHERE s.id = v_survivor AND l.id = v_loser;

    DELETE FROM public.homes WHERE id = v_loser;
    merged := merged + 1;
    EXIT WHEN merged > 50;
  END LOOP;
  RAISE NOTICE 'merged % sibling homes', merged;
END $$;
