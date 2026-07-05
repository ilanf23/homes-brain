# HomesBrain — Claude Code project guide

> Drop this file at the **repo root**. Claude Code loads it automatically every session.
> It is the standing context for how to build HomesBrain. The full knowledge base lives in Notion (HomesBrain OS); this is the working summary.

## What we're building

HomesBrain is "a Carfax for homes that writes itself." Home-service pros (water treatment, HVAC, plumbing, electrical, appliance repair) log a job in ~30 seconds; a branded service record is sent to the homeowner, who claims it free and owns it for life. The pro gets reviews, rebookings, and a professional record; the homeowner gets a home that remembers itself with zero effort; every job deepens a verified, portable record.

**The core loop (already built):** pro signs up free → logs a job → branded record sent (mocked) → homeowner opens it with no login → claims the home → invites their other pros. This loop works. The job now is to build out everything around it.

## Current status (as of this handoff)

Built: pro signup (`/pro/signup`), dashboard shell (`/pro`), log-a-job (`/pro/jobs/new`), public record page (`/r/:id`), claim (`/claim/:id`), my-home basics (`/home`) incl. one-tap pro invite.

**Not built (in priority order):**
1. **Login for returning users + role routing** (`/login`) — highest priority. Today there is only signup; a returning pro or homeowner cannot get back in.
2. **Full homeowner side** — appliance/item detail with service-history timeline, full My Pros, add-to-home (photo/forward/attach), reminders, settings.
3. **Full pro side depth** — real dashboard data, customers list + customer/home detail, sent-record detail, due-for-service + rebook, reviews, settings, referral.
4. **Verified public profile** (SEO engine), gated to active pros.
5. **Payments** (Stripe Connect, v0.5).

The authoritative screen-by-screen map (routes, data, states, status) is the **Screen inventory & app spec** page in Notion. Build against it.

## Stack

- React + Vite + TypeScript + Tailwind (Lovable scaffold — do not migrate frameworks without discussion).
- Supabase: Postgres, auth (phone/email OTP, no passwords), storage. Enforce row-level security.
- SMS/email are **mocked** for now: writing to a `messages` table + on-screen preview. Do NOT wire real Twilio/Resend yet — A2P 10DLC compliance is not cleared (see Compliance).
- Analytics: log events to an `events` table (and console) — see Events.

## Brand — use these tokens exactly

**One brand, one payoff color.** The old role-per-audience system (teal = pros, coral = homeowners, amber = partners) is retired — never reintroduce it. Audiences are distinguished by copy and structure, not color.

- **Indigo = THE brand color**, on every surface for every audience: buttons, links, eyebrows, chips, prices, nav, focus states. Pro app, homeowner app, marketing, public record — all indigo.
- **Coral = payoff highlights only**, used sparingly (~10% of color): rebook CTAs/pills, revenue stats ("+$4,200 rebooked"), "win" moments. If in doubt, use indigo.
- **Amber = functional warning/status only** ("due soon", "pending") — never branding.
- **Red = errors, destructive, compliance** only.

```css
--ink:#16160f;  --muted:#73706a;  --line:#e7e5de;  --bg:#ffffff;  --soft:#f7f6f1;
--indigo:#473fb0; --indigobg:#eeedfd; --indigo-dark:#2a2470;  /* brand — everywhere */
--coral:#c2461f;  --coralbg:#fbeae2;  --coral-dark:#9c3a18;   /* payoff highlights only */
--amber:#8a5208;  --amberbg:#faf0db;                          /* functional warning/status */
--red:#a32d2d;    --redbg:#fcebeb;                            /* errors/compliance */
```

The warm paper neutrals (ink / soft / line) carry the personality — a beautifully kept ledger. On accent tint backgrounds (`*bg`), use the `*-dark` text tone where the strong tone fails AA.

- Type: system font stack. Headlines weight 800, tight tracking (~-0.02em). Eyebrows: ~12px UPPERCASE bold, +0.14em, indigo (coral only on a payoff moment). Body 15–17px, line-height ~1.55.
- Components: fully rounded pill buttons; cards 16–22px radius on soft/white; KV rows (white, line border, muted key left / bold value right); chips/pills (999px, tint bg, accent text); phone mockups where useful. Rounded everything, generous whitespace, centered section headers.
- Keep secondary text at `--muted` (#73706a) exactly — never lighten it with opacity; maintain WCAG AA.

## Data model (Supabase)

```
pros        ( id, business, trade, service_area, logo, google_place_id, google_rating, plan, created_at )
homes       ( id, address UNIQUE, created_by_pro, claimed_by_homeowner NULL, claimed_at )
customers   ( id, pro_id, home_id, name, phone, email, consent_at, consent_ref )
jobs        ( id, pro_id, home_id, equipment_id, what_done, next_service_date, photo_url, created_at )
equipment   ( id, home_id, type, make, model, serial, warranty_until, recall_status, recall_checked_at )
records     ( id, job_id, public_url, sent_sms_at, sent_email_at, viewed_at )
homeowners  ( id, phone, email, created_at )
invites     ( id, home_id, from_homeowner, to_pro_name, to_pro_phone, trade, status, created_at )
messages    ( id, channel, to_contact, body, kind, created_at )
events      ( id, actor, type, props, created_at )
```

Home is keyed by **address**. RLS: a pro sees only their own data; a homeowner sees only their claimed home; the public record page is readable by anyone with the link.

## Events (wire on every loop hook)

`pro_activated`, `record_sent`, `record_viewed`, `home_claimed`, `pro_invited`, `second_pro_added`, `rebooked`, `review_requested`. These ARE the validation metrics — do not skip them when building new flows.

## Compliance (hard rules)

- Capture + store consent when a pro adds a homeowner (done on log-a-job step 1 — keep it).
- **No review gating** — every homeowner gets the same Google review ask; show a private feedback path to everyone.
- Do not send real SMS/email until A2P 10DLC is registered. Keep mocks until then.

## Conventions

- Routes follow the Screen inventory. Pro routes under `/pro/*`, homeowner under `/home/*`, public record/claim at `/r/:id` and `/claim/:id`.
- One shared OTP/auth component; role determines post-login redirect (`/pro` vs `/home`).
- Prefer small, composable components; reuse the KV-row, chip, and card primitives already in the codebase.
- Keep v0 ruthlessly on the loop + the priority list above. New feature ideas go to the Notion roadmap/parking lot, not into v0.

## Working agreement

- This repo is now the source of truth; Lovable syncs from GitHub. Avoid editing the same area in Lovable and Claude Code at once. Pull before you push.
- When you add or finish a screen, update its Status in the Notion Screen inventory so the KB stays true.
