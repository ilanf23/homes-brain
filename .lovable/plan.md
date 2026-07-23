# SMS Audit — HomesBrain (read-only, no changes)

## 1) Truly live outbound SMS callers/triggers  (LIVE WIRED)

All go through `src/lib/sms.ts::sendSms()` → `supabase.functions.invoke("send-sms")`.

- **Record delivery on job submit** — `src/routes/pro.jobs.new.tsx:1867-1882` (inside the `send()` helper called by `submit()`). Fires when phone + transactional consent + minted `claimUrl` are present. Merges "record" and "record + invoice" into a single SMS. Stamps `records.sent_sms_at`. **P0 record-delivery SMS is LIVE.**
- **Manual claim-invite SMS from customer detail** — `src/routes/pro.customers.$customerId.tsx:389` inside `sendClaimInvite()`. Mints claim URL via `claim-qr` then texts it. Gated on phone + `customer.consent_at`.
- **Rebook nudge** (P1) — `src/components/action-queue.tsx:88` inside `nudge()` for `kind: "due"` rows on `/pro/office`. Prefers SMS; also fires email `send-follow-up` when both channels exist.
- **Stale-home claim reminder** — `src/components/action-queue.tsx:138` inside `remind()` for `kind: "stale"` rows. SMS first, falls back to `invite-claim` email if no phone or SMS fails.

## 2) Outbound SMS infrastructure with no callers  (DORMANT / partial)

- `supabase/functions/send-sms/index.ts` — full Twilio REST sender: E.164 normalization, `is_sms_opted_out` gate, quiet-hours (America/New_York 8–21), `messages` insert on every attempt, `MessagingServiceSid` send. Wired to callers above, but internally has no scheduler/cron caller.
- `src/lib/sms.ts` — thin wrapper (`sendSms`, `smsErrorMessage`). Fully live; every caller listed in §1.
- No scheduled/cron caller of `send-sms` exists anywhere (no pg_cron, no `/api/public/*` route, no worker). **Reminder scheduler is not wired.**
- Review-ask SMS, "invite your other pros" SMS, seasonal/marketing blasts: **not present.**

## 3) Inbound SMS / webhook / STOP-START-HELP  (LIVE WIRED, unverified)

- `supabase/functions/sms-inbound/index.ts` — Twilio webhook. Parses `From`/`Body`; STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT → upsert `sms_optouts` with `opted_out_at`, replies TwiML. START/UNSTOP/YES/JOIN → clears opt-out (`resubscribed_at`). HELP/INFO → static reply. Unknown keywords → silent.
- `supabase/config.toml:89-93` — `[functions.sms-inbound] verify_jwt = false` (public webhook path).
- No test evidence of the Twilio Messaging Service webhook actually pointing at the deployed URL (audit-only note; not verifiable in the repo).

## 4) UI buttons / forms / settings that mention or attempt SMS

- `src/routes/pro.jobs.new.tsx` — "Send record" flow (implicit SMS delivery when phone + consent).
- `src/routes/pro.customers.$customerId.tsx` — "Send claim invite" button drives §1 SMS path; also `sendNudge()` (see §5, still mock).
- `src/components/action-queue.tsx` — "Send nudge" and "Send reminder" buttons on `/pro/office`.
- `src/routes/pro.settings.tsx:494-505` — toggles: `notify_sms` (transactional "Service alerts by SMS", default ON) and `promo_sms_consent` (default OFF; stamps `promo_sms_consent_at`).
- `src/routes/home.settings.tsx:325-391, 530-537` — homeowner toggles: `notify_sms` (bound to `sms_consent_at`), `respect_quiet_hrs`, `promo_sms_consent`. Also phone-capture w/ `sms_consent_at` stamping (line 212–214).
- `src/routes/home.setup.tsx:79-166` — onboarding checklist toggles `notify_sms`/`respect_quiet_hrs`, stamps `sms_consent_at`.
- `src/routes/home.signup.tsx:79` — sets `sms_consent_at` at signup when phone provided.
- `src/routes/pro.signup.tsx:66` + `src/routes/auth.callback.tsx:81-95` + `src/routes/claim.$token.tsx:244-250` — stash and persist `promo_sms_consent` (+ timestamp) at pro signup / OAuth / magic-link completion. Phone field optional.
- `src/routes/messaging-terms.tsx`, `src/routes/messaging-terms-auth.tsx`, `src/routes/sms-opt-in.tsx`, `src/routes/privacy.tsx` — legal/compliance surface (CONFIG/DOC-ONLY, no send behavior).

## 5) Mock/console-only SMS paths  (MOCK — still present, will not touch Twilio)

