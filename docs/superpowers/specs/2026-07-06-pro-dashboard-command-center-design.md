# Pro dashboard command center redesign - design spec

Date: 2026-07-06
Status: approved in brainstorming, pending implementation plan

## Goal

Redesign the `/pro` dashboard (`src/routes/pro.index.tsx`) into a command center: money-first KPIs that click through to the pages behind them, an action queue that turns problems into one-click work, a real customer map, and the old activity counts demoted to a secondary strip. Every number leads somewhere; every problem has an inline action.

Related work: the customers CRM redesign (`2026-07-06-pro-customers-crm-design.md`) is being handled separately in another session. This spec does not touch `/pro/customers` pages; dashboard widgets deep-link to whatever those pages currently are.

## Scope

In scope:

- Rewrite `src/routes/pro.index.tsx`.
- New component `src/components/customer-map.tsx`.
- New `BarChart` primitive in `src/components/svg.tsx`.
- `geocodeAddress()` helper in `src/lib/hb.ts` plus a geocode call in `src/routes/pro.jobs.new.tsx` when a home is created.
- One Supabase migration adding `lat`, `lng`, `geocoded_at` to `homes`.
- New dependency: `maplibre-gl` (free OSM raster tiles, no API key). The bunfig supply-chain guard applies at install; confirm with the user if it blocks.

Out of scope: changes to `/pro/customers`, `/pro/invoices`, `/pro/due` pages; real payments; server-side aggregation; saved dashboard preferences; clustering on the map.

## Page layout, top to bottom

1. Existing `ProPageHead` and the first-job onboarding card (unchanged, still only when the pro has zero jobs).
2. Money headline row: four KPI tiles plus the revenue chart.
3. Action queue card: "Needs attention".
4. Customer map, full width.
5. Activity strip: three slim tiles.
6. Bottom row: Recent jobs (unchanged) beside the Win feed (capped at 5).

Mobile: everything stacks in the same order; map height drops to 300px.

## 1. Money headline row

Grid: 4 tiles (2x2 on mobile) beside the chart; at `lg` the tiles take roughly half the width and the chart the other half.

Tiles (all client-side aggregates of one invoices query):

- **Billed this month**: sum of `invoices.total` where `created_at` is in the current calendar month and `status != 'void'`. Links to `/pro/invoices`.
- **Collected this month**: sum of `invoices.total` where `paid_at` is in the current calendar month. Links to `/pro/invoices`.
- **Outstanding**: all-time sum of `invoices.total` where `status = 'open'`. Value renders coral when > 0 (money waiting is a payoff moment). Links to `/pro/invoices`.
- **Rebooked**: this-month count of `events` where `type = 'rebooked'` and `props->>pro_id = proId` (query already exists on the page), coral count, "all time" subtext. Links to `/pro/due`.

Currency formatting: `Intl.NumberFormat` USD, no cents, `tnum` class.

**Revenue chart**: new `BarChart` primitive in `src/components/svg.tsx`, styled like the existing `SparkLine`/`ProgressRing` (plain SVG, brand tokens, no chart library). Six calendar months including the current one. Two series per month: billed as light bars (`--indigobg` fill with an indigo border) and collected as solid indigo bars. No coral in the chart; coral stays reserved for the Outstanding and Rebooked tiles. Month initials on the x axis, no y axis, values on hover via `title`. Above the chart a one-line readout: "{rate}% collected over 6 months" where rate = collected / billed for the window (omit when billed is 0). Empty state (zero invoices ever): muted copy "Invoices you send will chart here." with a link to `/pro/invoices/new`.

## 2. Action queue: "Needs attention"

One full-width card replacing the current due/customers tab card. A merged list, urgency sorted, max 8 rows, each row a problem plus an inline action:

Sources:

1. **Due or overdue for service**: jobs with `next_service_date` in the past or within 14 days. Row: customer name, address, due date (amber pill, red-tinted copy when overdue). Action: **Nudge** button with the exact behavior of `/pro/due` (`mockSend` rebook nudge + `logEvent("rebook_nudge_sent", ...)`), disabled with a hint when the customer has no phone or email. After a nudge, the row shows a "Nudged" state for the session.
2. **Open invoices past due**: `status = 'open'` and `due_date` in the past. Row: customer name, amount, days overdue. Actions: **Mark paid** (same update as the invoices page: `status = 'paid'`, `paid_at = now()`) and a link to `/pro/invoices`.
3. **Unclaimed homes going stale**: homes created by this pro, `claimed_at` null, whose most recent record was sent 7+ days ago. Row: address, customer name, "sent {n} days ago". Action: **Remind** button: `mockSend` a claim reminder to the customer's phone or email and `logEvent("claim_nudge_sent", { home_id, customer_id })`. Disabled with a hint when no contact info.

Ordering: overdue service first (most overdue first), then overdue invoices (most overdue first), then stale unclaimed (oldest send first). Header shows a count ("Needs attention (5)"). "View all" links in the card footer to `/pro/due` and `/pro/invoices` when those sources are truncated.

Empty state: "You're all caught up." with a muted check icon.

## 3. Customer map

Full-width `Card` containing a MapLibre GL map, ~380px tall (300px below `md`).

