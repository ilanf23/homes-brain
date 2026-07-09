-- Auto-fill homeowner name/phone from matching customer row on first sign-in.
-- Runs when a magic-link callback creates the homeowner. Never overwrites
-- values the homeowner has already set themselves (only fills nulls).
CREATE OR REPLACE FUNCTION public.homeowner_ensure(p_marketing_consent boolean DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
  v_cust record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_id FROM public.homeowners WHERE auth_user_id = v_uid LIMIT 1;
  IF v_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    -- Pull the most recent customer row a pro created for this email, so
    -- the homeowner's profile is prefilled with the name/phone the pro
    -- already captured (with consent).
    SELECT name, phone INTO v_cust
      FROM public.customers
      WHERE v_email IS NOT NULL AND lower(btrim(email)) = lower(btrim(v_email))
      ORDER BY created_at DESC
      LIMIT 1;
    INSERT INTO public.homeowners(auth_user_id, email, name, phone, marketing_consent, consent_at)
    VALUES (
      v_uid,
      v_email,
      NULLIF(btrim(COALESCE(v_cust.name, '')), ''),
      NULLIF(btrim(COALESCE(v_cust.phone, '')), ''),
      COALESCE(p_marketing_consent, false),
      CASE WHEN p_marketing_consent THEN now() ELSE NULL END
    )
    RETURNING id INTO v_id;
  ELSIF p_marketing_consent IS TRUE THEN
    UPDATE public.homeowners SET marketing_consent = true, consent_at = COALESCE(consent_at, now())
      WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;