- `src/lib/hb.ts:344` — `mockSend()` inserts a row into `messages` and logs. **No real delivery.**
- `src/routes/pro.due.tsx:69` — `sendNudge()` on `/pro/due` still uses `mockSend`. Toast literally says "(mock)". **NOT wired to real SMS**, even though `action-queue.tsx` on `/pro/office` is.
- `src/routes/pro.customers.$customerId.tsx:302` — `sendNudge()` on the customer detail page uses `mockSend`. Toast says "(mock)". **NOT wired to real SMS.** (Only `sendClaimInvite()` on the same page is live.)

**Gap:** two rebook-nudge entry points still print "(mock)" while a third is live. Same conceptual action, three implementations.

## 6) Database schema / RPCs / policies supporting SMS  (DATA-ONLY)

- `sms_optouts` table + `is_sms_opted_out(p_phone)` RPC — `supabase/migrations/20260713171450_*.sql`. RLS enabled, granted to `service_role`.
- `records.sent_sms_at timestamptz` — `supabase/migrations/20260630220235_*.sql:80`; used in KPI queries (`20260711192943_*.sql:76,79,161`).
- `homeowners`: `notify_sms`, `sms_opt_out`, `respect_quiet_hrs`, `sms_consent_at`, `promo_sms_consent`, `promo_sms_consent_at`. Migrations: `20260706211957`, `20260710160000`, `20260713225037`, `20260722203719`.
- `pros`: `notify_sms`, `promo_sms_consent`, `promo_sms_consent_at`. Migration `20260722204629`.
- `customers.consent_at` / `consent_ref` (`20260630220235:46`) — gates manual claim-invite SMS.
- RPC `homeowner_update_profile(..., p_notify_sms, p_sms_opt_out, p_respect_quiet_hrs, p_promo_sms_consent)` — `20260722203719_*.sql`. Latest overload handles promo-consent timestamp lifecycle.
- `messages` table — used by both `send-sms` (logs every attempt) and `mockSend` (mock-only rows).

## 7) Configuration / secrets / function config

- Secrets present in Supabase project: `SMS_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (all four required for `send-sms` to actually hit Twilio; otherwise it returns `code: "disabled"` and only logs to `messages`).
- `supabase/config.toml:92-93` — `sms-inbound` `verify_jwt = false`. No config override for `send-sms` (defaults to JWT-verified, called via service-role from browser through `supabase.functions.invoke`).
- No public route under `src/routes/api/public/*` for SMS webhooks (Twilio → `sms-inbound` directly).

## 8) Tests / docs / scripts

- No test suite in repo (`CLAUDE.md`: "There is no test suite").
- Docs: `docs/superpowers/plans/*` — no SMS-specific plan files.
- `CLAUDE.md` explicitly warned SMS is mocked; that guidance is now stale for the live paths in §1.

---

## Count by status

| Status | Count | Notes |
|---|---|---|
| LIVE WIRED (outbound) | **4 callers** | jobs.new, customer detail (invite), action-queue nudge, action-queue reminder |
| LIVE WIRED (inbound) | **1 webhook** | `sms-inbound` (deployed unverified) |
| DORMANT infra (no caller) | **1** | No scheduled/cron caller for `send-sms` |
| MOCK (console/messages-only) | **2 callers** | `/pro/due` sendNudge, `/pro/customers/:id` sendNudge |
| DATA-ONLY schema/RPC | 5+ tables/columns, 2 RPCs | See §6 |
| CONFIG-ONLY | 4 secrets + 1 config.toml block + 4 legal routes | See §7 |

## Most important gaps

1. **`/pro/due` and `/pro/customers/:id` "Send rebook nudge" buttons are still mocked** while `/pro/office` does real SMS. Same action, inconsistent behavior — a pro tapping "nudge" on the Due page thinks it went out; nothing does.
2. **No scheduler.** Reminder scheduler (cron) for due-service SMS is not present anywhere in the repo — no pg_cron migration, no public API route, no worker.
3. **No signature verification on `sms-inbound`.** `verify_jwt = false` is required, but there is no Twilio `X-Twilio-Signature` validation inside the handler. Anyone who finds the URL can toggle any phone's opt-out state.
4. **`is_sms_opted_out` gate but no `notify_sms` / `respect_quiet_hrs` / `promo_sms_consent` gate at send time.** `send-sms` only checks opt-out and ET quiet hours; it does not consult per-user prefs from `homeowners`/`pros`. Users can toggle "Text messages" off in settings and still receive transactional SMS.
5. **No promo/marketing SMS caller exists** even though `promo_sms_consent` is captured in three places (pro signup, pro settings, home settings). The consent is being collected with nothing yet reading it.
6. **P2 items acknowledged but absent from code**: review-ask text, "invite your other pros" text, seasonal blasts.
7. `mockSend` remains imported in `pro.customers.$customerId.tsx` and `pro.due.tsx`, so an accidental use in a new flow will silently no-op instead of sending.

**Confirmation on your explicit question:** the P0 record-delivery SMS path *is* wired live today (see §1, `pro.jobs.new.tsx:1867-1882`), including the invoice-merge case.
