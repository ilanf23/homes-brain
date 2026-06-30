
-- Core tables for HomesBrain v0
CREATE TABLE public.pros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business TEXT NOT NULL,
  trade TEXT NOT NULL,
  service_area TEXT,
  logo TEXT,
  email TEXT,
  phone TEXT,
  google_place_id TEXT,
  google_rating NUMERIC,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.homes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  created_by_pro UUID REFERENCES public.pros(id) ON DELETE SET NULL,
  claimed_by_homeowner UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.homeowners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homes
  ADD CONSTRAINT homes_homeowner_fk
  FOREIGN KEY (claimed_by_homeowner) REFERENCES public.homeowners(id) ON DELETE SET NULL;

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  consent_at TIMESTAMPTZ,
  consent_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  type TEXT,
  make TEXT,
  model TEXT,
  serial TEXT,
  warranty_until DATE,
  recall_status TEXT NOT NULL DEFAULT 'none',
  recall_checked_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'pro', -- 'pro' (verified) or 'self'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  what_done TEXT NOT NULL,
  next_service_date DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  public_url TEXT NOT NULL,
  sent_sms_at TIMESTAMPTZ,
  sent_email_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  from_homeowner UUID REFERENCES public.homeowners(id) ON DELETE SET NULL,
  to_pro_name TEXT NOT NULL,
  to_pro_phone TEXT,
  trade TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL, -- 'sms' | 'email'
  to_contact TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'record' | 'review_request' | 'invite' | 'other'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT,
  type TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants and permissive RLS for v0 (mock auth)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pros','homes','homeowners','customers','equipment','jobs','records','invites','messages','events']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "v0_open_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END$$;

CREATE INDEX idx_customers_pro ON public.customers(pro_id);
CREATE INDEX idx_jobs_pro ON public.jobs(pro_id);
CREATE INDEX idx_jobs_home ON public.jobs(home_id);
CREATE INDEX idx_equipment_home ON public.equipment(home_id);
CREATE INDEX idx_records_job ON public.records(job_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_events_type ON public.events(type);
