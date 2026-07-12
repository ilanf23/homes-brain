# HomesBrain - Claude Code project guide

> Drop this file at the **repo root**. Claude Code loads it automatically every session.
> It is the standing context for how to build HomesBrain. The full knowledge base lives in Notion (HomesBrain OS); this is the working summary.

## What we're building

HomesBrain is "a Carfax for homes that writes itself." Home-service pros (water treatment, HVAC, plumbing, electrical, appliance repair) log a job in ~30 seconds; a branded service record is sent to the homeowner, who claims it free and owns it for life. The pro gets reviews, rebookings, and a professional record; the homeowner gets a home that remembers itself with zero effort; every job deepens a verified, portable record.

**The core loop (already built):** pro signs up free → logs a job → branded record sent (mocked) → homeowner opens it with no login → claims the home → invites their other pros. This loop works. The job now is to build out everything around it.

## Current status

Built (route files exist and are wired):

- Core loop: pro signup (`/pro/signup`), log-a-job (`/pro/jobs/new`), public record (`/r/:id`), claim (`/claim/:id`).
- Login + role routing (`/login`) - mock OTP, redirects pro → `/pro`, homeowner → `/home`.
- Homeowner side: `/home`, item detail (`/home/items/:itemId`), my pros, add-to-home, reminders, settings.
- Pro side: dashboard, customers list + detail, records list + detail, due-for-service, reviews, settings, referral.
- Verified public pro profile (`/pro/:city/:trade/:business`) + marketing/SEO pages (landing, for-pros, for-homeowners, how-it-works, about, blog, partners, legal).

**Not built:** payments (Stripe Connect, v0.5); real auth (see Stack - sessions are mocked); real SMS/email (blocked on compliance).

The authoritative screen-by-screen map (routes, data, states, status) is the **Screen inventory & app spec** page in Notion. Build against it, and cross-check status there - this list can drift.

## Commands

Bun is the package manager (`bun.lock`, `bunfig.toml` with a 24h supply-chain guard - confirm with the user before adding excludes).

```
bun install       # deps
bun dev           # dev server (vite dev)
bun run build     # production build
bun run lint      # eslint
bun run format    # prettier --write .
```

There is no test suite. Verify changes by running the dev server and exercising the flow.

## Stack

- **TanStack Start** (SSR) + React 19 + TypeScript + Tailwind v4, on the Lovable scaffold (`@lovable.dev/vite-tanstack-config`) - do not migrate frameworks without discussion.
- Supabase: Postgres, storage. Target is phone/email OTP auth (no passwords) with RLS, but **auth is currently mocked**: `src/lib/session.ts` stores `{role, proId|homeownerId}` in localStorage and fires a `hb_session_change` event. Real OTP is intentionally out of scope for v0.
- SMS/email are **mocked** for now: writing to a `messages` table + on-screen preview. Do NOT wire real Twilio/Resend yet - A2P 10DLC compliance is not cleared (see Compliance).
- Analytics: log events to an `events` table (and console) - see Events.

## Architecture

- **File-based routing** in `src/routes/` (see its README). Flat files with dots map to nested URLs: `pro.jobs.new.tsx` → `/pro/jobs/new`, `$param` for dynamic segments. `src/routeTree.gen.ts` is auto-generated - never edit it. `__root.tsx` is the only app shell (head, error/404 boundaries, React Query provider).
- **Layout shells** are plain components, not layout routes: `src/components/pro-shell.tsx` and `home-shell.tsx` wrap the pro/homeowner app screens; `marketing.tsx` holds the marketing-page nav/footer and section primitives.
- **`src/lib/hb.ts`** is the domain toolbox: `TRADES` list, `logEvent()` (events table + console), `mockSend()` (messages table), `buildRecordUrl()`, recall-check stub, date/initials formatters. Route loaders/components call Supabase directly via `@/integrations/supabase/client` - there is no separate API layer.
- **`src/lib/ui.tsx`** is the brand component kit - `Eyebrow`, `Pill`, `Card`, `KV`, `Btn`, `Field`/`Input`, `Toast`, `StepBar`, `OtpBoxes`, `Skeleton` - all keyed by an `Accent` type (indigo/coral/amber/red/ink) that encodes the brand rules below. Build app surfaces from these, not from `src/components/ui/` (the shadcn/ui set, kept for forms/dialogs where needed).
- **`src/integrations/supabase/`** - `client.ts` (browser), `client.server.ts` (service role, bypasses RLS - server functions only), `auth-attacher.ts`/`auth-middleware.ts`. All are Lovable-generated: do not edit directly. Database types live in `types.ts`.
- **Migrations** live in `supabase/migrations/` and ship via the repo/Lovable sync - do not apply schema changes through the Supabase MCP. Edge functions in `supabase/functions/` (e.g. `scan-nameplate`).
- **Blog** content is data-driven from `src/lib/blog.ts` - add a post object there and `/blog` + `/blog/:slug` (with JSON-LD) pick it up; no MDX/CMS.
- `vite.config.ts` delegates to `@lovable.dev/vite-tanstack-config`, which already bundles the TanStack/React/Tailwind/nitro plugins - adding them again breaks the build.

