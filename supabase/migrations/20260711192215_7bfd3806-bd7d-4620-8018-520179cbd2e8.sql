
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS founding_price int,
  ADD COLUMN IF NOT EXISTS standard_price int,
  ADD COLUMN IF NOT EXISTS founding_cap int;

UPDATE public.plans
  SET price_monthly = 19, founding_price = 19, standard_price = 59, founding_cap = 1000
  WHERE id = 'pro';

UPDATE public.plans
  SET founding_price = 0, standard_price = 0, founding_cap = 0
  WHERE id = 'free';

ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_price int;

CREATE OR REPLACE FUNCTION public.founding_slots()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'taken', COALESCE((SELECT count(*) FROM public.pros WHERE founding_member = true), 0),
    'cap', 1000,
    'remaining', GREATEST(0, 1000 - COALESCE((SELECT count(*) FROM public.pros WHERE founding_member = true), 0))
  )
$$;

GRANT EXECUTE ON FUNCTION public.founding_slots() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mock_set_plan(p_plan text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pro_id uuid;
  v_founding boolean;
  v_taken int;
  v_cap int := 1000;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_plan NOT IN ('free','pro') THEN RAISE EXCEPTION 'invalid_plan'; END IF;

  SELECT id, founding_member INTO v_pro_id, v_founding
    FROM public.pros WHERE auth_user_id = v_uid;
  IF v_pro_id IS NULL THEN RAISE EXCEPTION 'no_pro'; END IF;

  IF p_plan = 'pro' AND NOT v_founding THEN
    SELECT count(*) INTO v_taken FROM public.pros WHERE founding_member = true;
    IF v_taken < v_cap THEN
      UPDATE public.pros
         SET plan = 'pro', plan_status = 'active',
             plan_since = COALESCE(plan_since, now()),
             founding_member = true, locked_price = 19
       WHERE id = v_pro_id;
    ELSE
      UPDATE public.pros
         SET plan = 'pro', plan_status = 'active',
             plan_since = COALESCE(plan_since, now()),
             locked_price = COALESCE(locked_price, 59)
       WHERE id = v_pro_id;
    END IF;
  ELSE
    UPDATE public.pros
       SET plan = p_plan,
           plan_status = 'active',
           plan_since = CASE WHEN p_plan = 'pro' THEN COALESCE(plan_since, now()) ELSE plan_since END
     WHERE id = v_pro_id;
  END IF;

  RETURN p_plan;
END $function$;
