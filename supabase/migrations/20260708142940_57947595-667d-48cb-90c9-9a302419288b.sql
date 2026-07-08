CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_slug text NOT NULL,
  trade text,
  homeowner_name text NOT NULL,
  homeowner_contact text NOT NULL,
  message text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.service_requests TO anon, authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can insert service requests"
  ON public.service_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(homeowner_name) BETWEEN 1 AND 100
    AND length(homeowner_contact) BETWEEN 3 AND 200
    AND length(coalesce(message, '')) <= 2000
    AND length(pro_slug) BETWEEN 1 AND 100
    AND length(coalesce(trade, '')) <= 50
    AND length(coalesce(source, '')) <= 50
  );