## Brand - use these tokens exactly

**Color carries meaning.** Notion is the canonical source: each color has a fixed role and they are never mixed. A pro CTA is teal; a homeowner CTA is coral; the brand mark, cross-cutting platform UI, and the AI/copilot are indigo; partner surfaces are amber; compliance and destructive states are red. Audiences are distinguished by color, copy, and structure together.

- **Indigo** = HomesBrain itself, the platform, the brand mark, cross-cutting UI, and the AI/copilot.
- **Teal** = pros / vendor side (buttons, accents, chips on pro surfaces).
- **Coral** = homeowners (buttons, accents, chips on homeowner surfaces).
- **Amber** = partners.
- **Red** = compliance, warnings, destructive states.

```css
--ink: #16160f;
--muted: #73706a;
--line: #e7e5de;
--bg: #ffffff;
--soft: #f7f6f1;
--indigo: #473fb0;
--indigobg: #eeedfd;
--indigo-dark: #2a2470; /* brand and platform */
--teal: #0f6e56;
--tealbg: #e6f5ee;
--teal-dark: #0d5d49;  /* pros */
--coral: #c2461f;
--coralbg: #fbeae2;
--coral-dark: #9c3a18; /* homeowners */
--amber: #8a5208;
--amberbg: #faf0db;    /* partners */
--red: #a32d2d;
--redbg: #fcebeb;      /* compliance / errors */
```


The warm paper neutrals (ink / soft / line) carry the personality - a beautifully kept ledger. On accent tint backgrounds (`*bg`), use the `*-dark` text tone where the strong tone fails AA.

- Type: Plus Jakarta Sans site-wide (marketing, portal, public record - self-hosted via `@fontsource-variable/plus-jakarta-sans`, one family for everything including dates/codes; the `font-app` utility and `--font-mono` token remain as no-op compatibility hooks). Headlines weight 800, tight tracking (~-0.02em). Eyebrows: ~12px UPPERCASE bold, +0.14em, indigo (coral only on a payoff moment). Body 15–17px, line-height ~1.55. Dates and numeric columns keep alignment via the `tnum` utility (Jakarta has tabular figures).
- Components: fully rounded pill buttons; cards 16–22px radius on soft/white; KV rows (white, line border, muted key left / bold value right); chips/pills (999px, tint bg, accent text); phone mockups where useful. Rounded everything, generous whitespace, centered section headers.
- Keep secondary text at `--muted` (#73706a) exactly - never lighten it with opacity; maintain WCAG AA.

## Data model (Supabase)

```
pros        ( id, business, trade, service_area, logo, google_place_id, google_rating, plan, created_at )
homes       ( id, address UNIQUE, created_by_pro, claimed_by_homeowner NULL, claimed_at )
customers   ( id, pro_id, home_id, name, phone, email, consent_at, consent_ref, claim_invited_at )
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

`pro_activated`, `record_sent`, `record_viewed`, `home_claimed`, `pro_invited`, `second_pro_added`, `rebooked`, `review_requested`. These ARE the validation metrics - do not skip them when building new flows.

## Compliance (hard rules)

- Capture + store consent when a pro adds a homeowner (done on log-a-job step 1 - keep it).
- **No review gating** - every homeowner gets the same Google review ask; show a private feedback path to everyone.
- Do not send real SMS/email until A2P 10DLC is registered. Keep mocks until then.

## Conventions

- **Never use em dashes (U+2014), anywhere, ever**: not in copy, code comments, docs, commit messages, or generated content. Use a period, comma, colon, parentheses, or a plain hyphen instead. This applies to all writing in and about this project.
- Routes follow the Screen inventory. Pro routes under `/pro/*`, homeowner under `/home/*`, public record/claim at `/r/:id` and `/claim/:id`.
- One shared OTP/auth component; role determines post-login redirect (`/pro` vs `/home`).
- Prefer small, composable components; reuse the KV-row, chip, and card primitives already in the codebase.
- Keep v0 ruthlessly on the loop + the priority list above. New feature ideas go to the Notion roadmap/parking lot, not into v0.

## Working agreement

- This repo is now the source of truth; Lovable syncs from GitHub. Avoid editing the same area in Lovable and Claude Code at once. Pull before you push.
- **Never rewrite published git history** (force-push, rebase/amend/squash pushed commits) - Lovable mirrors the branch and the project history would be lost. Keep the connected branch in a working state.
- When you add or finish a screen, update its Status in the Notion Screen inventory so the KB stays true.
