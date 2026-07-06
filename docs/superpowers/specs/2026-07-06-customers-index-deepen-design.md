# Customers index CRM deepening - design spec

Date: 2026-07-06
Status: approved in brainstorming (user selected all four features), pending implementation plan
Builds on: `2026-07-06-pro-customers-crm-design.md` (the shipped CRM index and record page)

## Goal

Add the remaining HubSpot contacts-index features to `/pro/customers`, all client-side:

1. Bulk select + actions (nudge, CSV export)
2. Row hover preview (right slide-in panel)
3. Editable columns (choose + reorder, persisted)
4. Saved views (named filter/sort presets as tabs, persisted)

No schema changes. Nudges stay mocked (`mockSend` + `rebook_nudge_sent` events). Preferences persist in localStorage only (per browser, fine for v0 mock auth).

## 1. Bulk select + actions

- New leading checkbox column on the desktop table. Row checkbox clicks do not navigate (stop propagation). The mobile card list is unchanged (no bulk on mobile).
- Header checkbox selects/deselects the current page. When the whole page is selected and more filtered rows exist, a "Select all N in this view" link appears above the table; clicking selects the full filtered set.
- When selection is non-empty, the filter row is replaced by a bulk action bar: "N selected", then buttons: **Send rebook nudge** (coral, the payoff action), **Export CSV** (secondary), **Clear**.
- Send rebook nudge: for each selected customer that has a phone or email, send the same mock nudge body as the record page (uses their next-service job when one exists, generic body otherwise), then `logEvent("rebook_nudge_sent", { customer_id, job_id })`. Sequential sends with a loading state on the button. Toast summarizes: "Nudges sent to 4 customers (mock)" plus ", 2 skipped (no contact)" when applicable.
- Export CSV: builds a CSV of the selected rows (Name, Address, Phone, Email, Jobs, Last job, Next service, Status) and downloads it client-side as `customers.csv` via a Blob link. No data leaves the browser.
- Selection clears whenever the filtered set changes (tab, filters, search) to avoid acting on hidden rows.

## 2. Row hover preview

- Hovering a table row reveals a small "Preview" button next to the name (HubSpot pattern). Clicking it (not navigating) opens a right slide-in panel.
- Panel content, from data already loaded on the index: avatar + name + address, Claimed/Unclaimed pill, phone and email rows, job count, the 3 most recent jobs (what was done + date), next service date. Footer actions: "Open full record" (navigates to the detail page) and "Log a job" link.
- The index jobs selection adds `what_done` to power the job previews.
- Closes on overlay click or X. Only one preview open at a time.

## 3. Editable columns

- An "Edit columns" text link sits above the table on the right. It opens the same slide-in panel component with a checkbox list of available columns and up/down arrows to reorder.
- Available columns: Home address, Phone, Email, Jobs, Last job, Next service, Status. Name is locked first and not listed. Default visible set: Address, Phone, Jobs, Last job, Next service, Status (today's table). Email is available but off by default.
- Selection and order persist to localStorage key `hb_customers_columns` (array of column keys). Invalid/unknown stored keys are dropped on load.
- Table header and cells render from the column config; every column keeps its sort behavior.

## 4. Saved views

- The four default tabs stay (All, Claimed, Unclaimed, Due for service). After them, custom saved views render as closable tabs, then a "+ Add view" tab.
- "+ Add view" reveals a small inline name form (input + Save/Cancel) under the tab row; saving captures the current quick filters, search text, and sort as a named view.
- A saved view is `{ id, name, claimedFilter, lastJobFilter, q, sort }` stored in localStorage key `hb_customers_views` (array). Columns are global, not per view.
- Clicking a custom view applies its captured state; the tab stays active until another tab is picked (changing filters while on it does not auto-save; keep v0 simple, no dirty-state tracking).
- The X on a custom view tab deletes it (with `window.confirm`). Deleting the active view falls back to All.

## Component changes

- `src/components/crm.tsx`:
  - `UnderlineTabs` gains optional `closable?: boolean` per tab and `onClose?(key)` prop (backward compatible; record page unaffected).
  - New `SlideOver({ open, onClose, title, children })`: fixed right panel (max-w-md) with ink/30 overlay, used by both preview and edit-columns.
- `src/routes/pro.customers.index.tsx`: column registry, saved-view state, selection state, bulk handlers, CSV builder, preview panel wiring.

## Brand rules applied

Indigo for tabs, links, checkboxes focus; coral only on the bulk nudge button and Claimed pill (payoff); amber/red unchanged; muted text exact. No em dashes anywhere.

## Verification

`bun run build` passes; new/changed files lint clean (repo baseline prettier failures excluded). Live on `bun dev`: select rows and page, select-all-in-view, bulk nudge writes messages/events and toasts, CSV downloads with correct rows, preview opens/closes and links work, columns toggle/reorder/persist across reload, saved view round-trips (create, apply, delete) and persists across reload.
