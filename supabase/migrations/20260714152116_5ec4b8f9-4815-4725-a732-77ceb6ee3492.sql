CREATE OR REPLACE FUNCTION public.get_unsub_token(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
BEGIN
  IF v_email = '' THEN RAISE EXCEPTION 'email_required'; END IF;
  SELECT token INTO v_token FROM public.email_unsub_tokens WHERE email = v_email;
  IF v_token IS NOT NULL THEN RETURN v_token; END IF;
  v_token := replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  INSERT INTO public.email_unsub_tokens(token, email) VALUES (v_token, v_email)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING token INTO v_token;
  RETURN v_token;
END $function$;