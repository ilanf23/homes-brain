-- Pro notifications: in-app inbox rows written when a homeowner acts on the loop
-- (connect request, rebook request, home claimed, record viewed). Title/detail are
-- composed at insert time; props carries ids for future deep links.
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'connect_request' | 'rebook_request' | 'home_claimed' | 'record_viewed'
  title TEXT NOT NULL,
  detail TEXT,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same permissive v0 RLS as the core tables (auth is mocked; app queries scope by pro).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v0_open_all" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_notifications_pro_created ON public.notifications(pro_id, created_at DESC);
