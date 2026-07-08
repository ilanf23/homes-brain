
-- Add Stripe Connect payout status columns to pros
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false;

-- Payments table: written only via webhook (service role); read by pro (own)
-- and by homeowner (own home).
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pros(id) ON DELETE RESTRICT,
  home_id uuid NOT NULL REFERENCES public.homes(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  amount integer NOT NULL,               -- in cents
  application_fee_amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  stripe_account_id text NOT NULL,       -- connected account id
  status text NOT NULL DEFAULT 'pending',-- pending | succeeded | failed | refunded
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Pro sees only their own payments
CREATE POLICY "Pros read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (pro_id = public.my_pro_id());

-- Homeowner sees payments on homes they claimed
CREATE POLICY "Homeowners read payments on own home"
  ON public.payments FOR SELECT TO authenticated
  USING (home_id IN (SELECT id FROM public.homes WHERE claimed_by_homeowner = public.my_homeowner_id()));

-- No INSERT/UPDATE/DELETE policies: writes happen only via edge functions
-- using the service role (webhook-verified events).

CREATE INDEX IF NOT EXISTS payments_pro_id_idx ON public.payments(pro_id);
CREATE INDEX IF NOT EXISTS payments_home_id_idx ON public.payments(home_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments(invoice_id);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();
