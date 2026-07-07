CREATE OR REPLACE FUNCTION public.upsert_home_by_address(p_address text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro uuid := public.my_pro_id();
  v_id uuid;
BEGIN
  IF v_pro IS NULL THEN
    RAISE EXCEPTION 'not a pro';
  END IF;
  IF p_address IS NULL OR length(btrim(p_address)) = 0 THEN
    RAISE EXCEPTION 'address required';
  END IF;

  SELECT id INTO v_id FROM public.homes WHERE address = p_address LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.homes (address, created_by_pro)
  VALUES (p_address, v_pro)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_home_by_address(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_home_by_address(text) TO authenticated;