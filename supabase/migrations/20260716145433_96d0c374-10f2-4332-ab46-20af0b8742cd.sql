CREATE OR REPLACE FUNCTION public.lookup_login_context(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_is_pro boolean := false;
  v_is_ho  boolean := false;
  v_has_pw boolean := false;
  v_method text := 'none';
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('method', 'none', 'has_password', false);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.pros       WHERE lower(btrim(email)) = v_email) INTO v_is_pro;
  SELECT EXISTS (SELECT 1 FROM public.homeowners WHERE lower(btrim(email)) = v_email) INTO v_is_ho;

  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(btrim(email)) = v_email
      AND encrypted_password IS NOT NULL
      AND encrypted_password <> ''
  ) INTO v_has_pw;

  IF v_is_pro AND v_is_ho THEN v_method := 'both';
  ELSIF v_is_pro THEN v_method := 'pro';
  ELSIF v_is_ho THEN v_method := 'homeowner';
  END IF;

  RETURN jsonb_build_object('method', v_method, 'has_password', v_has_pw);
END
$$;

REVOKE ALL ON FUNCTION public.lookup_login_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_login_context(text) TO anon, authenticated;