# Pro customers CRM redesign - design spec

Date: 2026-07-06
Status: approved in brainstorming, pending implementation plan

## Goal

Restyle the pro customers area into a HubSpot-style CRM: the customers index becomes a filterable, sortable table with view tabs, and the customer detail page becomes a three-column record view (properties left, activity timeline middle, association cards right). HubSpot provides the layout, information architecture, and interactions; HomesBrain provides the visual skin (indigo brand, warm paper neutrals, existing `src/lib/ui.tsx` primitives, `font-app`).

## Scope

In scope:

- Rewrite `src/routes/pro.customers.index.tsx` (index) and `src/routes/pro.customers.$customerId.tsx` (detail).
- New shared component kit `src/components/crm.tsx`.
- One Supabase migration adding a `customer_notes` table with RLS.
- Optional `wide` prop on `ProShell` (`src/components/pro-shell.tsx`).

Out of scope (explicitly not v0): checkbox bulk actions, saved custom views, editable table columns, row-hover preview panel, tasks table, property history, drag-to-reorder cards, real email or SMS sends.

## 1. Index page: `/pro/customers`

Layout, top to bottom, inside `ProShell active="customers"`:

1. **Header row**: "Customers" title with a live count subtitle ("24 customers"). Primary action on the right: "Log a job" button linking to `/pro/jobs/new` (customers are created through the log-a-job loop; there is no standalone create-customer form).
2. **View tabs** (underline style, client-side presets, no persistence):
   - All
   - Claimed (`homes.claimed_at` not null)
   - Unclaimed (`homes.claimed_at` null)
   - Due for service (any job with `next_service_date` in the past or next 30 days)
3. **Filter bar**: quick-filter `Select` dropdowns for Claimed status (Any / Claimed / Unclaimed) and Last job (Any time / 30 days / 90 days / 365 days), plus the existing search input (matches name, phone, email, address). A "Clear all" text button appears only when a filter or search is active. Tabs and filters compose (tab narrows first, then filters).
4. **Table** (rendered at `md` and up):
   - Columns: Name (initials `Avatar` + name, links to the detail page, the anchor column), Home address, Phone, Jobs (count), Last job (date), Next service (date, amber pill when overdue or within 30 days), Status ("Claimed" coral pill or "Unclaimed" ink pill).
   - Column headers sort on click (asc/desc toggle, chevron indicator). Default sort: created date desc.
   - Client-side pagination, 25 rows per page, Prev / page numbers / Next footer. Pagination controls hidden when one page.
5. **Mobile** (below `md`): the same filtered/sorted data renders as the existing card-row list (avatar, name, address, phone, job count, claimed pill). No horizontal-scrolling table on phones.
6. **States**: loading uses `ProPageSkeleton variant="list"`. Zero customers keeps the current empty-state card with the "Log a job" CTA. Zero results after filtering shows an inline "No customers match" line with the Clear all action.

Data: the existing single query on `customers` (with joined `homes` and `jobs`) already returns everything the table needs; add `next_service_date` to the jobs selection. All tab/filter/sort/pagination logic is client-side.

## 2. Detail page: `/pro/customers/:customerId`

Three-column grid at `lg` and up: `lg:grid-cols-[300px_minmax(0,1fr)_320px]`, gap 6. Below `lg` the columns stack in order: left header/about, middle timeline, right associations. A slim back bar above the grid keeps the current "Back to customers" link.

`ProShell` gains an optional `wide?: boolean` prop: when true, `main` uses `max-w-7xl` instead of `max-w-5xl`. Only this page passes it. No other pages change.

### 2.1 Left column

1. **Identity header**: large initials `Avatar` (size up), customer name (headline weight), home address as a muted subtitle, then muted phone and email lines.
2. **Action button row**: four circular icon buttons with tiny labels underneath, HubSpot style, indigo accents:
   - **Note**: scrolls to and focuses the middle-column note composer.
   - **Job**: links to `/pro/jobs/new`.
   - **Invoice**: links to `/pro/invoices/new` with `search={{ customer: customerId }}` (matches the existing prefill pattern).
   - **Nudge**: sends the existing mock rebook nudge (same behavior as `/pro/due`: `mockSend` plus `logEvent("rebook_nudge_sent", ...)`), disabled with a hint when the customer has no phone or email.
3. **"About this customer" card** (collapsible, chevron in header):
   - Inline-editable properties: Name, Phone, Email. Hover a row to reveal a pencil icon; clicking swaps the value for an `Input` with Save/Cancel; Save writes to `customers` and updates local state. Basic validation only (non-empty name; phone and email may be cleared).
   - Read-only rows: Consent (date from `consent_at`, or "No consent on file" with a red pill), Customer since (`created_at`), Home claimed (claimed date or "Not yet claimed").

### 2.2 Middle column

