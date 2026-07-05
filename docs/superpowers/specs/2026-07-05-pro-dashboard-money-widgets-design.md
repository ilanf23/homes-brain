# Pro dashboard money-first widgets - design

Date: 2026-07-05
Status: approved for planning

## Goal

Enrich the `/pro` dashboard home page (`src/routes/pro.index.tsx`) with three widgets that make the payoff of HomesBrain visible to the pro: a rebooked counter, a review tracker, and a win feed. Frontend code only: no schema changes, no migrations, existing tables only.

## Scope

- One route file changes: `src/routes/pro.index.tsx` (plus small extracted components if the file grows unwieldy, following the repo preference for small composable components).
- Build from the `src/lib/ui.tsx` kit (Card, Eyebrow, Pill, KV) and existing `src/components/svg.tsx` primitives (CountUp, SparkLine) where useful.
- No new events are logged: this is a read surface. All canonical loop events already fire elsewhere.

## Widgets

### 1. Rebooked counter (coral payoff card)

- New row directly under the existing 4-card stat row. This card takes roughly 2/3 width on desktop, stacking on mobile.
- Data: `events` table, `type = 'rebooked'` and `props->>pro_id = proId`.
- Shows a large coral count, split as "this month / all time", with a coral pill such as "Rebooked via HomesBrain".
- Counts only, no dollar amounts: there is no job-value column and schema changes are out of scope.
- Empty state: quiet, indigo-neutral copy: "When homeowners rebook from their HomesBrain reminders, wins land here."
- Coral usage stays within the brand rule (payoff highlights only, roughly 10% of color).

### 2. Review tracker

- Compact card completing the new row (roughly 1/3 width on desktop).
- Data: `pros.google_rating` (already loaded via the pro guard) and count of `events` where `type = 'review_requested'` and `actor = 'pro:{proId}'`.
- Shows the Google rating, the number of review requests sent, and a link to `/pro/reviews`.
- Indigo accents throughout: this is status, not payoff.

### 3. Win feed

- Full-width card below the existing "Recent jobs | Due/Customers" row: the payoff centerpiece.
- Reverse-chronological merged timeline, top 10 entries, from four sources merged client-side:
  - Record viewed: from `records.viewed_at` joined through the pro's jobs. Copy: "{customer} viewed their service record".
  - Home claimed: from `homes` where `created_by_pro = proId` and `claimed_at` is not null. Copy: "{address} was claimed by the homeowner".
  - Rebooked: from `events` (`type = 'rebooked'`, `props->>pro_id = proId`), joined to the job via `props.job_id` for customer/job context. Copy: "{customer} rebooked from their reminder". Coral pill on these entries only.
  - Review requested: from `events` (`type = 'review_requested'`, `actor = 'pro:{proId}'`), joined to the customer via `props.customer_id`. Copy: "Review requested from {customer}".
- All non-rebook entries use indigo/ink styling.
- Empty state: "Wins from your records (views, claims, rebooks) will show up here."

## Data flow

- Extend the existing `Promise.all` in `pro.index.tsx` with the additional Supabase queries (events by type, claimed homes). The dashboard already fetches jobs with nested records, which covers the record-viewed source.
- Loading uses the existing `ProPageSkeleton` pattern; no per-widget spinners.
- Timestamps: month bucketing for the rebooked counter uses the event `created_at` against the current calendar month.

## Layout after the change

1. Existing 4-card stat row (unchanged).
2. New row: Rebooked counter (2/3) + Review tracker (1/3).
3. Existing row: Recent jobs | Due/Customers tab card (unchanged).
4. New: Win feed, full width.

## Error and empty handling

- Every widget renders a sensible empty state for a brand-new pro with no data.
- Risk to verify during implementation: this is the first client-side read of the `events` table. If RLS blocks selects, the rebooked counter and the event-driven feed entries degrade to their empty states, and we flag it to the user rather than adding migrations (out of scope).

## Verification

- No test suite exists. Verify by running `bun dev`, logging in as a pro with seeded loop activity (log a job, view the record as the homeowner, claim, rebook from reminders), and confirming each widget populates and each empty state renders for a fresh pro.
