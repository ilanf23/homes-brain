-- One-time dedupe: fold customers that are unmistakably the same person for
-- the same pro into one row. Contact details are identity in the app (the
-- log-a-job silent dedupe already treats them that way), so rows sharing a
-- phone or email are one person who may hold several properties. Jobs keep
-- their own home_id, so each visit stays with the house it happened at; the
-- oldest row survives as the original (its home_id stays the primary home).
--
-- Fuzzy cases (same name at the same home, no shared contact) stay in the
-- in-app "possible duplicate" card where the pro confirms before merging.

DO $$
DECLARE
  grp record;
  survivor_id uuid;
  loser_ids uuid[];
BEGIN
  -- Pass 1: identical phone within one pro. Compare on the last 10 digits,
  -- ignoring formatting, matching normalizedPhone() in the app.
  FOR grp IN
    SELECT pro_id,
           right(regexp_replace(phone, '\D', '', 'g'), 10) AS contact_key,
           array_agg(id ORDER BY created_at, id) AS ids
      FROM public.customers
     WHERE phone IS NOT NULL
       AND length(regexp_replace(phone, '\D', '', 'g')) >= 7
     GROUP BY 1, 2
    HAVING count(*) > 1
  LOOP
    survivor_id := grp.ids[1];
    loser_ids := grp.ids[2:];

    UPDATE public.jobs SET customer_id = survivor_id WHERE customer_id = ANY (loser_ids);
    UPDATE public.invoices SET customer_id = survivor_id WHERE customer_id = ANY (loser_ids);

    -- Keep an email a duplicate picked up along the way.
    UPDATE public.customers s
       SET email = coalesce(
             nullif(trim(s.email), ''),
             (SELECT nullif(trim(d.email), '')
                FROM public.customers d
               WHERE d.id = ANY (loser_ids)
                 AND nullif(trim(d.email), '') IS NOT NULL
               ORDER BY d.created_at
               LIMIT 1))
     WHERE s.id = survivor_id;

    DELETE FROM public.customers WHERE id = ANY (loser_ids);
  END LOOP;

  -- Pass 2: identical email within one pro. Runs after the phone pass so rows
  -- already folded above are gone.
  FOR grp IN
    SELECT pro_id,
           lower(trim(email)) AS contact_key,
           array_agg(id ORDER BY created_at, id) AS ids
      FROM public.customers
     WHERE nullif(trim(email), '') IS NOT NULL
     GROUP BY 1, 2
    HAVING count(*) > 1
  LOOP
    survivor_id := grp.ids[1];
    loser_ids := grp.ids[2:];

    UPDATE public.jobs SET customer_id = survivor_id WHERE customer_id = ANY (loser_ids);
    UPDATE public.invoices SET customer_id = survivor_id WHERE customer_id = ANY (loser_ids);

    -- Keep a phone a duplicate picked up along the way.
    UPDATE public.customers s
       SET phone = coalesce(
             nullif(trim(s.phone), ''),
             (SELECT nullif(trim(d.phone), '')
                FROM public.customers d
               WHERE d.id = ANY (loser_ids)
                 AND nullif(trim(d.phone), '') IS NOT NULL
               ORDER BY d.created_at
               LIMIT 1))
     WHERE s.id = survivor_id;

    DELETE FROM public.customers WHERE id = ANY (loser_ids);
  END LOOP;
END $$;
