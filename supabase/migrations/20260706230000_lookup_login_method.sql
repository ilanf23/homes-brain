-- Email-first login: tells /login whether an email belongs to a pro,
-- a homeowner, both, or neither. Trade-off accepted in the 2026-07-06
-- auth redesign spec: this reveals account existence, which is standard
-- for email-first login flows.
CREATE OR REPLACE FUNCTION public.lookup_login_method(p_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_pro boolean;
  v_is_ho boolean;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN 'none';
  END IF;
  SELECT id INTO v_uid FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN 'none';
  END IF;
  v_is_pro := EXISTS (SELECT 1 FROM public.pros WHERE auth_user_id = v_uid);
  v_is_ho  := EXISTS (SELECT 1 FROM public.homeowners WHERE auth_user_id = v_uid);
  IF v_is_pro AND v_is_ho THEN RETURN 'both';
  ELSIF v_is_pro THEN RETURN 'pro';
  ELSIF v_is_ho THEN RETURN 'homeowner';
  ELSE RETURN 'none';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.lookup_login_method(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_login_method(text) TO anon, authenticated;
