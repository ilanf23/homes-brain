# Pro Customers CRM Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/pro/customers` into a HubSpot-style CRM: index becomes a filterable, sortable table with view tabs; detail becomes a three-column record view (properties left, activity timeline middle, association cards right).

**Architecture:** A new shared kit `src/components/crm.tsx` holds the CRM primitives (tabs, collapsible cards, inline-edit rows, timeline, table headers). The two route files are rewritten to compose the kit plus existing `src/lib/ui.tsx` primitives. One migration adds `customer_notes`; a new `src/lib/notes.ts` helper accesses it with the same untyped-cast pattern as `src/lib/invoices.ts` (generated types refresh on the Lovable sync). `ProShell` gains a `wide` prop for the three-column page.

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase JS client, lucide-react icons, Bun.

**Spec:** `docs/superpowers/specs/2026-07-06-pro-customers-crm-design.md`

## Global Constraints

- Never use em dashes (U+2014) anywhere: copy, comments, commits.
- Indigo is the brand accent; coral only for payoff moments (Claimed pill, open balance); amber only for due/warranty status; red only for recalls, missing consent, errors.
- Secondary text is `text-muted` exactly; never opacity-lightened.
- Do not edit `src/routeTree.gen.ts` or `src/integrations/supabase/types.ts` (both generated).
- Never apply migrations through the Supabase MCP; the SQL file ships via the repo/Lovable sync.
- No test suite exists: each task verifies with `bun run lint` (expect exit 0) and the final task exercises flows on `bun dev`.
- Package manager is Bun.

---

### Task 1: `customer_notes` migration + notes helper

**Files:**
- Create: `supabase/migrations/20260706130000_customer_notes.sql`
- Create: `src/lib/notes.ts`

**Interfaces:**
- Produces: `CustomerNote` type `{ id: string; pro_id: string; customer_id: string; body: string; pinned: boolean; created_at: string }`; `listNotes(proId: string, customerId: string): Promise<CustomerNote[]>`; `addNote(args: { proId: string; customerId: string; body: string }): Promise<CustomerNote | null>`; `deleteNote(note: Pick<CustomerNote, "id" | "pro_id">): Promise<boolean>`.
- All functions swallow errors (return `[]` / `null` / `false`) so the UI degrades gracefully until the migration lands via the Lovable sync.

- [ ] **Step 1: Write the migration**

```sql
-- Customer notes: private CRM notes a pro keeps on a customer.
-- Powers the note composer on the customer record page. `pinned` is
-- stored for later; v0 UI does not surface it.
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same permissive v0 RLS as the core tables (auth is mocked; app queries scope by pro).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO anon, authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v0_open_all" ON public.customer_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_id);
CREATE INDEX idx_customer_notes_pro ON public.customer_notes(pro_id);
```

- [ ] **Step 2: Write `src/lib/notes.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/* customer_notes ships in supabase/migrations but the generated Database
   types (types.ts) only refresh on the Lovable sync, so access goes through
   this one untyped cast, same pattern as src/lib/invoices.ts. */
const db = supabase as unknown as SupabaseClient;
const notes = () => db.from("customer_notes");

export type CustomerNote = {
  id: string;
  pro_id: string;
  customer_id: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

export async function listNotes(proId: string, customerId: string): Promise<CustomerNote[]> {
  const { data } = await notes()
    .select("*")
    .eq("pro_id", proId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomerNote[];
}

export async function addNote(args: {
  proId: string;
  customerId: string;
  body: string;
}): Promise<CustomerNote | null> {
  const { data, error } = await notes()
    .insert({ pro_id: args.proId, customer_id: args.customerId, body: args.body })
    .select("*")
    .single();
  return error ? null : (data as CustomerNote);
}

export async function deleteNote(note: Pick<CustomerNote, "id" | "pro_id">): Promise<boolean> {
  const { error } = await notes().delete().eq("id", note.id).eq("pro_id", note.pro_id);
  return !error;
}
```

- [ ] **Step 3: Verify**

