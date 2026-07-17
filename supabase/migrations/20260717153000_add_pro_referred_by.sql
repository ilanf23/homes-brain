-- Referral attribution: record which pro referred a new pro, and expose a
-- pro's own referral list. Applied to the live DB via the Lovable MCP on
-- 2026-07-17; this file is the version-controlled record of that change.
--
-- Context: /pro/referral shares a link /pro/signup?ref=<proId>. Before this,
-- the ref was dropped at signup and nothing was ever attributed. referred_by
-- is the durable source of truth (company/admin reads it directly); the two
-- SECURITY DEFINER functions let a pro set their referrer and read the pros
-- they referred without loosening row-level security on the pros table.

-- 1. attribution column: who referred this pro (references another pro)
alter table public.pros
  add column if not exists referred_by uuid references public.pros(id) on delete set null;

create index if not exists pros_referred_by_idx on public.pros(referred_by);

-- 2. set the caller's referrer once. SECURITY DEFINER so the write is trusted
--    and cannot be spoofed to reference a non-existent or self pro.
create or replace function public.set_referrer(p_ref uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from pros where auth_user_id = auth.uid();
  if me is null or p_ref is null or p_ref = me then
    return;
  end if;
  if not exists (select 1 from pros where id = p_ref) then
    return;
  end if;
  update pros set referred_by = p_ref where id = me and referred_by is null;
end;
$$;

grant execute on function public.set_referrer(uuid) to authenticated;

-- 3. the caller's referral list with first-job status. SECURITY DEFINER so a
--    pro can see the pros THEY referred (other rows RLS would otherwise hide).
create or replace function public.referrals_for_me()
returns table (pro_id uuid, business text, signed_up_at timestamptz, has_first_job boolean)
language sql
security definer
set search_path = public
as $$
  select r.id, r.business, r.created_at,
         exists (select 1 from jobs j where j.pro_id = r.id)
  from pros r
  where r.referred_by = (select id from pros where auth_user_id = auth.uid())
  order by r.created_at desc;
$$;

grant execute on function public.referrals_for_me() to authenticated;
