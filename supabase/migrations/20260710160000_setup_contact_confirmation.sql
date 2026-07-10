-- Setup contact confirmation: backfill pre-wizard homeowners, split the
-- contact-confirmation timestamp out of consent_at (marketing-only), and
-- replace the two-call update+confirm sequence with one atomic RPC.

-- 1. Backfill: every homeowner row that existed before the wizard shipped
-- must not be forced through /home/setup.
UPDATE public.homeowners
   SET setup_completed_at = now()
 WHERE setup_completed_at IS NULL;

-- 2. contact_confirmed_at is distinct from consent_at (marketing consent).
ALTER TABLE public.homeowners
  ADD COLUMN IF NOT EXISTS contact_confirmed_at timestamptz;

-- 3. Single atomic RPC for the wizard's contact step: sets phone/email
-- verbatim (no COALESCE, so a blank clears a wrong pro-typed value),
-- stamps contact_confirmed_at, and only stamps consent_at when the
-- homeowner actually opts into marketing.
CREATE OR REPLACE FUNCTION public.homeowner_setup_contact(
  p_phone text DEFAULT NULL, p_email text DEFAULT NULL,
  p_notify_sms boolean DEFAULT NULL, p_notify_email boolean DEFAULT NULL,
  p_marketing_consent boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ho uuid := public.my_homeowner_id();
  v_phone text := NULLIF(btrim(p_phone), '');
  v_email text := NULLIF(btrim(p_email), '');
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'contact_required';
  END IF;

  UPDATE public.homeowners SET
    phone = v_phone,
    email = v_email,
    notify_sms = COALESCE(p_notify_sms, notify_sms),
    notify_email = COALESCE(p_notify_email, notify_email),
    contact_confirmed_at = now(),
    consent_at = CASE WHEN p_marketing_consent IS TRUE THEN COALESCE(consent_at, now()) ELSE consent_at END
  WHERE id = v_ho;
END $$;

REVOKE ALL ON FUNCTION public.homeowner_setup_contact(text, text, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.homeowner_setup_contact(text, text, boolean, boolean, boolean) TO authenticated;

-- 4. Replaced by homeowner_setup_contact above.
DROP FUNCTION IF EXISTS public.homeowner_confirm_contact();