Run: `bun run lint`
Expected: exit 0, no new warnings in `src/lib/notes.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706130000_customer_notes.sql src/lib/notes.ts
git commit -m "Add customer_notes table and notes helper"
```

---

### Task 2: CRM component kit

**Files:**
- Create: `src/components/crm.tsx`

**Interfaces (produces, consumed by Tasks 4 and 5):**
- `UnderlineTabs({ tabs: { key: string; label: string; count?: number }[], active: string, onChange(key) })`
- `CollapsibleCard({ title: string, count?: number, action?: ReactNode, defaultOpen?: boolean, children })`
- `PropertyRow({ label: string, value?: string, display?: ReactNode, onSave?: (v: string) => Promise<boolean> })` (editable when `onSave` given; `display` wins over `value` for rendering)
- `ActionCircle({ icon: LucideIcon, label: string, onClick(), disabled?, title? })`
- `FilterSelect({ label: string, value: string, options: { value: string; label: string }[], onChange(v) })`
- `SortableTh({ label: string, sortKey: string, sort: { key: string; dir: "asc" | "desc" }, onSort(key), className? })`
- `Timeline({ entries: TimelineEntry[], empty?: ReactNode })` with `TimelineEntry = { id: string; kind: "note" | "job" | "invoice" | "nudge"; icon: LucideIcon; title: string; at: string; preview?: string; body?: ReactNode; action?: ReactNode; onDelete?: () => void }`. Timeline sorts nothing; callers pass entries already sorted desc by `at`. Groups under month headings ("July 2026").

- [ ] **Step 1: Write `src/components/crm.tsx`**

```tsx
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronUp, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, Card, Input } from "@/lib/ui";
import { formatDate } from "@/lib/hb";

/* HubSpot-style CRM primitives, HomesBrain skin. Shared by the customers
   index (table, filters) and the customer record page (three columns). */

export function UnderlineTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`pressable shrink-0 px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors ${
            active === t.key
              ? "border-indigo text-indigo font-bold"
              : "border-transparent text-muted font-semibold hover:text-ink"
          }`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className="ml-1.5 text-xs tnum opacity-70">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function CollapsibleCard({
  title,
  count,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="pressable flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {open ? (
            <ChevronDown size={14} className="text-muted shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-muted shrink-0" />
          )}
          <span className="eyebrow text-indigo truncate">
            {title}
            {typeof count === "number" ? ` (${count})` : ""}
          </span>
        </button>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

export function PropertyRow({
  label,
  value,
  display,
  onSave,
}: {
  label: string;
  value?: string;
  display?: ReactNode;
  onSave?: (v: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!onSave) return;
    setSaving(true);
    const ok = await onSave(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="group py-2.5 border-b border-line last:border-b-0">
      <div className="text-xs text-muted">{label}</div>
      {editing ? (
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            aria-label={label}
            className="!min-h-9 !py-1.5 !text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Btn size="sm" variant="indigo" loading={saving} onClick={save}>
            Save
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Btn>
        </div>
      ) : (
        <div className="mt-0.5 flex items-center justify-between gap-2 min-h-6">
          <div className="text-sm font-semibold text-ink min-w-0 truncate">
            {display ?? (value || <span className="text-muted font-normal">Not set</span>)}
          </div>
          {onSave && (
            <button
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
              }}
              aria-label={`Edit ${label.toLowerCase()}`}
              className="pressable shrink-0 p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink hover:bg-soft transition-opacity"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ActionCircle({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={label}
        className="pressable w-11 h-11 rounded-full bg-indigobg text-indigo flex items-center justify-center transition-colors hover:bg-indigo hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigobg disabled:hover:text-indigo"
      >
        <Icon size={17} />
      </button>
      <span className="text-[11px] font-semibold text-muted">{label}</span>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-ink outline-none hover:border-ink/30 focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`px-3 py-2.5 text-left font-normal ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`pressable inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.08em] uppercase ${
          active ? "text-indigo" : "text-muted hover:text-ink"
        }`}
      >
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
}

