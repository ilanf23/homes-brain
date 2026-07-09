ALTER TABLE public.claim_tokens ALTER COLUMN record_id DROP NOT NULL;
ALTER TABLE public.claim_tokens ALTER COLUMN home_id DROP NOT NULL;
ALTER TABLE public.claim_tokens ALTER COLUMN pro_id DROP NOT NULL;