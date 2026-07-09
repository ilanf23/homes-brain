
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS to_pro_email text;

DROP FUNCTION IF EXISTS public.homeowner_create_invite(text, text, text);

CREATE OR REPLACE FUNCTION public.homeowner_create_invite(
  p_to_pro_name text,
  p_to_pro_phone text,
  p_to_pro_email text,
  p_trade text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ho uuid := public.my_homeowner_id();
  v_home_id uuid;
  v_inv uuid;
  v_name text := NULLIF(btrim(coalesce(p_to_pro_name,'')), '');
  v_phone text := NULLIF(btrim(coalesce(p_to_pro_phone,'')), '');
  v_email text := NULLIF(lower(btrim(coalesce(p_to_pro_email,''))), '');
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'name_required'; END IF;
  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'contact_required';
  END IF;
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = v_ho LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.invites(home_id, from_homeowner, to_pro_name, to_pro_phone, to_pro_email, trade, status)
  VALUES (v_home_id, v_ho, v_name, v_phone, v_email, NULLIF(btrim(coalesce(p_trade,'')),''), 'pending')
  RETURNING id INTO v_inv;
  RETURN v_inv;
END $function$;
