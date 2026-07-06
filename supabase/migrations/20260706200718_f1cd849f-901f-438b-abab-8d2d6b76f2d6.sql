
DROP FUNCTION IF EXISTS public.homeowner_update_home(uuid, text);

CREATE OR REPLACE FUNCTION public.homeowner_update_home(p_homeowner_id uuid, p_address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_home_id uuid;
BEGIN
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id LIMIT 1;
  IF v_home_id IS NULL THEN
    SELECT id INTO v_home_id FROM public.homes WHERE address = p_address AND claimed_by_homeowner IS NULL LIMIT 1;
    IF v_home_id IS NULL THEN
      INSERT INTO public.homes(address, claimed_by_homeowner, claimed_at)
      VALUES (p_address, p_homeowner_id, now()) RETURNING id INTO v_home_id;
    ELSE
      UPDATE public.homes SET claimed_by_homeowner = p_homeowner_id, claimed_at = now() WHERE id = v_home_id;
    END IF;
  ELSE
    UPDATE public.homes SET address = p_address WHERE id = v_home_id;
  END IF;
  RETURN v_home_id;
END $$;

GRANT EXECUTE ON FUNCTION public.homeowner_update_home(uuid, text) TO anon, authenticated;
