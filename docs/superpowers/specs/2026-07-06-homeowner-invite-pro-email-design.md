# Homeowner invites their pro (by email) - design

Date: 2026-07-06
Status: approved

## Summary

A homeowner can invite one of their own service pros to join HomesBrain by sending a real, branded email. The invite carries a signed token. When the pro joins through it (new signup) or accepts it (already has an account), they are auto-connected to the homeowner's home: a `customers` row links the pro to the home so it lands in their CRM and they can log a job immediately, the invite flips `pending -> accepted`, and the homeowner sees it resolve to "Joined". This completes the referral loop that currently dead-ends at a mock SMS.

This is the mirror image of the approved claim-invite-email feature (pro invites homeowner to claim). It reuses that feature's real-email plumbing: a dedicated Resend edge function, the `RESEND_API_KEY` secret, the `invites@homesbrain.com` sending domain, and the `messages` table as audit log. Email is not gated by A2P 10DLC; SMS stays mocked.

## Decisions made during brainstorming

- Real email via Resend, not mock SMS. The current client-side `mockSend({channel:"sms"})` invite is removed.
- Tokenized invite that auto-connects the pro, not a minimal channel swap. The invite must resolve, not stay pending forever.
- On accept, create the `customers` link (pro can act on the home right away), not just a status flip.
- Drop the phone field from the invite form; go email-only (SMS is mocked/deferred).
- The one-tap "suggested gap" chips (which carry no contact) become prefill actions, not contactless sends.
- Reconcile must cover pros who already have a HomesBrain account, not only brand-new signups. Two entry points into one shared reconcile.

## Data model

One migration in `supabase/migrations/` (ships via repo/Lovable sync, never the Supabase MCP). Alter `invites`:

```sql
alter table public.invites add column to_pro_email    text;
alter table public.invites add column token           uuid not null default gen_random_uuid();
alter table public.invites add column email_sent_at   timestamptz;
alter table public.invites add column accepted_at     timestamptz;
alter table public.invites add column accepted_pro_id uuid references public.pros(id) on delete set null;
create unique index invites_token_key on public.invites(token);
```

`to_pro_phone` stays for now (unused). No new tables. Update the data-model block in `CLAUDE.md` to list the new `invites` columns.

## RPC: `homeowner_create_invite`

Extend the existing 3-arg RPC to accept an email. New signature:

```
homeowner_create_invite(p_to_pro_name text, p_to_pro_email text, p_trade text) returns uuid
```

Same body as today (derives homeowner from `my_homeowner_id()` / `auth.uid()`, resolves their claimed home, inserts an `invites` row with `status='pending'`), plus it stores `to_pro_email`. Returns the invite **id only** - the raw token never goes to the browser; the edge function resolves it server-side. Drop the old `..._phone` signature.

## Send: edge function `supabase/functions/invite-pro/index.ts`

Same CORS and handler shape as `invite-claim` / `scan-nameplate`; uses the service-role client internally. Input: `{ invite_id: string, origin: string }`.

Flow:

1. Resolve the caller. `getUser()` from the Authorization JWT, then look up the homeowner by `auth_user_id`. No auth user or no homeowner row: 403.
2. Load the invite. `invites.from_homeowner` must equal the caller's homeowner id: otherwise 403.
3. Reject unsendable states with stable error codes in the JSON body:
   - `no_email`: the invite has no `to_pro_email`.
   - `already_accepted`: `status = 'accepted'`.
   - `not_configured`: `RESEND_API_KEY` secret is missing. Surfaced honestly, no mock fallback.