### Data plumbing

Migration (`supabase/migrations/`, ships via repo/Lovable sync, never through the Supabase MCP):

```sql
ALTER TABLE public.homes
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION,
  ADD COLUMN geocoded_at TIMESTAMPTZ;
```

After it lands, regenerate `src/integrations/supabase/types.ts` through the normal Lovable type-gen path; do not hand-edit.

Geocoding helper in `src/lib/hb.ts`:

- `geocodeAddress(address: string): Promise<{ lat, lng } | null>` calling the Nominatim search API (`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=...`). Include a descriptive `User-Agent`-style identification (browser fetch cannot set User-Agent, so pass an `email` query param per Nominatim policy). Return null on no match or error; never throw to the caller.
- Rate limit: 1 request per second. Callers are responsible for sequencing.

Write points:

- **Log a job** (`pro.jobs.new.tsx`): when a new home row is created, fire-and-forget geocode and update `lat/lng/geocoded_at`. Failure is silent (the home just stays unpinned until backfill).
- **Dashboard lazy backfill**: on dashboard load, take up to 5 of this pro's homes where `geocoded_at` is null, geocode them sequentially (1s apart), update the rows, and merge results into local state so pins appear without reload. Homes that fail to geocode still get `geocoded_at` stamped so they are not retried every visit.

### Rendering

`src/components/customer-map.tsx`:

- MapLibre GL with the OSM raster tile source (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution shown as required). Slight CSS desaturation on the canvas so the map sits inside the warm paper aesthetic.
- One pin per home with coordinates. Pin color by status priority (first match wins):
  1. Coral: customer has an open invoice.
  2. Amber: any job at the home is due or overdue for service (same 14-day window as the queue).
  3. Ink: home unclaimed.
  4. Indigo: claimed and healthy.
- Legend chips above the map (All / Owes money / Due for service / Unclaimed / Active) doubling as filters; chips reuse the `Pill` styling with counts.
- Clicking a pin opens a popup: customer name, address, status pill, "Open customer" link to `/pro/customers/$customerId`.
- Map fits bounds to visible pins on load and when the filter changes (single pin: fixed zoom ~13).
- Empty state (no geocoded homes yet): no map canvas; the card shows "Your service area appears here as customers are added." plus, when there are homes still geocoding, "Placing {n} homes on the map..." while the backfill runs.

MapLibre CSS imports via the package stylesheet; lazy-load the map component (`React.lazy` or dynamic import) so the ~200KB library does not block the dashboard when there is nothing to show.

## 4. Activity strip and bottom row

Slim 3-tile strip below the map (smaller type than the money row):

- **Records sent**: count with the existing weekly `SparkLine`.
- **View rate**: percentage with the existing `ProgressRing`; subtext "{viewed} of {sent} viewed".
- **Customers**: count, links to `/pro/customers`.

Bottom row unchanged in structure: **Recent jobs** card as it exists today, beside the **Win feed** with the same sources and copy but capped at 5 entries.

## 5. Data flow

Extend the existing `Promise.all` in `pro.index.tsx` with:

- `invoices`: `id, total, status, due_date, paid_at, created_at, customer_id, customers(name)` for this pro.
- The homes query widens to include `lat, lng, geocoded_at, claimed_at` for all homes created by the pro (currently it fetches only claimed homes; the win feed keeps filtering claimed client-side).

All aggregation stays client-side. Loading keeps `ProPageSkeleton variant="dashboard"`. Mutations (nudge, mark paid, remind) surface errors via the existing `Toast` and update local state optimistically only after success.

## 6. Brand rules applied

- Indigo everywhere by default: tiles, chart bars, pins for healthy customers, links, chips.
- Coral only on payoff and money-at-stake: Outstanding value, Rebooked tile, owes-money pins. Stay near the 10 percent guideline.
- Amber strictly functional: due-for-service pills and pins.
- Red only for overdue copy emphasis and errors.
- Currency and dates in `tnum`; secondary text exactly `--muted`; cards on white with `--line` borders; `font-app` as on all pro portal pages. No em dashes in any copy.

## 7. Events

No new canonical loop events. `rebook_nudge_sent` keeps its existing shape. New non-canonical event `claim_nudge_sent` (`{ home_id, customer_id }`) mirrors the rebook nudge pattern. This page remains a read surface otherwise.

## 8. Verification

No test suite. Verify with `bun dev`:

1. Seed a pro with jobs, invoices (open, paid, past due), a mix of claimed/unclaimed homes, and rebook/review events.
2. Money row: each tile value matches hand-computed sums; each tile links correctly; chart renders 6 months and the collected readout is right; empty states for a fresh pro.
3. Action queue: all three sources appear, ordering is correct, Nudge sends a message row and logs the event, Mark paid updates the invoice, Remind logs `claim_nudge_sent`, disabled states show hints, empty state renders when nothing is due.
4. Map: new home geocodes on job log; backfill places up to 5 ungeocoded homes; pin colors match status; legend filters work; popup links to the customer; empty state for a fresh pro; map lazy-loads without breaking SSR (guard for `window`).
5. Activity strip and win feed still populate; win feed caps at 5.
6. `bun run lint` and `bun run build` pass.
