
CREATE TABLE public.claim_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX claim_tokens_record_idx ON public.claim_tokens(record_id);
CREATE INDEX claim_tokens_expires_idx ON public.claim_tokens(expires_at);

GRANT ALL ON public.claim_tokens TO service_role;

ALTER TABLE public.claim_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge functions) may read or write.
