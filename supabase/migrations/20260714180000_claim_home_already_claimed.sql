-- claim_home: idempotent for the same homeowner, explicit error when the home
-- belongs to a different account. Previously the UPDATE was guarded by
-- claimed_by_homeowner IS NULL and raised nothing, so re-claiming an
-- already-claimed home "succeeded" into an account with no home and the
-- record page bounced the new homeowner to an empty dashboard.
CREATE OR REPLACE FUNCTION public.claim_home(p_record_id uuid, p_marketing_consent boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_home_id uuid; v_claimed_by uuid; v_ho_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT h.id, h.claimed_by_homeowner INTO v_home_id, v_claimed_by
    FROM public.records r JOIN public.jobs j ON j.id = r.job_id JOIN public.homes h ON h.id = j.home_id
    WHERE r.id = p_record_id;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'record_not_found'; END IF;

  v_ho_id := public.homeowner_ensure(p_marketing_consent);

  IF v_claimed_by IS NOT NULL AND v_claimed_by <> v_ho_id THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  UPDATE public.homes
     SET claimed_by_homeowner = v_ho_id, claimed_at = now()
   WHERE id = v_home_id AND claimed_by_homeowner IS NULL;
  RETURN v_ho_id;
END $$;
