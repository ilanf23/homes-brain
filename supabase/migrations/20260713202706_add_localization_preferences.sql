-- Persist the language a pro chose for a customer, and snapshot the language
-- actually used for each outbound message / claim link. Defaults keep older
-- clients and existing rows fully backwards-compatible.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.claim_tokens
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Preserve the pro's source wording while keeping the exact customer-facing
-- translation attached to the job. Shape: { "ru": { "what_done": "…",
-- "equipment_type": "…" } }. JSONB lets us add languages without another
-- schema change and the object constraint prevents malformed scalar values.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS localized_content jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_preferred_locale_check'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_preferred_locale_check
      CHECK (preferred_locale IN ('en', 'es', 'ru', 'uk'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_tokens_locale_check'
      AND conrelid = 'public.claim_tokens'::regclass
  ) THEN
    ALTER TABLE public.claim_tokens
      ADD CONSTRAINT claim_tokens_locale_check
      CHECK (locale IN ('en', 'es', 'ru', 'uk'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_locale_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_locale_check
      CHECK (locale IN ('en', 'es', 'ru', 'uk'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_localized_content_object_check'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_localized_content_object_check
      CHECK (jsonb_typeof(localized_content) = 'object');
  END IF;
END $$;
