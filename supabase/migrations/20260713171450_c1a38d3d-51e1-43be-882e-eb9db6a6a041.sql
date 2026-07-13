
CREATE TABLE IF NOT EXISTS public.sms_optouts (
  phone text PRIMARY KEY,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  resubscribed_at timestamptz
);

GRANT ALL ON public.sms_optouts TO service_role;

ALTER TABLE public.sms_optouts ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: service role only.

CREATE OR REPLACE FUNCTION public.is_sms_opted_out(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sms_optouts
    WHERE phone = p_phone
      AND resubscribed_at IS NULL
  )
$$;
