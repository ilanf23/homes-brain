-- Homeowner setup completion: wizard completion stamp + contact confirmation.
-- setup_completed_at is the single source of truth for "finished /home/setup".
ALTER TABLE public.homeowners
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

-- Homeowner confirms ownership of the contact info a pro entered for them.
-- Stamps consent_at once; idempotent on repeat calls.
CREATE OR REPLACE FUNCTION public.homeowner_confirm_contact()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.homeowners
     SET consent_at = COALESCE(consent_at, now())
   WHERE id = v_ho;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_complete_setup()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.homeowners
     SET setup_completed_at = COALESCE(setup_completed_at, now())
   WHERE id = v_ho;
END $$;

REVOKE ALL ON FUNCTION public.homeowner_confirm_contact() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.homeowner_complete_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.homeowner_confirm_contact() TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_complete_setup() TO authenticated;
