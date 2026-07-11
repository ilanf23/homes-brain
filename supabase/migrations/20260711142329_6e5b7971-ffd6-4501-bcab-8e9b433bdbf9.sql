
-- Opt-out records: presence of a row with resubscribed_at IS NULL means opted out.
CREATE TABLE public.email_optouts (
  email text PRIMARY KEY,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source text,
  resubscribed_at timestamptz
);

GRANT ALL ON public.email_optouts TO service_role;
ALTER TABLE public.email_optouts ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: service role only via edge functions.

-- Stable opaque unsubscribe tokens (one per email).
CREATE TABLE public.email_unsub_tokens (
  token text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_unsub_tokens TO service_role;
ALTER TABLE public.email_unsub_tokens ENABLE ROW LEVEL SECURITY;
-- No public policies.

-- Returns existing token or mints one. SECURITY DEFINER so service-role
-- callers (and edge functions) can call it without extra grants.
CREATE OR REPLACE FUNCTION public.get_unsub_token(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
BEGIN
  IF v_email = '' THEN RAISE EXCEPTION 'email_required'; END IF;
  SELECT token INTO v_token FROM public.email_unsub_tokens WHERE email = v_email;
  IF v_token IS NOT NULL THEN RETURN v_token; END IF;
  v_token := replace(encode(gen_random_bytes(32), 'base64'), '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  INSERT INTO public.email_unsub_tokens(token, email) VALUES (v_token, v_email)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING token INTO v_token;
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.is_email_opted_out(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_optouts
    WHERE email = lower(btrim(coalesce(p_email, '')))
      AND resubscribed_at IS NULL
  )
$$;