4. Build the accept URL as `{origin}/pro/invite/{token}` (origin validated against an allowlist, falling back to https://homesbrain.com).
5. Send via Resend REST API with `RESEND_API_KEY`:
   - From: `HomesBrain <invites@homesbrain.com>`
   - Subject: `A homeowner invited you to HomesBrain`
   - HTML body: short and branded (warm paper neutrals, indigo CTA button "Add their home", brand rules from CLAUDE.md apply; mentions the trade if present). Footer line explains why they are receiving it (a homeowner they serve invited them). Plain-text alternative included.
6. On Resend success only: stamp `invites.email_sent_at = now()`, insert a `messages` row (`channel:"email"`, `to_contact` = the pro email, `body` = plain-text version, `kind:"invite"`), return `{ ok: true }`. Resend failure: 502 with Resend's error message, nothing stamped, no messages row.

## Accept + auto-connect

All reconcile logic lives in one place, reached from two entry points (new-pro trigger, existing-pro RPC). It must be idempotent and guarded.

### Core: `public._accept_pro_invite(p_token uuid, p_pro_id uuid)`

`SECURITY DEFINER`, not client-callable. In one transaction:

1. Load the invite by `token`. If not found or `status <> 'pending'`, return quietly (idempotent no-op; double-accepts do nothing).
2. Flip the invite: `status='accepted'`, `accepted_pro_id=p_pro_id`, `accepted_at=now()`.
3. Create the customer link, unless one already exists for `(p_pro_id, invite.home_id)` (the pro may already serve this home, e.g. the home's `created_by_pro`). Guard with an existence check before insert. When inserting:
   - `pro_id = p_pro_id`, `home_id = invite.home_id`
   - `name = homes.address` for that home (`customers.name` is NOT NULL; homeowners carry no name, so the address is the label)
   - `email = invite.to_pro_email` is the *pro's* email, so do NOT copy it to the customer row (the customer is the homeowner). Leave customer `email`/`phone` null for now.
   - `consent_at = now()`, `consent_ref = 'homeowner_invite:' || invite.id`. Consent is inverted here vs the usual rule: the homeowner initiated the invite and thereby consents to share their home with this pro. Document this in the migration comment.
4. Events (insert directly into `events`, since this runs server-side): log `pro_invite_accepted` with `{ invite_id, pro_id, home_id }`. If this pro brings the home's distinct connected-pro count (from `customers`) to exactly 2, also log `second_pro_added`.

### Entry point 1 - new pro signup (trigger)

Extend `handle_new_pro_signup` (fires `AFTER INSERT ON auth.users`). The pro signup page threads the token into `options.data.invite_token`, exactly as it already threads `ref`. After inserting the `pros` row, if `NEW.raw_user_meta_data->>'invite_token'` is a valid uuid, call `_accept_pro_invite(token, <new pro id>)`.

### Entry point 2 - existing pro (RPC)

`public.accept_pro_invite(p_token uuid) returns jsonb`, `SECURITY DEFINER`, granted to `authenticated`. Resolves the pro from `auth.uid()`; 403-equivalent (returns an error shape) if the caller is not a pro. Calls `_accept_pro_invite(p_token, <caller pro id>)` and returns `{ ok: true, home_id }` (or a not-found/not-pending shape).

## Pro-side accept route: `/pro/invite/$token`

The email CTA points here (works for every case; not `/pro/signup` directly, which would dead-end existing accounts).

- **Logged-in pro:** call `accept_pro_invite(token)` on load, show a success card ("You're connected to this home") linking to the home in their customers list, then to `/pro`.
- **Not signed in:** show the invite context and two choices:
  - "Create your free account" -> `/pro/signup?invite={token}` (token rides into signup metadata; the trigger reconciles).
  - "Log in" -> `/login?invite={token}`; after a successful pro login, `auth.callback` (or the login redirect) calls `accept_pro_invite(token)` before landing on `/pro`.
- Token invalid / already accepted: friendly state ("This invite has already been accepted" / "link expired"), link to `/pro`.

`/pro/signup` reads `invite` from the query and includes it in `options.data.invite_token` (add alongside the existing `ref` handling). `auth.callback` reads a carried `invite` token and, for a pro session, calls `accept_pro_invite` before navigating.

## Homeowner UI: `src/components/invite-pros.tsx`

- Manual form: replace the **Phone** field with **Email** (required, validated). Keep name and trade.
- `sendInvite(name, email, trade)`: call `homeowner_create_invite` (returns invite id), then invoke the `invite-pro` edge function with `{ invite_id, origin: window.location.origin }`. Remove the client-side `mockSend` SMS entirely.
- One-tap "suggested gap" chips: clicking prefills the form (sets the trade, focuses the name field) instead of sending a contactless invite. They no longer call `sendInvite` directly.
- Sent list: `pending` renders an amber pill; `accepted` renders an indigo "Joined" pill. `get_home_view` already returns the homeowner's invites with `status`; ensure it also surfaces `accepted` so the pill can switch.
- On send, fire `logEvent("pro_invited", { trade })` (unchanged). Show toast "Invite sent to {name}"; surface `no_email` / `not_configured` errors as plain-language toasts.

## Events

- `pro_invited` - unchanged, fired client-side at send.
- `pro_invite_accepted` - new, fired server-side in `_accept_pro_invite`.
- `second_pro_added` - **moves** from the current premature client-side fire (at invite time, in `invite-pros.tsx`) to server-side in `_accept_pro_invite`, when an accepting pro brings the home to 2 connected pros. Remove the old client-side call. The other seven core loop events are untouched.

## What this does NOT include

- No SMS. Real texting stays blocked on A2P 10DLC. `to_pro_phone` is retained but unused.
- No bulk invite. One pro at a time from the homeowner surfaces.
- No resend cooldown / tracking UI beyond `email_sent_at` and the status pill (add later if needed).
- No generic email service. `invite-pro` is dedicated, mirroring the rejected-generic-sender decision in the claim-invite spec.
- No change to how a pro who already serves the home behaves beyond flipping the invite to accepted (no duplicate customer row).

## Prerequisite (shared with claim-invite-email)

Resend account, verified `homesbrain.com` sending domain, and `RESEND_API_KEY` set as a Supabase edge-function secret. Already listed in the claim-invite-email spec. Until it is set, `invite-pro` returns `not_configured` and the feature deploys but cannot send.

## Verification (no test suite; manual per CLAUDE.md)

1. `bun dev`, log in as a homeowner with a claimed home, open My pros.
2. Invite a pro with a real email you control: email arrives, branding correct, CTA opens `/pro/invite/{token}`.
3. New-pro path: from the invite, create a new pro account; after the trigger runs, the home appears in that pro's customers list, the invite shows "Joined" for the homeowner, `pro_invite_accepted` (and `second_pro_added` if applicable) logged, `messages` row written.
4. Existing-pro path: log in as an already-existing pro and open the invite link; `accept_pro_invite` connects them, no duplicate customer row if they already served the home.
5. Idempotency: reopening an accepted invite link is a friendly no-op.
6. Rejection paths: invite with no email (`no_email`), already accepted (`already_accepted`), key missing (`not_configured`).
7. One-tap gap chip prefills the form rather than sending; the manual send with email works end to end.