export type TimelineEntry = {
  id: string;
  kind: "note" | "job" | "invoice" | "nudge";
  icon: LucideIcon;
  title: string;
  at: string;
  preview?: string;
  body?: ReactNode;
  action?: ReactNode;
  onDelete?: () => void;
};

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function Timeline({ entries, empty }: { entries: TimelineEntry[]; empty?: ReactNode }) {
  if (entries.length === 0) return <>{empty}</>;
  const groups: { label: string; items: TimelineEntry[] }[] = [];
  for (const e of entries) {
    const label = monthLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="eyebrow text-muted mb-2">{g.label}</div>
          <div className="space-y-2">
            {g.items.map((e) => (
              <TimelineItem key={`${e.kind}-${e.id}`} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(false);
  const Icon = entry.icon;
  const expandable = Boolean(entry.body || entry.onDelete);
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-indigobg text-indigo flex items-center justify-center shrink-0">
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-ink text-sm truncate">{entry.title}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted tnum">{formatDate(entry.at)}</span>
              {expandable && (
                <button
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  aria-label={open ? "Collapse" : "Expand"}
                  className="pressable p-1 rounded-lg text-muted hover:text-ink hover:bg-soft"
                >
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>
          {!open && entry.preview && (
            <div className="mt-0.5 text-sm text-muted truncate">{entry.preview}</div>
          )}
          {open && (
            <div className="mt-2 text-sm text-ink whitespace-pre-wrap">
              {entry.body ?? entry.preview}
            </div>
          )}
          {(entry.action || (open && entry.onDelete)) && (
            <div className="mt-2 flex items-center gap-3">
              {entry.action}
              {open && entry.onDelete && (
                <button
                  onClick={entry.onDelete}
                  className="text-xs font-semibold text-red hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/crm.tsx
git commit -m "Add CRM component kit (tabs, collapsible cards, inline edit, timeline)"
```

---

### Task 3: `ProShell` wide prop

**Files:**
- Modify: `src/components/pro-shell.tsx:84-92` (signature) and `:200` (main width)

**Interfaces:**
- Produces: `ProShell` accepts optional `wide?: boolean` (default false). Task 5 passes `wide`.

- [ ] **Step 1: Add the prop**

Change the component signature:

```tsx
export function ProShell({
  pro,
  active,
  wide = false,
  children,
}: {
  pro: ProRow | null;
  active: ProNavKey;
  wide?: boolean;
  children: ReactNode;
}) {
```

Change line 200:

```tsx
<main
  className={`mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"} px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-10`}
>
```

- [ ] **Step 2: Verify**

Run: `bun run lint`
Expected: exit 0. No other pages change (prop defaults off).

- [ ] **Step 3: Commit**

```bash
git add src/components/pro-shell.tsx
git commit -m "Add wide layout option to ProShell"
```

---

### Task 4: Customers index as CRM table

**Files:**
- Rewrite: `src/routes/pro.customers.index.tsx`

**Interfaces:**
- Consumes: `UnderlineTabs`, `FilterSelect`, `SortableTh` from `@/components/crm`.
- Route stays `/pro/customers/`; row links to `/pro/customers/$customerId` unchanged.

Behavior spec (all client-side):
- Query adds `next_service_date`: `.select("id,name,phone,email,created_at,homes(address,claimed_at),jobs(id,created_at,next_service_date)")`.
- Derived per customer: `jobCount`, `lastJob` (max `jobs.created_at`), `nextService` (min future-or-past `next_service_date`, null if none), `claimed` (`homes.claimed_at != null`), `due` (`nextService` non-null and `<= now + 30 days`).
- Tabs: All / Claimed / Unclaimed / Due for service, with counts. Filters compose after the tab: Claimed status (any/claimed/unclaimed), Last job (any/30/90/365 days), search (name, phone, email, address). "Clear all" shows only when a filter or search is active; resets filters, search, and page.
- Sort state `{ key, dir }`, default `{ key: "created", dir: "desc" }`. Clicking a header toggles asc/desc, switching key resets to asc. Keys: name, address, phone, jobs, lastJob, nextService, status. Null dates always sort last.
- Pagination: 25 per page; Prev / "Page x of y" / Next footer, hidden when one page; page resets to 0 whenever tab, filters, search, or sort change (clamp in render: `const safePage = Math.min(page, pageCount - 1)`).
- Desktop (`md+`): `<table>` inside a Card with `overflow-x-auto`. Columns: Name (Avatar 36 + bold name), Home address, Phone, Jobs (count), Last job, Next service (amber Pill when due, plain date otherwise), Status (coral "Claimed" / ink "Unclaimed" Pill). Whole row is clickable (wrap the name cell content in `Link`; put `onClick={() => navigate(...)}` + `cursor-pointer hover:bg-soft` on the `<tr>`).
- Mobile (below `md`): render the existing card-row list (current code lines 101-139) from the same filtered/sorted (not paginated) array; hide the table with `hidden md:block`, list with `md:hidden`.
- States: loading `ProPageSkeleton`; zero customers keeps current empty-state card; zero matches shows "No customers match" + Clear all button.
- Header: `ProPageHead` with sub showing live count ("24 customers · every homeowner you've logged a job for") and `action` slot holding the "Log a job" `Btn variant="indigo"` link.

- [ ] **Step 1: Rewrite the route** with the structure above. Key logic to implement verbatim:

```tsx
type SortKey = "name" | "address" | "phone" | "jobs" | "lastJob" | "nextService" | "status" | "created";
type TabKey = "all" | "claimed" | "unclaimed" | "due";

const DAY = 24 * 3600 * 1000;
const PAGE_SIZE = 25;

type Derived = {
  c: CustomerRow;
  jobCount: number;
  lastJob: string | null;
  nextService: string | null;
  claimed: boolean;
  due: boolean;
};

function derive(c: CustomerRow): Derived {
  const jobs = c.jobs ?? [];
  const lastJob = jobs.map((j) => j.created_at).sort().at(-1) ?? null;
  const nextService = jobs
    .map((j) => j.next_service_date)
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null;
  const due = nextService != null && new Date(nextService).getTime() <= Date.now() + 30 * DAY;
  return { c, jobCount: jobs.length, lastJob, nextService, claimed: Boolean(c.homes?.claimed_at), due };
}

function compare(a: Derived, b: Derived, key: SortKey): number {
  const str = (x: string | null | undefined) => (x ?? "").toLowerCase();
  const date = (x: string | null) => (x ? new Date(x).getTime() : Number.NEGATIVE_INFINITY);
  switch (key) {
    case "name": return str(a.c.name).localeCompare(str(b.c.name));
    case "address": return str(a.c.homes?.address).localeCompare(str(b.c.homes?.address));
    case "phone": return str(a.c.phone ?? a.c.email).localeCompare(str(b.c.phone ?? b.c.email));
    case "jobs": return a.jobCount - b.jobCount;
    case "lastJob": return date(a.lastJob) - date(b.lastJob);
    case "nextService": return date(a.nextService) - date(b.nextService);
    case "status": return Number(a.claimed) - Number(b.claimed);
    case "created": return date(a.c.created_at) - date(b.c.created_at);
  }
}
```

Filtering pipeline in a `useMemo` over `[customers, tab, claimedFilter, lastJobFilter, q]`: derive all rows once, apply tab, then claimed filter, then last-job window (`lastJob != null && Date.now() - new Date(lastJob).getTime() <= days * DAY`), then search needle over name/phone/email/address. Sort in a second `useMemo`. Paginate by slicing.

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both exit 0.

- [ ] **Step 3: Manual check on `bun dev`**

Tabs filter and show counts; each quick filter narrows; search still works; each column sorts both directions; Status pill coral when claimed; mobile width shows the card list, not the table.

- [ ] **Step 4: Commit**

```bash
git add src/routes/pro.customers.index.tsx
git commit -m "Rebuild customers index as CRM table with tabs, filters, sorting"
```

---

### Task 5: Customer record page (three columns)

**Files:**
- Rewrite: `src/routes/pro.customers.$customerId.tsx`

**Interfaces:**
- Consumes: `ActionCircle`, `CollapsibleCard`, `PropertyRow`, `Timeline`, `UnderlineTabs`, `TimelineEntry` from `@/components/crm`; `listNotes`, `addNote`, `deleteNote`, `CustomerNote` from `@/lib/notes`; invoices helper as today; `ProShell` with `wide`.

Data loading (extends the current effect):
- Customer query unchanged. Jobs query adds `sent_email_at`: `records(id,viewed_at,sent_sms_at,sent_email_at)`.
- Add to the `Promise.all`: `listNotes(proId, customerId)` and the nudge-events query:

```ts
supabase
  .from("events")
  .select("id,created_at")
  .eq("type", "rebook_nudge_sent")
  .eq("actor", `pro:${proId}`)
  .contains("props", { customer_id: customerId })
  .order("created_at", { ascending: false })
```

State additions: `notes: CustomerNote[]`, `nudges: { id: string; created_at: string }[]`, `tab: "activity" | "notes" | "jobs" | "invoices"`, `noteDraft: string`, `savingNote: boolean`, `nudging: boolean`, `toast: string | null` (auto-dismiss after 2600ms like `pro.due.tsx:58-62`), `composerRef = useRef<HTMLTextAreaElement>(null)`.

Mutations:

```ts
async function saveField(field: "name" | "phone" | "email", value: string): Promise<boolean> {
  if (!proId || !customer) return false;
  if (field === "name" && !value) return false;
  const patch = { [field]: value || null };
  const { error } = await supabase
    .from("customers").update(patch).eq("id", customerId).eq("pro_id", proId);
  if (error) { setToast("Could not save. Try again."); return false; }
  setCustomer((c) => (c ? { ...c, ...patch } : c));
  return true;
}

async function onSaveNote() {
  const body = noteDraft.trim();
  if (!proId || !body) return;
  setSavingNote(true);
  const note = await addNote({ proId, customerId, body });
  setSavingNote(false);
  if (!note) { setToast("Could not save the note."); return; }
  setNotes((ns) => [note, ...ns]);
  setNoteDraft("");
}

async function onDeleteNote(n: CustomerNote) {
  if (!window.confirm("Delete this note?")) return;
  if (await deleteNote(n)) setNotes((ns) => ns.filter((x) => x.id !== n.id));
  else setToast("Could not delete the note.");
}

async function sendNudge() {
  if (!proId || !customer || nudging) return;
  const to = customer.phone ?? customer.email;
  if (!to) return;
  setNudging(true);
  const nextJob = jobs.find((j) => j.next_service_date);
  const first = customer.name.split(" ")[0];
  const body = nextJob
    ? `Hi ${first}, it's ${pro?.business}. Your ${nextJob.what_done.toLowerCase()} is due for service around ${formatDate(nextJob.next_service_date!)}. Reply here or book a time and we'll take care of it.`
    : `Hi ${first}, it's ${pro?.business}. It's a good time for a service check at ${customer.homes?.address ?? "your home"}. Reply here and we'll set it up.`;
  await mockSend({ channel: customer.phone ? "sms" : "email", to, body, kind: "other" });
  await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
    job_id: nextJob?.id ?? null,
    customer_id: customerId,
  });
  setNudges((prev) => [{ id: `local-${Date.now()}`, created_at: new Date().toISOString() }, ...prev]);
  setNudging(false);
  setToast(`Rebook nudge sent to ${customer.name} (mock)`);
}
```

`onMarkPaid` stays as today (`pro.customers.$customerId.tsx:98-106`).

Timeline assembly (`useMemo` over `[notes, jobs, invoices, nudges]`), all entries desc by `at` after one final sort:

- Note: `{ id: n.id, kind: "note", icon: StickyNote, title: "Note", at: n.created_at, preview: n.body, body: n.body, onDelete: () => onDeleteNote(n) }`
- Job logged: `{ id: j.id, kind: "job", icon: Wrench, title: "Job logged", at: j.created_at, preview: j.what_done, body: <what_done + next service line>, action: <record link if j.records?.[0]> }`
- Record sent (when `rec.sent_sms_at ?? rec.sent_email_at`): `{ id: rec.id + "-sent", kind: "job", icon: Send, title: "Record sent", at: sentAt, preview: j.what_done, action: <record link> }`
- Record viewed (when `rec.viewed_at`): `{ id: rec.id + "-viewed", kind: "job", icon: Eye, title: "Record viewed by homeowner", at: rec.viewed_at, preview: j.what_done, action: <record link> }`
- Invoice created: `{ id: inv.id, kind: "invoice", icon: ReceiptText, title: "Invoice created · " + formatMoney(Number(inv.total)), at: inv.created_at, preview: inv.items[0]?.description ?? "", action: <Link to /pro/invoices>View invoices</Link> }`
- Invoice paid (when `inv.status === "paid" && inv.paid_at`): same shape, `id: inv.id + "-paid"`, title "Invoice paid · ...", `at: inv.paid_at`.
- Nudge: `{ id: ev.id, kind: "nudge", icon: BellRing, title: "Rebook nudge sent", at: ev.created_at }`

Record link node: `<Link to="/pro/records/$recordId" params={{ recordId: rec.id }} className="text-xs font-semibold text-indigo hover:underline">View record →</Link>`.

Tab filter: activity = all; notes = `kind === "note"`; jobs = `kind === "job"`; invoices = `kind === "invoice"`.

Layout JSX:

```tsx
<ProShell pro={pro} active="customers" wide>
  <Link to="/pro/customers" ...>← Customers back link (keep current markup, lines 133-138)</Link>
  <div className="grid gap-5 items-start lg:grid-cols-[300px_minmax(0,1fr)_320px]">

    {/* Left */}
    <div className="space-y-5">
      <Card className="anim-fade-up text-center">
        <Avatar name={customer.name} accent="indigo" size={64} />  {/* wrapped to center: mx-auto via flex justify-center */}
        <h1 className="mt-3 text-2xl tracking-tight">{customer.name}</h1>
        <div className="mt-1 text-sm text-muted">{customer.homes?.address}</div>
        {customer.phone && <div className="text-xs text-muted font-mono tnum mt-1.5">{customer.phone}</div>}
        {customer.email && <div className="text-xs text-muted font-mono tnum">{customer.email}</div>}
        <div className="mt-5 flex justify-center gap-4">
          <ActionCircle icon={StickyNote} label="Note" onClick={focusComposer} />
          <ActionCircle icon={Wrench} label="Job" onClick={() => navigate({ to: "/pro/jobs/new" })} />
          <ActionCircle icon={ReceiptText} label="Invoice" onClick={() => navigate({ to: "/pro/invoices/new", search: { customer: customerId, job: undefined } })} />
          <ActionCircle icon={BellRing} label="Nudge" onClick={sendNudge}
            disabled={(!customer.phone && !customer.email) || nudging}
            title={!customer.phone && !customer.email ? "No phone or email on file" : "Send a rebook nudge (mock)"} />
        </div>
      </Card>
      <div className="anim-fade-up d-1">
        <CollapsibleCard title="About this customer">
          <PropertyRow label="Name" value={customer.name} onSave={(v) => saveField("name", v)} />
          <PropertyRow label="Phone" value={customer.phone ?? ""} onSave={(v) => saveField("phone", v)} />
          <PropertyRow label="Email" value={customer.email ?? ""} onSave={(v) => saveField("email", v)} />
          <PropertyRow label="Consent" display={consent pill: indigo "On file · date" or red "Missing"} />
          <PropertyRow label="Customer since" value={formatDate(customer.created_at)} />
          <PropertyRow label="Home claimed" display={coral "Yes · date" or ink "Not yet" pill} />
        </CollapsibleCard>
      </div>
    </div>

    {/* Middle */}
    <div className="anim-fade-up d-1 min-w-0">
      <UnderlineTabs
        tabs={[
          { key: "activity", label: "Activity" },
          { key: "notes", label: "Notes", count: notes.length },
          { key: "jobs", label: "Jobs", count: jobs.length },
          { key: "invoices", label: "Invoices", count: invoices.length },
        ]}
        active={tab} onChange={(k) => setTab(k as typeof tab)}
      />
      {(tab === "activity" || tab === "notes") && (
        <Card className="mt-4 !p-4">
          <Textarea ref={composerRef} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={`Leave a note about ${customer.name.split(" ")[0]}...`}
            className={noteDraft || composerFocused ? "" : "!min-h-11"} rows={noteDraft ? 3 : 1} />
          {noteDraft.trim() && (
            <div className="mt-2 flex justify-end">
              <Btn size="sm" variant="indigo" loading={savingNote} onClick={onSaveNote}>Save note</Btn>
            </div>
          )}
        </Card>
      )}
      <div className="mt-4">
        <Timeline entries={visibleEntries} empty={<empty card: "No activity yet. Log a job at this home to start the record." + Log a job link>} />
      </div>
    </div>

    {/* Right */}
    <div className="space-y-4">
      <CollapsibleCard title="Home" count={1} ...>address, claimed pill, homeowner phone/email KVs when claimed, muted line when not</CollapsibleCard>
      <CollapsibleCard title="Jobs" count={jobs.length}
        action={<><button onClick={() => setTab("jobs")} className="text-xs font-semibold text-indigo hover:underline">View all</button><Link to="/pro/jobs/new" className="text-xs font-semibold text-indigo hover:underline">+ Add</Link></>}>
        first 3 jobs: what_done bold, date muted
      </CollapsibleCard>
      <CollapsibleCard title="Equipment" count={equipment.length}>current equipment rows (keep pill logic from lines 276-291)</CollapsibleCard>
      <CollapsibleCard title="Invoices" count={invoices.length}
        action={<Link to="/pro/invoices/new" search={{ customer: customer.id, job: undefined }} className="text-xs font-semibold text-indigo hover:underline">+ New invoice</Link>}>
        open balance line (coral when > 0), first 3 invoices with status pills + Mark paid (keep logic from lines 221-267)
      </CollapsibleCard>
    </div>
  </div>
  {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
</ProShell>
```

Notes on the composer: `Textarea` from `ui.tsx` spreads props onto a native `textarea`, so `ref` works via a small local wrapper or by using a plain `<textarea className={baseInput-like classes}>`; simplest is `<Textarea ... />` replaced with a native textarea styled identically if ref forwarding fails (React 19 function components accept ref as a prop, and `Textarea` spreads `...props`, so `ref` passes through).

The Note ActionCircle handler: `composerRef.current?.focus(); composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })`, and if `tab` is jobs/invoices, first `setTab("activity")`.

Loading and not-found states keep current markup (lines 108-129).

- [ ] **Step 1: Rewrite the route** per the structure above.

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both exit 0.

- [ ] **Step 3: Manual check on `bun dev`**

Three columns at desktop, stacked on narrow; inline edit saves and cancels; note save prepends to timeline (or fails gracefully with toast if the migration is not applied yet); tabs filter; month headings correct; nudge adds a timeline entry, writes a `messages` row, logs the event; Mark paid flips the pill; all links resolve.

- [ ] **Step 4: Commit**

```bash
git add src/routes/pro.customers.$customerId.tsx
git commit -m "Rebuild customer detail as three-column CRM record view"
```

---

### Task 6: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1:** `bun run lint` and `bun run build` both exit 0.
- [ ] **Step 2:** On `bun dev`, walk the spec's verification list (spec section 6): index tabs/filters/search/sort/pagination/mobile, detail columns/edit/notes/timeline/nudge/links, and spot-check `/pro` dashboard and `/pro/records` still render (ProShell untouched behavior).
- [ ] **Step 3:** Confirm no em dashes slipped into any new copy: `grep -rn $'—' src/routes/pro.customers* src/components/crm.tsx src/lib/notes.ts` returns nothing.
- [ ] **Step 4:** Commit any fixes; do not push (Lovable syncs from GitHub; the user decides when to push).
