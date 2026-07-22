
ALTER TABLE public.homeowners
  ADD COLUMN IF NOT EXISTS promo_sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_sms_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.homeowner_update_profile(
  p_name text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_notify_email boolean DEFAULT NULL::boolean,
  p_notify_sms boolean DEFAULT NULL::boolean,
  p_sms_opt_out boolean DEFAULT NULL::boolean,
  p_respect_quiet_hrs boolean DEFAULT NULL::boolean,
  p_marketing_consent boolean DEFAULT NULL::boolean,
  p_promo_sms_consent boolean DEFAULT NULL::boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.homeowners SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    notify_email = COALESCE(p_notify_email, notify_email),
    notify_sms = COALESCE(p_notify_sms, notify_sms),
    sms_opt_out = COALESCE(p_sms_opt_out, sms_opt_out),
    respect_quiet_hrs = COALESCE(p_respect_quiet_hrs, respect_quiet_hrs),
    marketing_consent = COALESCE(p_marketing_consent, marketing_consent),
    consent_at = CASE WHEN p_marketing_consent IS TRUE AND consent_at IS NULL THEN now() ELSE consent_at END,
    promo_sms_consent = COALESCE(p_promo_sms_consent, promo_sms_consent),
    promo_sms_consent_at = CASE
      WHEN p_promo_sms_consent IS TRUE THEN COALESCE(promo_sms_consent_at, now())
      WHEN p_promo_sms_consent IS FALSE THEN NULL
      ELSE promo_sms_consent_at
    END
  WHERE id = v_ho;
END $function$;
