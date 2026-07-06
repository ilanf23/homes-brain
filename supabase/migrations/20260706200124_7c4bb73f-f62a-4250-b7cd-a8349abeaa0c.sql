
-- ============================================================================
-- 1. WIPE TEST DATA (order respects FKs)
-- ============================================================================
TRUNCATE TABLE public.records, public.jobs, public.equipment, public.customers,
               public.invites, public.messages, public.events,
               public.homes, public.homeowners, public.pros RESTART IDENTITY CASCADE;

-- ============================================================================
-- 2. DROP OPEN POLICIES (the security hole)
-- ============================================================================
DROP POLICY IF EXISTS "Public can view customers (v0)"      ON public.customers;
DROP POLICY IF EXISTS "Public can view homeowners (v0)"     ON public.homeowners;
DROP POLICY IF EXISTS "Public can view invites (v0)"        ON public.invites;
DROP POLICY IF EXISTS "Anyone can view homes"               ON public.homes;
DROP POLICY IF EXISTS "Anyone can view jobs"                ON public.jobs;
DROP POLICY IF EXISTS "Anyone can view equipment"           ON public.equipment;
DROP POLICY IF EXISTS "Anyone can view records"             ON public.records;
DROP POLICY IF EXISTS "Anyone can view pros"                ON public.pros;
DROP POLICY IF EXISTS "Anon can create home (v0)"           ON public.homes;
DROP POLICY IF EXISTS "Anon can create homeowner (v0)"      ON public.homeowners;
DROP POLICY IF EXISTS "Anyone can claim unclaimed homes"    ON public.homes;
DROP POLICY IF EXISTS "Anon can insert equipment (v0)"      ON public.equipment;
DROP POLICY IF EXISTS "Anon can update equipment (v0)"      ON public.equipment;
DROP POLICY IF EXISTS "Anon can delete equipment (v0)"      ON public.equipment;
DROP POLICY IF EXISTS "Anyone can mark viewed"              ON public.records;

-- ============================================================================
-- 3. AUTH TRIGGER: on new pro auth signup, create pros row from metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_pro_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', '');
BEGIN
  IF v_role = 'pro' THEN
    INSERT INTO public.pros (auth_user_id, business, trade, service_area, email, plan,
                             google_place_id, google_rating, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business', 'My business'),
      COALESCE(NEW.raw_user_meta_data->>'trade', 'other'),
      NEW.raw_user_meta_data->>'service_area',
      NEW.email,
      'free',
      NEW.raw_user_meta_data->>'google_place_id',
      NULLIF(NEW.raw_user_meta_data->>'google_rating','')::numeric,
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_pro ON auth.users;
CREATE TRIGGER on_auth_user_created_pro
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_pro_signup();

-- ============================================================================
-- 4. AUTHENTICATED PRO SELECT POLICIES (scoped)
-- ============================================================================

-- pros: see own row (used by dashboard). Public info is served via RPCs.
CREATE POLICY "Pros can view own row"
  ON public.pros FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- customers/jobs/homes already have scoped policies from earlier migrations.
-- Verify and (re)add SELECT for the scoped pro:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customers' AND policyname='Pros view own customers') THEN
    CREATE POLICY "Pros view own customers" ON public.customers FOR SELECT TO authenticated
      USING (pro_id = public.my_pro_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='Pros view own jobs') THEN
    CREATE POLICY "Pros view own jobs" ON public.jobs FOR SELECT TO authenticated
      USING (pro_id = public.my_pro_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homes' AND policyname='Pros view homes they created') THEN
    CREATE POLICY "Pros view homes they created" ON public.homes FOR SELECT TO authenticated
      USING (created_by_pro = public.my_pro_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='records' AND policyname='Pros view own records') THEN
    CREATE POLICY "Pros view own records" ON public.records FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = records.job_id AND j.pro_id = public.my_pro_id()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='equipment' AND policyname='Pros view equipment on their homes') THEN
    CREATE POLICY "Pros view equipment on their homes" ON public.equipment FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.homes h WHERE h.id = equipment.home_id AND h.created_by_pro = public.my_pro_id()));
  END IF;
END $$;

-- ============================================================================
-- 5. PUBLIC / HOMEOWNER RPCs (security definer, granted to anon+authenticated)
-- ============================================================================

