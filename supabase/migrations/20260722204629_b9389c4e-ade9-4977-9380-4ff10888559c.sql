ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS promo_sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_sms_consent_at timestamptz;