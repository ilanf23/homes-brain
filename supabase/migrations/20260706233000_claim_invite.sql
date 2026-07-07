-- Claim invite tracking: when the pro last emailed this customer an invite to
-- claim their home record. The invite-claim edge function stamps it (service
-- role) and enforces a 7 day cooldown against it. Nullable: never invited.
alter table public.customers add column if not exists claim_invited_at timestamptz;