-- Public record view for /r/:id
CREATE OR REPLACE FUNCTION public.get_public_record(p_record_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT json_build_object(
    'id', r.id,
    'viewed_at', r.viewed_at,
    'created_at', r.created_at,
    'job', json_build_object(
      'what_done', j.what_done,
      'next_service_date', j.next_service_date,
      'created_at', j.created_at,
      'pro', (SELECT json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                       'google_rating',p.google_rating,'google_place_id',p.google_place_id,
                                       'logo',p.logo)
                FROM public.pros p WHERE p.id = j.pro_id),
      'home', (SELECT json_build_object('id',h.id,'address',h.address,
                                        'claimed_by_homeowner',h.claimed_by_homeowner)
                 FROM public.homes h WHERE h.id = j.home_id),
      'equipment', (SELECT json_build_object('type',e.type,'make',e.make,'model',e.model,
                                             'warranty_until',e.warranty_until,'recall_status',e.recall_status)
                      FROM public.equipment e WHERE e.id = j.equipment_id),
      'customer', (SELECT json_build_object('name',c.name)
                     FROM public.customers c WHERE c.id = j.customer_id)
    )
  )
  FROM public.records r JOIN public.jobs j ON j.id = r.job_id
  WHERE r.id = p_record_id
$$;

CREATE OR REPLACE FUNCTION public.mark_record_viewed(p_record_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.records SET viewed_at = now()
  WHERE id = p_record_id AND viewed_at IS NULL;
$$;

-- Claim: create homeowner + link to home (returns homeowner_id)
CREATE OR REPLACE FUNCTION public.claim_home(p_record_id uuid, p_contact text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_home_id uuid; v_ho_id uuid; v_is_email boolean;
BEGIN
  SELECT h.id INTO v_home_id
    FROM public.records r JOIN public.jobs j ON j.id = r.job_id JOIN public.homes h ON h.id = j.home_id
    WHERE r.id = p_record_id;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'record_not_found'; END IF;

  v_is_email := position('@' in p_contact) > 0;
  INSERT INTO public.homeowners(email, phone)
  VALUES (CASE WHEN v_is_email THEN p_contact END,
          CASE WHEN v_is_email THEN NULL ELSE p_contact END)
  RETURNING id INTO v_ho_id;

  UPDATE public.homes
     SET claimed_by_homeowner = v_ho_id, claimed_at = now()
   WHERE id = v_home_id AND claimed_by_homeowner IS NULL;

  RETURN v_ho_id;
END $$;

-- Homeowner self-signup with address (for /home/signup)
CREATE OR REPLACE FUNCTION public.homeowner_signup(p_contact text, p_address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ho_id uuid; v_home_id uuid; v_is_email boolean;
BEGIN
  v_is_email := position('@' in p_contact) > 0;
  INSERT INTO public.homeowners(email, phone)
  VALUES (CASE WHEN v_is_email THEN p_contact END,
          CASE WHEN v_is_email THEN NULL ELSE p_contact END)
  RETURNING id INTO v_ho_id;

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

-- Homeowner login lookup by contact
CREATE OR REPLACE FUNCTION public.get_homeowner_by_contact(p_contact text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT json_build_object(
    'id', h.id,
    'address', (SELECT hm.address FROM public.homes hm WHERE hm.claimed_by_homeowner = h.id LIMIT 1)
  )
  FROM public.homeowners h
  WHERE (position('@' in p_contact) > 0 AND h.email = p_contact)
     OR (position('@' in p_contact) = 0 AND h.phone = p_contact)
  ORDER BY h.created_at DESC LIMIT 1
$$;

-- Home view: homeowner + home + equipment + jobs + pros
CREATE OR REPLACE FUNCTION public.get_home_view(p_homeowner_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH h AS (SELECT * FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id LIMIT 1)
  SELECT json_build_object(
    'homeowner', (SELECT row_to_json(ho) FROM public.homeowners ho WHERE ho.id = p_homeowner_id),
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
$$;

-- ---- Homeowner write RPCs (v0 mock-auth: trust p_homeowner_id until real homeowner auth) ----
CREATE OR REPLACE FUNCTION public.homeowner_update_home(p_homeowner_id uuid, p_address text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.homes SET address = p_address
   WHERE claimed_by_homeowner = p_homeowner_id;
$$;

CREATE OR REPLACE FUNCTION public.homeowner_update_profile(
  p_homeowner_id uuid, p_name text DEFAULT NULL, p_email text DEFAULT NULL, p_phone text DEFAULT NULL,
  p_notify_email boolean DEFAULT NULL, p_notify_sms boolean DEFAULT NULL,
  p_sms_opt_out boolean DEFAULT NULL, p_respect_quiet_hrs boolean DEFAULT NULL,
  p_marketing_consent boolean DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.homeowners SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    notify_email = COALESCE(p_notify_email, notify_email),
    notify_sms = COALESCE(p_notify_sms, notify_sms),
    sms_opt_out = COALESCE(p_sms_opt_out, sms_opt_out),
    respect_quiet_hrs = COALESCE(p_respect_quiet_hrs, respect_quiet_hrs),
    marketing_consent = COALESCE(p_marketing_consent, marketing_consent)
  WHERE id = p_homeowner_id;
$$;

CREATE OR REPLACE FUNCTION public.homeowner_add_equipment(
  p_homeowner_id uuid, p_type text, p_make text, p_model text, p_serial text,
  p_warranty_until date, p_source text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_home_id uuid; v_eq_id uuid;
BEGIN
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.equipment(home_id, type, make, model, serial, warranty_until, source, recall_status)
  VALUES (v_home_id, p_type, p_make, p_model, p_serial, p_warranty_until, COALESCE(p_source,'homeowner'), 'unknown')
  RETURNING id INTO v_eq_id;
  RETURN v_eq_id;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_update_equipment(
  p_homeowner_id uuid, p_equipment_id uuid,
  p_type text DEFAULT NULL, p_make text DEFAULT NULL, p_model text DEFAULT NULL,
  p_serial text DEFAULT NULL, p_warranty_until date DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.equipment e SET
    type = COALESCE(p_type, e.type),
    make = COALESCE(p_make, e.make),
    model = COALESCE(p_model, e.model),
    serial = COALESCE(p_serial, e.serial),
    warranty_until = COALESCE(p_warranty_until, e.warranty_until)
  WHERE e.id = p_equipment_id
    AND e.home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id);
$$;

CREATE OR REPLACE FUNCTION public.homeowner_delete_equipment(p_homeowner_id uuid, p_equipment_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM public.equipment
   WHERE id = p_equipment_id
     AND home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id);
$$;

CREATE OR REPLACE FUNCTION public.homeowner_create_invite(
  p_homeowner_id uuid, p_to_pro_name text, p_to_pro_phone text, p_trade text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_home_id uuid; v_inv_id uuid;
BEGIN
  SELECT id INTO v_home_id FROM public.homes WHERE claimed_by_homeowner = p_homeowner_id LIMIT 1;
  IF v_home_id IS NULL THEN RAISE EXCEPTION 'no_home'; END IF;
  INSERT INTO public.invites(home_id, from_homeowner, to_pro_name, to_pro_phone, trade, status)
  VALUES (v_home_id, p_homeowner_id, p_to_pro_name, p_to_pro_phone, p_trade, 'pending')
  RETURNING id INTO v_inv_id;
  RETURN v_inv_id;
END $$;

-- Public pro profile lookup (for future /pro/:city/:trade/:business route)
CREATE OR REPLACE FUNCTION public.get_public_pro_profile(p_business text, p_trade text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT json_build_object(
    'id',p.id,'business',p.business,'trade',p.trade,'service_area',p.service_area,
    'logo',p.logo,'google_rating',p.google_rating,'google_place_id',p.google_place_id
  ) FROM public.pros p
  WHERE lower(p.business) = lower(p_business) AND p.trade = p_trade
  LIMIT 1
$$;

-- ============================================================================
-- 6. GRANTS on RPCs
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_public_record(uuid)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_record_viewed(uuid)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_home(uuid, text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_signup(text, text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_homeowner_by_contact(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_view(uuid)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_home(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_profile(uuid,text,text,text,boolean,boolean,boolean,boolean,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_add_equipment(uuid,text,text,text,text,date,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_update_equipment(uuid,uuid,text,text,text,text,date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_delete_equipment(uuid,uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_create_invite(uuid,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_pro_profile(text,text) TO anon, authenticated;
