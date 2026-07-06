
-- 1. Clean unlinked mock homeowners + their claim/equipment links
UPDATE public.homes h SET claimed_by_homeowner = NULL, claimed_at = NULL
  WHERE claimed_by_homeowner IN (SELECT id FROM public.homeowners WHERE auth_user_id IS NULL);
DELETE FROM public.invites WHERE from_homeowner IN (SELECT id FROM public.homeowners WHERE auth_user_id IS NULL);
DELETE FROM public.homeowners WHERE auth_user_id IS NULL;

-- 2. Consent timestamp
ALTER TABLE public.homeowners ADD COLUMN IF NOT EXISTS consent_at timestamptz;
ALTER TABLE public.homeowners ADD CONSTRAINT homeowners_auth_user_id_unique UNIQUE (auth_user_id);

-- 3. Drop insecure/legacy fns
DROP FUNCTION IF EXISTS public.get_homeowner_by_contact(text);
DROP FUNCTION IF EXISTS public.claim_home(uuid, text);
DROP FUNCTION IF EXISTS public.homeowner_signup(text, text);
DROP FUNCTION IF EXISTS public.get_home_view(uuid);
DROP FUNCTION IF EXISTS public.homeowner_update_home(uuid, text);
DROP FUNCTION IF EXISTS public.homeowner_update_profile(uuid, text, text, text, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.homeowner_add_equipment(uuid, text, text, text, text, date, text);
DROP FUNCTION IF EXISTS public.homeowner_update_equipment(uuid, uuid, text, text, text, text, date);
DROP FUNCTION IF EXISTS public.homeowner_delete_equipment(uuid, uuid);
DROP FUNCTION IF EXISTS public.homeowner_create_invite(uuid, text, text, text);

-- 4. Ensure-or-create the homeowner row for the signed-in auth user
CREATE OR REPLACE FUNCTION public.homeowner_ensure(p_marketing_consent boolean DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_id FROM public.homeowners WHERE auth_user_id = v_uid LIMIT 1;
  IF v_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    INSERT INTO public.homeowners(auth_user_id, email, marketing_consent, consent_at)
    VALUES (v_uid, v_email, COALESCE(p_marketing_consent, false), CASE WHEN p_marketing_consent THEN now() ELSE NULL END)
    RETURNING id INTO v_id;
  ELSIF p_marketing_consent IS TRUE THEN
    UPDATE public.homeowners SET marketing_consent = true, consent_at = COALESCE(consent_at, now())
      WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

-- 5. Claim: no contact param, must be authenticated
CREATE OR REPLACE FUNCTION public.claim_home(p_record_id uuid, p_marketing_consent boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_home_id uuid; v_ho_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT h.id INTO v_home_id
    FROM public.records r JOIN public.jobs j ON j.id = r.job_id JOIN public.homes h ON h.id = j.home_id
    WHERE r.id = p_record_id;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'record_not_found'; END IF;

  v_ho_id := public.homeowner_ensure(p_marketing_consent);

  UPDATE public.homes
     SET claimed_by_homeowner = v_ho_id, claimed_at = now()
   WHERE id = v_home_id AND claimed_by_homeowner IS NULL;
  RETURN v_ho_id;
END $$;

-- 6. Signup: no contact param; creates homeowner + optional home
CREATE OR REPLACE FUNCTION public.homeowner_signup(p_address text DEFAULT NULL, p_marketing_consent boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho_id uuid; v_home_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_ho_id := public.homeowner_ensure(p_marketing_consent);

  IF p_address IS NOT NULL AND length(trim(p_address)) > 0 THEN
    SELECT id INTO v_home_id FROM public.homes WHERE address = p_address;
    IF v_home_id IS NULL THEN
      INSERT INTO public.homes(address, claimed_by_homeowner, claimed_at)
      VALUES (p_address, v_ho_id, now()) RETURNING id INTO v_home_id;
    ELSIF (SELECT claimed_by_homeowner FROM public.homes WHERE id = v_home_id) IS NULL THEN
      UPDATE public.homes SET claimed_by_homeowner = v_ho_id, claimed_at = now() WHERE id = v_home_id;
    END IF;
  END IF;
  RETURN v_ho_id;
END $$;

-- 7. Home view: no param, uses my_homeowner_id
CREATE OR REPLACE FUNCTION public.get_home_view()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho_id uuid := public.my_homeowner_id();
BEGIN
  IF v_ho_id IS NULL THEN
    -- Auto-create on first authenticated view (magic-link login without prior signup)
    IF auth.uid() IS NOT NULL THEN v_ho_id := public.homeowner_ensure(NULL); END IF;
  END IF;
  IF v_ho_id IS NULL THEN RETURN NULL; END IF;

  RETURN (
    WITH h AS (SELECT * FROM public.homes WHERE claimed_by_homeowner = v_ho_id LIMIT 1)
    SELECT json_build_object(
      'homeowner', (SELECT row_to_json(ho) FROM public.homeowners ho WHERE ho.id = v_ho_id),
      'home',      (SELECT row_to_json(h) FROM h),
      'equipment', COALESCE((SELECT json_agg(row_to_json(e) ORDER BY e.created_at DESC)
                               FROM public.equipment e WHERE e.home_id = (SELECT id FROM h)), '[]'::json),
      'jobs',      COALESCE((SELECT json_agg(row_to_json(j) ORDER BY j.created_at DESC)
                               FROM public.jobs j WHERE j.home_id = (SELECT id FROM h)), '[]'::json),
      'pros',      COALESCE((SELECT json_agg(json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                                                'logo',p.logo,'google_rating',p.google_rating))
                               FROM public.pros p
                               WHERE p.id IN (SELECT DISTINCT pro_id FROM public.jobs WHERE home_id = (SELECT id FROM h))),
                            '[]'::json),
      'invites',   COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.created_at DESC)
                               FROM public.invites i WHERE i.home_id = (SELECT id FROM h)), '[]'::json),
      'records',   COALESCE((SELECT json_agg(json_build_object('id',r.id,'public_url',r.public_url,'viewed_at',r.viewed_at,'created_at',r.created_at,'job_id',r.job_id))
                               FROM public.records r JOIN public.jobs j ON j.id = r.job_id WHERE j.home_id = (SELECT id FROM h)), '[]'::json)
    )
  );
