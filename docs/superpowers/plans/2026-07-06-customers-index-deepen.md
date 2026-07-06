# Customers Index CRM Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HubSpot's remaining index features to `/pro/customers`: bulk select + actions, row hover preview, editable columns, saved views.

**Architecture:** All client-side. `crm.tsx` gains a `SlideOver` panel and closable tabs; the index route gains a column registry, selection state, saved-view state, bulk handlers, and a CSV builder. Preferences persist in localStorage (`hb_customers_columns`, `hb_customers_views`).

**Tech Stack:** unchanged (TanStack Start, React 19, Tailwind v4, Supabase client, Bun).

**Spec:** `docs/superpowers/specs/2026-07-06-customers-index-deepen-design.md`

## Global Constraints

Same as the previous plan: no em dashes; indigo brand / coral payoff only (bulk nudge button, Claimed pill); never edit generated files; migrations only via repo sync (none needed here); verify with prettier/eslint/tsc on touched files plus `bun run build` (repo-wide lint baseline already fails on pre-existing prettier issues); Bun.

---

### Task 1: crm.tsx additions (SlideOver, closable tabs)

**Files:**
- Modify: `src/components/crm.tsx`

**Interfaces:**
- `UnderlineTabs` tabs items gain optional `closable?: boolean`; new optional prop `onClose?: (key: string) => void`. Closable tabs render a small X after the label that calls `onClose` (with propagation stopped) instead of activating the tab.
- New `SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode })`: returns null when closed; otherwise a `fixed inset-0 z-50` layer with an `bg-ink/30` overlay (click closes) and a right-anchored `max-w-md` full-height white panel with a header (title + X button) and scrollable body.

- [ ] Implement both, keeping existing exports untouched.
- [ ] Verify: `bunx prettier --check src/components/crm.tsx && bunx eslint src/components/crm.tsx` clean; `bunx tsc --noEmit` reports nothing for crm.tsx.
- [ ] Commit: "Add SlideOver panel and closable tabs to CRM kit"

### Task 2: Editable columns + saved views state

**Files:**
- Modify: `src/routes/pro.customers.index.tsx`

**Interfaces (produces, used by Task 3/4):**
```ts
type ColKey = "address" | "phone" | "email" | "jobs" | "lastJob" | "nextService" | "status";
const ALL_COLUMNS: { key: ColKey; label: string; sortKey: SortKey }[];
const DEFAULT_COLUMNS: ColKey[] = ["address", "phone", "jobs", "lastJob", "nextService", "status"];
type SavedView = {
  id: string;
  name: string;
  claimedFilter: string;
  lastJobFilter: string;
  q: string;
  sort: { key: SortKey; dir: "asc" | "desc" };
};
```
- `cols: ColKey[]` state, hydrated from localStorage `hb_customers_columns` (filter unknown keys, fall back to defaults), written back on every change.
- `views: SavedView[]` state, hydrated from localStorage `hb_customers_views`, written back on change.
- `activeTab: string` replaces the old `tab` state: one of the four preset keys or a saved view id. Selecting a preset filters as before; selecting a view id applies `claimedFilter/lastJobFilter/q/sort` from the view and filters with the base "all" set.
- Add `email` column support: sortKey "email" added to `SortKey` and `compare` (localeCompare on email).
- Query change: jobs selection becomes `jobs(id,created_at,next_service_date,what_done)`; `CustomerRow.jobs` type gains `what_done: string`.
- Tab row: presets (with counts) + saved views (`closable: true`) + a `{ key: "__add", label: "+ Add view" }` tab. `onChange("__add")` opens the inline add-view form (name Input + Save/Cancel) below the tabs instead of switching tabs. `onClose(viewId)` confirms then deletes; if it was active, fall back to "all".
- Table header renders `SortableTh` per visible column from `ALL_COLUMNS`; body cells render per column via a `renderCell(d: Derived, col: ColKey)` switch reusing the existing cell markup.
- "Edit columns" link (right-aligned above the table) opens a `SlideOver` listing `ALL_COLUMNS` with a checkbox (min one column enforced) and up/down arrow buttons per visible column to reorder.

- [ ] Implement; verify prettier/eslint/tsc on the file; manual: toggling and reordering columns survives reload; creating/applying/deleting a view works.
- [ ] Commit: "Add editable columns and saved views to customers index"

### Task 3: Bulk select + actions

**Files:**
- Modify: `src/routes/pro.customers.index.tsx`

- `selected: Set<string>` state; cleared by a `useEffect` when `sorted` identity changes filters (watch `[activeTab, claimedFilter, lastJobFilter, q]`).
- Checkbox `<th>`/`<td>` first in the table (before Name). Row checkbox toggles its id (`onClick` stops propagation). Header checkbox checked when every `pageRows` id is selected; toggling selects/clears the page.
- When the full page is selected and `sorted.length > pageRows.length`, show a line above the table: "All N on this page selected · Select all M in this view" (button adds every sorted id).
- When `selected.size > 0`, swap the filter row for a bulk bar: "N selected", `Btn variant="coral" size="sm"` "Send rebook nudge" (loading state), `Btn variant="secondary" size="sm"` "Export CSV", ghost "Clear".
- `bulkNudge()`: iterate selected ids sequentially; for each derived row with `c.phone ?? c.email`, compute the nudge body: use the customer's job with a `next_service_date` (`jobs.find`) for the specific message (same copy as the record page), else the generic service-check body; `await mockSend({ channel, to, body, kind: "other" })` then `await logEvent(\`pro:${proId}\`, "rebook_nudge_sent", { job_id, customer_id })`. Count sent vs skipped (no contact); toast "Nudges sent to X customers (mock)" + ", Y skipped (no contact)" when Y > 0; clear selection.
- `exportCsv()`: header row `Name,Address,Phone,Email,Jobs,Last job,Next service,Status`; one line per selected derived row (CSV-escape values containing commas/quotes by wrapping in quotes and doubling quotes); `new Blob([csv], { type: "text/csv" })`, temp `<a download="customers.csv">` click, revoke URL.

- [ ] Implement; verify prettier/eslint/tsc; manual: select page, select all in view, nudge writes a messages row + event and toasts, CSV file contains exactly the selected rows.
- [ ] Commit: "Add bulk selection with nudge and CSV export to customers index"

### Task 4: Row hover preview

**Files:**
- Modify: `src/routes/pro.customers.index.tsx`

- `previewId: string | null` state. In the Name cell, a `Preview` `Btn variant="secondary" size="sm"` appears on row hover (`opacity-0 group-hover:opacity-100`, add `group` to the `<tr>`), `onClick` stops propagation and sets `previewId`.
- `SlideOver open={!!preview} title="Customer preview"`: avatar + name + address + Claimed/Unclaimed pill; KV rows for Phone, Email, Jobs count, Next service; "Recent jobs" list (up to 3: `what_done` + date, sorted desc by `created_at`); footer: `Btn variant="indigo"` "Open full record" (navigates to the detail route) and a "Log a job" link.

- [ ] Implement; verify prettier/eslint/tsc; `bun run build` passes; manual: hover shows the button, panel opens with correct data, both footer actions navigate, overlay click closes.
- [ ] Commit: "Add row hover preview panel to customers index"

### Task 5: Final verification

- [ ] `bun run build` exit 0; em dash grep over touched files returns nothing.
- [ ] Live pass on `bun dev` covering the spec's verification list.
- [ ] Record page (`/pro/customers/:id`) unaffected (UnderlineTabs backward compatible).
