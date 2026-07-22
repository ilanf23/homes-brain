
DO $$
DECLARE v_pro uuid := 'a93895b8-95e0-433b-bb66-bb81c08dc502';
        v_home uuid; v_cust uuid; v_job uuid; v_rec uuid;
BEGIN
  INSERT INTO public.homes(address, created_by_pro) VALUES ('TEST 123 Sample St, Austin, TX 78701 (email design test)', v_pro) RETURNING id INTO v_home;
  INSERT INTO public.customers(pro_id, home_id, name, email, consent_at, consent_ref)
    VALUES (v_pro, v_home, 'Ilan (TEST)', 'ilanfridman23@gmail.com', now(), 'email-design-test') RETURNING id INTO v_cust;
  INSERT INTO public.jobs(pro_id, home_id, what_done, next_service_date)
    VALUES (v_pro, v_home, 'TEST — Replaced kitchen faucet cartridge and checked supply line pressure.', (now() + interval '6 months')::date) RETURNING id INTO v_job;
  INSERT INTO public.records(job_id, public_url) VALUES (v_job, '') RETURNING id INTO v_rec;
  UPDATE public.records SET public_url = 'https://homesbrain.com/r/' || v_rec WHERE id = v_rec;
  RAISE NOTICE 'created customer % record %', v_cust, v_rec;
END $$;
SELECT c.id customer_id, r.id record_id FROM customers c
  JOIN homes h ON h.id=c.home_id JOIN jobs j ON j.home_id=h.id JOIN records r ON r.job_id=j.id
  WHERE c.consent_ref='email-design-test';
