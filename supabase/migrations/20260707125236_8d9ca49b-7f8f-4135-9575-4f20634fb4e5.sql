
CREATE OR REPLACE FUNCTION public.lookup_login_method(p_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_is_pro boolean := false;
  v_is_ho boolean := false;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN 'none';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN 'none';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.pros WHERE auth_user_id = v_user_id) INTO v_is_pro;
  SELECT EXISTS (SELECT 1 FROM public.homeowners WHERE auth_user_id = v_user_id) INTO v_is_ho;

  IF v_is_pro AND v_is_ho THEN RETURN 'both'; END IF;
  IF v_is_pro THEN RETURN 'pro'; END IF;
  IF v_is_ho THEN RETURN 'homeowner'; END IF;
  RETURN 'none';
END $$;

REVOKE ALL ON FUNCTION public.lookup_login_method(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_login_method(text) TO anon, authenticated;
