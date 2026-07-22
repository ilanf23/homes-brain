# SMS re-enable audit

## 1. Callers of `send-sms` and email-only paths that should also SMS

**Nobody in the app currently invokes `send-sms`.** The function is live and correct (E.164 normalize → opt-out check → quiet hours 8a–9p ET → Twilio REST) but no code path calls it. Every "delivery" today goes through email edge functions or a `mockSend()` console log.

| Surface | File | Today | SMS path exists? | What flips SMS on |
|---|---|---|---|---|
| **Record delivery on job submit** | `src/routes/pro.jobs.new.tsx` → `deliverRecord()` (L1776) invokes `invite-claim` | Email only, if `emailAddr`. If phone-only → `deliveryState="phone_only"` with no send. `sent_sms_at` column is written `null` (L2205). | No — comment L650 says "SMS delivery is not live yet." | Add branch: if no email OR in addition to email, call `send-sms` with the branded claim URL. Requires `sms_consent_at` on the customer or a fresh consent capture on step 1. |
| **Manual "Send claim invite" from customer detail** | `src/routes/pro.customers.$customerId.tsx` `sendClaimInvite()` L314 | Invokes `invite-claim` (email) | No | Same as above; wire an SMS fallback when customer has phone but no email. |
| **Rebook nudge** | `src/routes/pro.customers.$customerId.tsx` `sendNudge()` L291 | `mockSend()` only — never leaves the browser | No real send at all | Replace `mockSend` with `send-sms` (phone) OR `send-follow-up` (email). |
| **"What's next" pro-triggered follow-up** | `supabase/functions/send-follow-up/` — fully built email function, **no frontend caller** | Orphaned | Email only inside the function | Wire a UI trigger (pro.office / pro.dashboard) and add an SMS twin, or extend `send-follow-up` to also fire `send-sms`. |
| **Homeowner claim / magic link** | `src/routes/login.tsx` → `homeowner-login`, `pro-login`, `password-reset` | Email magic link only | No | Out of scope for A2P LVM per Twilio guidance (OTP is a separate use case). Keep email; do **not** add SMS OTP without a dedicated campaign. |
| **Invoice created on submit** | `src/routes/pro.jobs.new.tsx` L2246 `createInvoice()` | No notification at all | No | New send: SMS "You have an invoice from {biz}: {link}" (transactional). |
| **Homeowner reminders (`next_service_date`)** | `src/routes/home.reminders.tsx` renders list; **no scheduler / no send job exists** | Nothing sent | No | Requires a cron edge fn + `send-sms` + `send-follow-up`. New build, not just a flip. |
| **Invite another pro (homeowner)** | `src/components/invite-pros.tsx` L80 → `invite-pro` | Email only; captures `to_pro_phone` but ignores it (L60, 97 log channel:'sms' but never sends) | Phone field wired to schema only | Extend `invite-pro` (or add sibling send) to also `send-sms` when `to_pro_phone` present. |
| **`sent_sms_at` bookkeeping** | `records.sent_sms_at` column exists (migrations 20260630, 20260711) and is displayed in pro.office / pro.customers / pro.records | Never written | — | Update to `now()` on successful `send-sms` return. |

## 2. Dormant / archived SMS code

- `supabase/functions/send-sms/index.ts` — production-ready, unused by any caller.
- `supabase/functions/sms-inbound/index.ts` — Twilio inbound webhook, live, writes `sms_optouts` on STOP/START/HELP. Depends on inbound URL being set on the Messaging Service.
- `src/routes/sms-opt-in.tsx` — public opt-in proof page for A2P.
- `src/lib/hb.ts` `mockSend({channel:"sms"})` L344 — used in `pro.customers.$customerId.tsx` sendNudge and elsewhere; only logs to console. Every mockSend SMS call is a real-send candidate.
- Comment L288 in `pro.jobs.new.tsx`: "No mock SMS - texting is not live yet." — remove after wiring.
- `home.settings.tsx` (L318, L370) has an SMS notify toggle + hard opt-out toggle already wired to `sms_consent_at` / `sms_opt_out`.
- `home.setup.tsx` (L79–166) captures SMS consent on setup; already writes `sms_consent_at`.
- `home.signup.tsx` (L79–85) captures SMS consent at signup.

## 3. Consent model