END $$;

-- 8. Auth-scoped homeowner mutations
CREATE OR REPLACE FUNCTION public.homeowner_update_home(p_address text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id(); v_home_id uuid;
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = v_ho LIMIT 1;
  IF v_home_id IS NULL THEN
    SELECT id INTO v_home_id FROM public.homes WHERE address = p_address AND claimed_by_homeowner IS NULL LIMIT 1;
    IF v_home_id IS NULL THEN
      INSERT INTO public.homes(address, claimed_by_homeowner, claimed_at)
      VALUES (p_address, v_ho, now()) RETURNING id INTO v_home_id;
    ELSE
      UPDATE public.homes SET claimed_by_homeowner = v_ho, claimed_at = now() WHERE id = v_home_id;
    END IF;
  ELSE
    UPDATE public.homes SET address = p_address WHERE id = v_home_id;
  END IF;
  RETURN v_home_id;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_update_profile(
  p_name text DEFAULT NULL, p_email text DEFAULT NULL, p_phone text DEFAULT NULL,
  p_notify_email boolean DEFAULT NULL, p_notify_sms boolean DEFAULT NULL,
  p_sms_opt_out boolean DEFAULT NULL, p_respect_quiet_hrs boolean DEFAULT NULL,
  p_marketing_consent boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    consent_at = CASE WHEN p_marketing_consent IS TRUE AND consent_at IS NULL THEN now() ELSE consent_at END
  WHERE id = v_ho;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_add_equipment(
  p_type text, p_make text, p_model text, p_serial text, p_warranty_until date, p_source text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id(); v_home_id uuid; v_eq_id uuid;
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = v_ho LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.equipment(home_id, type, make, model, serial, warranty_until, source, recall_status)
  VALUES (v_home_id, p_type, p_make, p_model, p_serial, p_warranty_until, COALESCE(p_source,'homeowner'), 'unknown')
  RETURNING id INTO v_eq_id;
  RETURN v_eq_id;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_update_equipment(
  p_equipment_id uuid, p_type text DEFAULT NULL, p_make text DEFAULT NULL,
  p_model text DEFAULT NULL, p_serial text DEFAULT NULL, p_warranty_until date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.equipment e SET
    type = COALESCE(p_type, e.type),
    make = COALESCE(p_make, e.make),
    model = COALESCE(p_model, e.model),
    serial = COALESCE(p_serial, e.serial),
    warranty_until = COALESCE(p_warranty_until, e.warranty_until)
  WHERE e.id = p_equipment_id
    AND e.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = v_ho);
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_delete_equipment(p_equipment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  DELETE FROM public.equipment
   WHERE id = p_equipment_id
     AND home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = v_ho);
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_create_invite(
  p_to_pro_name text, p_to_pro_phone text, p_trade text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id(); v_home_id uuid; v_inv uuid;
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = v_ho LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.invites(home_id, from_homeowner, to_pro_name, to_pro_phone, trade, status)
  VALUES (v_home_id, v_ho, p_to_pro_name, p_to_pro_phone, p_trade, 'pending')
  RETURNING id INTO v_inv;
  RETURN v_inv;
END $$;

-- 9. Grants: authenticated only for privileged fns; keep public read via existing get_public_record/mark_record_viewed
REVOKE ALL ON FUNCTION public.homeowner_ensure(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_home(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_signup(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_home_view() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_update_home(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_update_profile(text, text, text, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_add_equipment(text, text, text, text, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_update_equipment(uuid, text, text, text, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_delete_equipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.homeowner_create_invite(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.homeowner_ensure(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_home(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_signup(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_view() TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_home(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_profile(text, text, text, boolean, boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_add_equipment(text, text, text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_equipment(uuid, text, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_delete_equipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_create_invite(text, text, text) TO authenticated;
