
ALTER TABLE public.pros ALTER COLUMN business DROP NOT NULL;
ALTER TABLE public.pros ALTER COLUMN trade DROP NOT NULL;
ALTER TABLE public.claim_tokens ADD COLUMN IF NOT EXISTS intent text;
ALTER TABLE public.claim_tokens ADD COLUMN IF NOT EXISTS first_name text;