**Homeowner (portal users):**
- `homeowners.sms_consent_at timestamptz` (migration 20260713225037) — timestamped opt-in captured at signup / setup / settings.
- `homeowners.sms_opt_out boolean` — hard block set from settings.
- `homeowners.notify_sms boolean` + `respect_quiet_hrs boolean` (migration 20260706200124) — per-notification preferences updated via `homeowner_update_profile`.
- `homeowners.marketing_consent boolean` + `consent_at` — separate marketing gate.

**Customer (pro-entered contacts, no portal yet):**
- `customers.consent_at`, `customers.consent_ref` — the pro checks a consent box on job step 1 (`pro.jobs.new.tsx` L2033). This is the **transactional** consent for the record they just performed.
- No `sms_consent_at` on customers today. A pro-captured phone with `consent_at` covers the transactional record notification under the "service update to the customer you just served" pattern; anything recurring/marketing needs an explicit SMS opt-in captured through the branded record on first claim.

**Opt-out plumbing:**
- `sms_optouts` table (migration 20260713171450) written by `sms-inbound` on STOP.
- `is_sms_opted_out(p_phone)` RPC used by `send-sms` before every send.
- `email_optouts` + `email_unsub_tokens` mirror this on the email side.

**Quiet hours:** hardcoded 8a–9p America/New_York in `send-sms` regardless of `respect_quiet_hrs` prefs. Currently a floor, not a preference.

**Transactional vs promotional under the approved LVM-Mixed campaign:**
- **Transactional (safe under existing customer/homeowner consent):** record delivery on job send, claim invite from customer detail, invoice notification, reminder for a `next_service_date` the pro entered, pro-triggered follow-up.
- **Promotional / marketing (needs explicit SMS opt-in via `sms_consent_at`):** rebook nudge without a scheduled date, review requests, seasonal blasts, "invite your other pros" prompts.

## 4. Prioritized re-enable list

**P0 — highest ROI, lowest risk, transactional, consent already exists (`customers.consent_at`):**
1. **Record delivery SMS** in `pro.jobs.new.tsx deliverRecord()`. When phone present + no email OR pro chose SMS: `send-sms` with `${biz} sent your service record: ${claimUrl} Reply STOP to opt out.` Update `records.sent_sms_at`. Kills the "phone_only" dead-end.
2. **Manual claim-invite fallback** in `pro.customers.$customerId.tsx sendClaimInvite()`. Same wire as #1 for phone-only customers.
3. **Invoice-created notification.** Uses phone if present. Transactional.

**P1 — transactional, tiny new surface:**
4. **Rebook nudge** in `pro.customers.$customerId.tsx sendNudge()`. Only when a `next_service_date` exists — that qualifies as transactional service reminder. Replace `mockSend` with real `send-sms`. Nudges without a scheduled date should stay email until SMS marketing opt-in is captured.
5. **Wire `send-follow-up` into pro.office/pro.dashboard** and add SMS twin. Function exists, no UI trigger — cheap win.
6. **Reminder scheduler (cron edge fn)** for `jobs.next_service_date` → `send-sms` + email 7d before. New build; not a flip. Guard by homeowner `notify_sms && !sms_opt_out`.

**P2 — needs explicit SMS opt-in first:**
7. **Homeowner "invite your other pros" SMS** (`invite-pro`) — capture SMS consent on the invite form before sending.
8. **Review-ask SMS** to customer — needs `customers.sms_consent_at` captured on the branded record before first claim.
9. **Marketing/seasonal blasts** — separate campaign classification; do not send under LVM-Mixed without legal review.

**Do NOT re-enable without a separate campaign / plan:**
- SMS magic-link / OTP for `pro-login` / `homeowner-login` / `password-reset`. Requires a dedicated OTP use case with Twilio and separate consent copy.

## Cross-cutting items before flipping anything

- Every real SMS body must include `Reply STOP to opt out` and the business identity (Twilio LVM-Mixed requirement).
- Wire `sent_sms_at` updates so the pro-side UI reflects actual delivery.
- Honor `homeowners.respect_quiet_hrs` — either use it to widen/narrow the hardcoded 8a–9p window or drop the pref if we standardize on the function-level window.
- Add explicit consent capture on the branded record page ("Text me updates about my home") before enabling anything marked P2.
- Verify Twilio Messaging Service inbound webhook is pointed at `sms-inbound` in production so STOP replies actually land in `sms_optouts`.