1. **Tabs** (underline style): **Activity / Notes / Jobs / Invoices**. All four render the same timeline component; Notes, Jobs, and Invoices filter it to those item types. Activity shows everything.
2. **Note composer**, pinned above the timeline: a `Textarea` with placeholder "Leave a note about {first name}...", collapsed to one line until focused, with a Save note `Btn`. Save inserts into `customer_notes`, clears the composer, and prepends the note to the timeline. Visible on the Activity and Notes tabs.
3. **Timeline**: merged, reverse-chronological items grouped under month headings ("July 2026"). Each item is a card row with:
   - Type icon (lucide), bold title, right-aligned timestamp.
   - Expand/collapse chevron; collapsed shows a one-line preview, expanded shows the full body.
   - A context link where relevant: job items link to `/pro/records/$recordId` when a record exists; invoice items link to the invoices page.
   - Item types and sources:
     - **Note** (`customer_notes.body`); expanded notes show a Delete action (own notes only, confirm before delete).
     - **Job logged** (`jobs.what_done`, `created_at`).
     - **Record sent** (`records.sent_sms_at` or `sent_email_at`).
     - **Record viewed by homeowner** (`records.viewed_at`).
     - **Invoice created / Invoice paid** (from the invoices helper; paid uses the paid timestamp when present, otherwise status).
     - **Nudge sent** (`events` where `type = "rebook_nudge_sent"` and `props->>customer_id` matches).
   - Empty state: "No activity yet. Log a job at this home to start the record." with a Log a job link.
4. No timeline search, assigned-to filters, or pinning in v0. The tab row is the only filter.

### 2.3 Right column

Stack of collapsible association cards, each with a count in the header ("Jobs (5)"), a chevron, and an add/view action on the right where applicable:

1. **Home (1)**: address, "Claimed" coral pill or "Unclaimed" ink pill. When claimed, the linked homeowner's contact rows (phone, email) render inside this card (replaces the current separate "Linked homeowner" card). When unclaimed, a muted "The homeowner has not claimed this home yet" line.
2. **Jobs (n)**: the 3 most recent jobs as small preview rows (what was done, date). "View all" in the header switches the middle column to the Jobs tab. "+ Add" links to `/pro/jobs/new`.
3. **Equipment (n)**: preview rows with type and make/model, plus warranty pill (amber when expiring or expired) and recall pill (red when flagged), matching current pill logic.
4. **Invoices (n)**: open balance summary line at the top (bold, coral when money is owed), then the 3 most recent invoices with status pills and the existing Mark paid action. "+ New invoice" links to `/pro/invoices/new` prefilled with the customer.

Collapse state is per-card, local component state only (no persistence).

### 2.4 States

Loading uses `ProPageSkeleton`. Not-found keeps the current centered card with "Back to customers". All mutations (inline edit, note save, note delete, mark paid, nudge) surface errors via the existing `Toast`.

## 3. Component kit: `src/components/crm.tsx`

New shared primitives, all styled with the existing brand tokens and `Accent` types:

- `CollapsibleCard({ title, count?, action?, defaultOpen?, children })`: card with chevron header, used by About and all right-column cards.
- `PropertyRow({ label, value, onSave?, readOnly? })`: label-above-value row with hover pencil and inline edit; `onSave` async, shows saving state.
- `ActionCircle({ icon, label, onClick? | to?, disabled?, hint? })`: circular icon button with a tiny label underneath.
- `Timeline({ items, filter? })` and `TimelineItem` (icon, title, timestamp, expandable body, optional link, optional onDelete): month grouping lives in `Timeline`.
- `SortableTh({ label, active, dir, onSort })`: table header cell with sort chevron.
- `FilterSelect({ label, value, options, onChange })`: quick-filter dropdown for the index toolbar.
- `UnderlineTabs({ tabs, active, onChange })`: underline-style tab row used by both pages.

Routes stay thin and compose these. If any of these grow past a screen of code, split `crm.tsx` into a `crm/` folder.

## 4. Data changes

One migration in `supabase/migrations/` (ships via the repo/Lovable sync, never applied through the Supabase MCP):

```sql
create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pros(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
-- RLS: enable; pros can select/insert/update/delete only rows where pro_id = my_pro_id()
```

`pinned` is stored but unused in v0 UI (cheap future-proofing, no UI). After the migration lands, regenerate `src/integrations/supabase/types.ts` through the normal Lovable/Supabase type-gen path; do not hand-edit it.

No changes to any other table. No new events are required; `rebook_nudge_sent` keeps firing exactly as it does on `/pro/due`.

## 5. Brand rules applied

- Indigo everywhere: tabs, links, action circles, sort indicators, focus states.
- Coral only on existing payoff moments: the Claimed pill and the open-balance highlight.
- Amber only for functional status: next service due, warranty expiring.
- Red only for recall flags, missing consent, errors.
- Warm paper neutrals for the page; cards on white with `--line` borders, 16 to 22px radius; secondary text exactly `--muted`.
- `font-app` (Schibsted Grotesk) as on all pro portal pages. No em dashes in any copy.

## 6. Verification

No test suite exists. Verify by running `bun dev` and exercising:

1. Index: tabs, each filter, search, column sorting, pagination past 25 rows (seed if needed), mobile card fallback, empty and no-match states.
2. Detail: three columns at desktop width, stacking on mobile, inline edit save and cancel, note create and delete, timeline tab filtering, month grouping order, nudge send (message row appears, event logged), Mark paid, all links (job record, invoices, log a job).
3. `bun run lint` and `bun run build` pass.
4. Confirm no other pro pages regressed from the `ProShell` `wide` prop (prop defaults off).
