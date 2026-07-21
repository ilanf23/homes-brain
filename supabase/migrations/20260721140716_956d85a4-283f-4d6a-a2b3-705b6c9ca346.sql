
DO $$
DECLARE
  v_user_id uuid;
  v_pro_id uuid;
  v_home1 uuid; v_home2 uuid; v_home3 uuid; v_home4 uuid;
  v_cust1 uuid; v_cust2 uuid; v_cust3 uuid; v_cust4 uuid;
  v_eq1 uuid; v_eq2 uuid; v_eq3 uuid;
  v_job1 uuid; v_job2 uuid; v_job3 uuid; v_job4 uuid; v_job5 uuid;
BEGIN
  -- Bail if already seeded (idempotent).
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'appreview@homesbrain.com') THEN
    RETURN;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    'appreview@homesbrain.com', crypt('468135', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"App","last_name":"Reviewer"}'::jsonb,
    now(), now(), '', '', '', '', false, false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'appreview@homesbrain.com', 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Pro business
  v_pro_id := gen_random_uuid();
  INSERT INTO public.pros (
    id, business, trade, trades, service_area, email, phone, plan,
    auth_user_id, owner_first_name, welcomed_at, created_at
  ) VALUES (
    v_pro_id, 'HomesBrain Demo', 'Plumbing', ARRAY['Plumbing'],
    'Austin, TX', 'appreview@homesbrain.com', '+15125550100', 'free',
    v_user_id, 'App', now(), now()
  );

  -- Homes
  v_home1 := gen_random_uuid();
  v_home2 := gen_random_uuid();
  v_home3 := gen_random_uuid();
  v_home4 := gen_random_uuid();
  INSERT INTO public.homes (id, address, created_by_pro, created_at) VALUES
    (v_home1, '1420 Cedar Bend Dr, Austin, TX 78758', v_pro_id, now() - interval '120 days'),
    (v_home2, '512 Barton Springs Rd, Austin, TX 78704', v_pro_id, now() - interval '95 days'),
    (v_home3, '2201 Manor Rd, Austin, TX 78722', v_pro_id, now() - interval '60 days'),
    (v_home4, '805 W 12th St, Austin, TX 78701', v_pro_id, now() - interval '30 days');

  -- Customers
  v_cust1 := gen_random_uuid();
  v_cust2 := gen_random_uuid();
  v_cust3 := gen_random_uuid();
  v_cust4 := gen_random_uuid();
  INSERT INTO public.customers (id, pro_id, home_id, name, phone, email, consent_at, consent_ref, created_at) VALUES
    (v_cust1, v_pro_id, v_home1, 'Sarah Martinez', '+15125550111', 'sarah.demo@example.com', now() - interval '120 days', 'demo-seed', now() - interval '120 days'),
    (v_cust2, v_pro_id, v_home2, 'James Chen',    '+15125550122', 'james.demo@example.com', now() - interval '95 days',  'demo-seed', now() - interval '95 days'),
    (v_cust3, v_pro_id, v_home3, 'Priya Patel',   '+15125550133', 'priya.demo@example.com', now() - interval '60 days',  'demo-seed', now() - interval '60 days'),
    (v_cust4, v_pro_id, v_home4, 'Michael Brooks','+15125550144', 'michael.demo@example.com', now() - interval '30 days','demo-seed', now() - interval '30 days');

  -- Equipment
  v_eq1 := gen_random_uuid();
  v_eq2 := gen_random_uuid();
  v_eq3 := gen_random_uuid();
  INSERT INTO public.equipment (id, home_id, type, make, model, serial, source, created_at, updated_at) VALUES
    (v_eq1, v_home1, 'Water Heater', 'Rheem',   'XE50T10H45U0', 'RH50-2024-8812', 'pro', now() - interval '120 days', now() - interval '120 days'),
    (v_eq2, v_home2, 'Water Softener','Kinetico','Premier S250', 'KIN-25-77201',   'pro', now() - interval '95 days',  now() - interval '95 days'),
    (v_eq3, v_home3, 'Tankless Water Heater','Navien','NPE-240A2','NAV-24-31910',  'pro', now() - interval '60 days',  now() - interval '60 days');

  -- Jobs (mix of past & upcoming next_service_date so "What's Next" is populated)
  v_job1 := gen_random_uuid();
  v_job2 := gen_random_uuid();
  v_job3 := gen_random_uuid();
  v_job4 := gen_random_uuid();
  v_job5 := gen_random_uuid();
  INSERT INTO public.jobs (id, pro_id, home_id, customer_id, equipment_id, what_done, next_service_date, created_at) VALUES
    (v_job1, v_pro_id, v_home1, v_cust1, v_eq1,  'Flushed 50 gal water heater, replaced anode rod, tested T&P valve.', (current_date + 335)::date, now() - interval '120 days'),
    (v_job2, v_pro_id, v_home2, v_cust2, v_eq2,  'Rebuilt water softener bypass, refilled brine tank with 4 bags of salt.', (current_date + 7)::date, now() - interval '95 days'),
    (v_job3, v_pro_id, v_home3, v_cust3, v_eq3,  'Descaled tankless heater, cleaned inlet filter, updated firmware.', (current_date + 14)::date, now() - interval '60 days'),
    (v_job4, v_pro_id, v_home4, v_cust4, NULL,   'Cleared main line clog with hydro jetter, ran camera inspection.', (current_date + 90)::date, now() - interval '30 days'),
    (v_job5, v_pro_id, v_home1, v_cust1, NULL,   'Replaced kitchen faucet cartridge, sealed base with fresh silicone.', NULL, now() - interval '10 days');

  -- Records
  INSERT INTO public.records (id, job_id, public_url, sent_email_at, viewed_at, created_at) VALUES
    (gen_random_uuid(), v_job1, 'https://homesbrain.com/r/demo-1', now() - interval '120 days', now() - interval '119 days', now() - interval '120 days'),
    (gen_random_uuid(), v_job2, 'https://homesbrain.com/r/demo-2', now() - interval '95 days',  now() - interval '94 days',  now() - interval '95 days'),
    (gen_random_uuid(), v_job3, 'https://homesbrain.com/r/demo-3', now() - interval '60 days',  now() - interval '59 days',  now() - interval '60 days'),
    (gen_random_uuid(), v_job4, 'https://homesbrain.com/r/demo-4', now() - interval '30 days',  NULL,                          now() - interval '30 days'),
    (gen_random_uuid(), v_job5, 'https://homesbrain.com/r/demo-5', now() - interval '10 days',  now() - interval '9 days',   now() - interval '10 days');
END $$;
