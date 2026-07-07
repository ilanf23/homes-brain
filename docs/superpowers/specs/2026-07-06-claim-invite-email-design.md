# Claim invite by email - design

Date: 2026-07-06
Status: approved

## Summary

Pros can send a homeowner in their CRM a real branded email inviting them to claim their home record. The invite is sent from the customer detail page, carries the claim URL of the customer's latest record, is delivered through Resend via a dedicated Supabase edge function, and is tracked on the customer with a 7-day cooldown. This is the first real outbound channel; SMS stays mocked (A2P 10DLC not cleared). Email is not gated by A2P, and consent is already captured when a pro adds a customer.

## Decisions made during brainstorming

- Real delivery via Resend, not mock. The `messages` table stays the audit log.
- Per-customer button on `/pro/customers/:customerId` only. No bulk action.
- Track `claim_invited_at` per customer, show it in the UI, enforce a 7-day cooldown server-side.
- Approach: one dedicated `invite-claim` edge function (option A). Rejected: a generic client-callable `send-email` function (lets any authenticated user send arbitrary mail from our domain) and a DB-webhook pipeline (more infra, no instant feedback).

## Data model

One migration in `supabase/migrations/` (ships via repo/Lovable sync, never the Supabase MCP):

```sql
alter table customers add column claim_invited_at timestamptz;
```

Nullable. No new tables.

## Edge function: `supabase/functions/invite-claim/index.ts`

Same CORS and handler shape as `scan-nameplate`. Uses the service role client internally. Input: `{ customer_id: string }`.

Flow:

1. Resolve the caller. `getUser()` from the Authorization JWT, then look up `pros` by `auth_user_id`. No auth user or no pro row: 403.
2. Load the customer. `customers.pro_id` must equal the caller's pro id: otherwise 403.
3. Reject unsendable states with stable error codes in the JSON body:
   - `no_email`: customer has no email on file.
   - `already_claimed`: the customer's home has `claimed_at` set.
   - `no_record`: no job by this pro on this home has a record row yet.
   - `cooldown`: `claim_invited_at` is within the last 7 days. Response includes the date.
   - `not_configured`: `RESEND_API_KEY` secret is missing. Surfaced honestly, no mock fallback.
4. Find the newest record: latest `records` row joined through this pro's jobs on the customer's home. Build the claim URL as `{origin}/claim/{recordId}` (origin passed by the client, validated against an allowlist, falling back to https://homesbrain.com).
5. Send via Resend REST API with `RESEND_API_KEY`:
   - From: `HomesBrain <invites@homesbrain.com>`
   - Subject: `{Business} started a home record for {address}`
   - HTML body: short and branded (warm paper neutrals, indigo CTA button "Claim your home record", brand rules from CLAUDE.md apply). Footer line: "You're receiving this because {Business} logged a service visit at {address}."
   - Plain-text alternative included.
6. On Resend success only: stamp `customers.claim_invited_at = now()`, insert a `messages` row (`channel: "email"`, `to_contact`, `body` = plain-text version, `kind: "invite"`), return `{ ok: true }`. Resend failure: 502 with Resend's error message, nothing stamped, no messages row.

## UI: customer detail page (`src/routes/pro.customers.$customerId.tsx`)

- Shown only for customers whose home is unclaimed.
- "Invite to claim" button (indigo, existing `Btn` from `src/lib/ui.tsx`) among the existing actions.
- States:
  - Sendable: enabled. On success: toast "Claim invite sent", show "Invited {date}".
  - Within cooldown: disabled, shows "Invited {date}", tooltip/help text says when it can be resent.
  - No email on file: disabled with "No email on file".
  - Home claimed: button and status not rendered at all.
- Errors from the function are shown as toasts with plain language (for example "Email is not configured yet" for `not_configured`).
- On success the client fires `logEvent("claim_invite_sent", { customer_id })`. New analytics event; the eight core loop events are untouched. `home_claimed` still fires at claim time via the existing flow and already notifies the pro.

## What this does NOT include

- No bulk invite from the customers list.
- No SMS. Real texting stays blocked on A2P 10DLC.
- No change to the claim flow itself (`/claim/:recordId`, `claim_home` RPC, magic-link auth all stay as they are).
- No generic email service. If records or review requests go real later, extract then.

## One-time setup (user-facing prerequisite)

1. Create a Resend account.
2. Verify the homesbrain.com sending domain (add Resend's DNS records).
3. Add `RESEND_API_KEY` as a Supabase secret for edge functions.

Until then the feature deploys but returns `not_configured`.

## Verification (no test suite; manual per CLAUDE.md)

1. `bun dev`, log in as a pro, open an unclaimed customer with a real email you control.
2. Send the invite: email arrives, branding correct, claim link opens the claim page.
3. Claim from the email end to end: magic link, `claim_home`, lands on `/home`, pro gets the existing home_claimed notification.
4. `claim_invited_at` stamped, `messages` row written, `claim_invite_sent` event logged.
5. Second click blocked by cooldown with the right date.
6. Rejection paths: customer with no email, claimed home (button hidden), customer with no record, key missing (`not_configured`).
