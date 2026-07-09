CREATE OR REPLACE FUNCTION public.pro_ensure(p_first_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT id INTO v_id FROM public.pros WHERE auth_user_id = v_uid LIMIT 1;
  IF v_id IS NOT NULL THEN
    IF p_first_name IS NOT NULL AND length(btrim(p_first_name)) > 0 THEN
      UPDATE public.pros
        SET owner_first_name = COALESCE(NULLIF(btrim(owner_first_name), ''), btrim(p_first_name))
        WHERE id = v_id;
    END IF;
    RETURN v_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.pros (auth_user_id, email, owner_first_name, plan)
  VALUES (
    v_uid,
    v_email,
    NULLIF(btrim(COALESCE(p_first_name, '')), ''),
    'free'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.pro_ensure(text) TO authenticated;