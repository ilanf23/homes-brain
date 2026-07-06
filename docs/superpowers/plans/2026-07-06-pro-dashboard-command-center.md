# Pro Dashboard Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/pro` into a command center: money KPIs + 6-month revenue chart, a "Needs attention" action queue, a real customer map (MapLibre + OSM + Nominatim geocoding), with old activity stats demoted to a slim strip.

**Architecture:** The route (`pro.index.tsx`) keeps all data fetching in one `Promise.all` and composes three new presentational components: `MoneyRow`, `ActionQueue`, `CustomerMap`. Geocoding lives in `src/lib/hb.ts` (Nominatim, fire-and-forget on home creation, lazy 5-per-visit backfill on dashboard load). Homes gain `lat/lng/geocoded_at` via one migration; because generated Supabase types only refresh on the Lovable sync, all lat/lng access goes through an untyped client cast (same pattern as `src/lib/invoices.ts` and the notifications helpers in `hb.ts`).

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase JS, `maplibre-gl` (new dep, free OSM raster tiles), plain-SVG chart primitives in `src/components/svg.tsx`.

**Spec:** `docs/superpowers/specs/2026-07-06-pro-dashboard-command-center-design.md`

## Global Constraints

- No em dashes (U+2014) anywhere: copy, comments, commits.
- Bun is the package manager. `bunfig.toml` has a 24h supply-chain guard; if `bun add` blocks on a fresh version, confirm with the user before adding excludes.
- No test suite exists. Every task verifies with `bun run lint` and `bun run build`; the final task verifies behavior in `bun dev`.
- Migrations go in `supabase/migrations/` only; never apply schema through the Supabase MCP. Do not hand-edit `src/integrations/supabase/types.ts`.
- Never edit `src/routeTree.gen.ts`.
- Brand: indigo default everywhere; coral only for Outstanding value, Rebooked tile, owes-money pins, and existing nudge-sent moments; amber only for due-for-service status; red only for overdue emphasis and errors. Secondary text exactly `text-muted`. Currency/dates use the `tnum` class. Pro portal font is already applied by `ProShell`.
- The repo has unrelated uncommitted changes. `git add` only the files named in each task, never `git add -A`.

---

### Task 1: Migration - homes geocode columns

**Files:**
- Create: `supabase/migrations/20260706130000_homes_geocode.sql`

**Interfaces:**
- Produces: `homes.lat DOUBLE PRECISION NULL`, `homes.lng DOUBLE PRECISION NULL`, `homes.geocoded_at TIMESTAMPTZ NULL`. Later tasks read/write these through an untyped client cast (they are not in generated types until the Lovable sync).

- [ ] **Step 1: Write the migration**

```sql
-- Geocoded coordinates for the pro dashboard customer map.
-- Populated by client-side Nominatim geocoding: at job-log time for new
-- homes, and lazily backfilled from the dashboard for older rows.
-- geocoded_at is stamped even when geocoding fails so a bad address is
-- not retried on every dashboard visit.
ALTER TABLE public.homes
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION,
  ADD COLUMN geocoded_at TIMESTAMPTZ;
```

- [ ] **Step 2: Verify the build is untouched**

Run: `bun run lint && bun run build`
Expected: both pass (the migration is not part of the app bundle).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260706130000_homes_geocode.sql
git commit -m "Add lat/lng/geocoded_at columns to homes for the customer map"
```

---

### Task 2: Geocoding helpers in hb.ts

**Files:**
- Modify: `src/lib/hb.ts` (append after `markNotificationsRead`, around line 102; reuses the existing `untyped` cast defined at line 61)

**Interfaces:**
- Consumes: `homes.lat/lng/geocoded_at` from Task 1; the existing `untyped` supabase cast in `hb.ts`.
- Produces (exact exports later tasks import from `@/lib/hb`):
  - `type ProHome = { id: string; address: string; claimed_at: string | null; lat: number | null; lng: number | null; geocoded_at: string | null }`
  - `geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null>`
  - `geocodeHome(homeId: string, address: string): Promise<{ lat: number; lng: number } | null>`
  - `fetchProHomes(proId: string): Promise<ProHome[]>`
  - `backfillHomeGeocodes(homes: ProHome[], onUpdate: (home: ProHome) => void, limit?: number): Promise<void>`

- [ ] **Step 1: Add the helpers to `src/lib/hb.ts`**

Insert this block after the `markNotificationsRead` function:

```ts
/* ---- Customer map geocoding ----
   homes.lat/lng/geocoded_at ship in supabase/migrations but the generated
   Database types only refresh on the Lovable sync, so these helpers go
   through the same untyped cast as the notifications helpers above. */

export type ProHome = {
  id: string;
  address: string;
  claimed_at: string | null;
  lat: number | null;
  lng: number | null;
  geocoded_at: string | null;
};

/* Free Nominatim geocoding. Policy: identify the app (email param, since a
   browser fetch cannot set User-Agent) and stay at or under 1 request/second.
   Callers are responsible for sequencing; this never throws. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&email=ilanfridman23%40gmail.com&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const hit = rows?.[0];
    if (!hit) return null;
    const lat = Number.parseFloat(hit.lat);
    const lng = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/* Geocode one home and persist the result. geocoded_at is stamped even on
   failure so bad addresses are not retried every visit. Never throws. */
export async function geocodeHome(
  homeId: string,
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address);
  try {
    await untyped
      .from("homes")
      .update({
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", homeId);
  } catch (e) {
    console.warn("[geocodeHome] failed", e);
  }
  return coords;
}

export async function fetchProHomes(proId: string): Promise<ProHome[]> {
  try {
    const { data } = await untyped
      .from("homes")
      .select("id,address,claimed_at,lat,lng,geocoded_at")
      .eq("created_by_pro", proId)
      .order("claimed_at", { ascending: false });
    return (data ?? []) as ProHome[];
  } catch {
    return [];
  }
}

/* Lazy backfill: geocode up to `limit` ungeocoded homes, sequentially,
   1 second apart (Nominatim rate limit). Calls onUpdate after each home
   so pins can appear without a reload. */
export async function backfillHomeGeocodes(
  homes: ProHome[],
  onUpdate: (home: ProHome) => void,
  limit = 5,
): Promise<void> {
  const targets = homes.filter((h) => !h.geocoded_at).slice(0, limit);
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000));
    const h = targets[i];
    const coords = await geocodeHome(h.id, h.address);
    onUpdate({
      ...h,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      geocoded_at: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hb.ts
git commit -m "Add Nominatim geocoding helpers and pro homes fetch to hb"
```

---

### Task 3: Geocode new homes at job-log time

**Files:**
- Modify: `src/routes/pro.jobs.new.tsx` (inside `submit()`, right after the new home insert around line 167-173; add `geocodeHome` to the existing `@/lib/hb` import)

**Interfaces:**
- Consumes: `geocodeHome(homeId, address)` from Task 2.
- Produces: nothing new; new homes get coordinates without blocking the log-a-job flow.

- [ ] **Step 1: Add the import**

In `src/routes/pro.jobs.new.tsx`, extend the existing `@/lib/hb` import to include `geocodeHome` (keep the other named imports exactly as they are).

- [ ] **Step 2: Fire-and-forget geocode after the home insert**

The current code creates a home when the address is new:

```ts
      } else {
        const { data: newHome } = await supabase
          .from("homes")
          .insert({ address: newCustomer.address, created_by_pro: proId })
          .select("id")
          .single();
        homeId = newHome!.id;
      }
```

Change that `else` block to:

```ts
      } else {
        const { data: newHome } = await supabase
          .from("homes")
          .insert({ address: newCustomer.address, created_by_pro: proId })
          .select("id")
          .single();
        homeId = newHome!.id;
        // Fire-and-forget: pin the home on the dashboard map. Failure is
        // silent; the dashboard backfill will retry once via geocoded_at.
        void geocodeHome(newHome!.id, newCustomer.address);
      }
```

Note: `geocodeHome` stamps `geocoded_at` even on failure, which is the spec behavior (no endless retries).

- [ ] **Step 3: Verify**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/pro.jobs.new.tsx
git commit -m "Geocode newly created homes when a job is logged"
```

---

### Task 4: BarChart primitive in svg.tsx

**Files:**
- Modify: `src/components/svg.tsx` (append at the end of the file)

**Interfaces:**
- Produces (exact exports from `@/components/svg`):
  - `type BarGroup = { label: string; bars: { value: number; fill: string; stroke?: string; title?: string }[] }`
  - `BarChart({ groups, height?, className? }: { groups: BarGroup[]; height?: number; className?: string })`

- [ ] **Step 1: Append the component**

```tsx
/* Grouped bar chart for the dashboard money row. Plain SVG, brand tokens,
   values surfaced on hover via <title>. Bars share one linear scale. */

export type BarGroup = {
  label: string;
  bars: { value: number; fill: string; stroke?: string; title?: string }[];
};

export function BarChart({
  groups,
  height = 110,
  className = "",
}: {
  groups: BarGroup[];
  height?: number;
  className?: string;
}) {
  const width = 300;
  const labelH = 16;
  const chartH = height - labelH;
  const max = Math.max(...groups.flatMap((g) => g.bars.map((b) => b.value)), 1);
  const groupW = width / Math.max(groups.length, 1);
  const barGap = 3;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      role="img"
      aria-label="Bar chart"
    >
      {groups.map((g, gi) => {
        const n = Math.max(g.bars.length, 1);
        const innerW = groupW * 0.62;
        const barW = (innerW - barGap * (n - 1)) / n;
        const x0 = gi * groupW + (groupW - innerW) / 2;
        return (
          <g key={gi}>
            {g.bars.map((b, bi) => {
              const h = b.value > 0 ? Math.max((b.value / max) * (chartH - 6), 2) : 0;
              return (
                <rect
                  key={bi}
                  x={x0 + bi * (barW + barGap)}
                  y={chartH - h}
                  width={barW}
                  height={h}
                  rx={2}
                  fill={b.fill}
                  stroke={b.stroke ?? "none"}
                  strokeWidth={b.stroke ? 1 : 0}
                >
                  {b.title ? <title>{b.title}</title> : null}
                </rect>
              );
            })}
            <text
              x={gi * groupW + groupW / 2}
              y={height - 3}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted)"
            >
              {g.label}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={chartH} x2={width} y2={chartH} stroke="var(--line)" strokeWidth={1} />
    </svg>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/svg.tsx
git commit -m "Add BarChart SVG primitive for the dashboard revenue chart"
```

---

### Task 5: MoneyRow component

**Files:**
- Create: `src/components/money-row.tsx`

**Interfaces:**
- Consumes: `BarChart`, `BarGroup` from Task 4; `ProInvoice` from `@/lib/invoices`; `Card` from `@/lib/ui`; `CountUp` from `@/components/svg`.
- Produces (exact export from `@/components/money-row`):
  - `MoneyRow({ invoices, rebooksThisMonth, rebooksAllTime }: { invoices: ProInvoice[]; rebooksThisMonth: number; rebooksAllTime: number })`

- [ ] **Step 1: Create the file**

```tsx
import { Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { Card } from "@/lib/ui";
import { BarChart, CountUp, type BarGroup } from "@/components/svg";
import type { ProInvoice } from "@/lib/invoices";

/* Money headline row: billed / collected / outstanding / rebooked tiles plus
   a 6-month billed-vs-collected bar chart. Every tile links to the page
   behind the number. Currency renders without cents per the spec. */

const money0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function monthIndex(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() * 12 + d.getMonth();
}

function Tile({
  label,
  value,
  sub,
  coral = false,
  to,
  delay,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  coral?: boolean;
  to: "/pro/invoices" | "/pro/due";
  delay: 1 | 2 | 3 | 4;
}) {
  return (
    <Link to={to} className="block">
      <Card lift className={`anim-fade-up d-${delay} h-full`}>
        <div className="text-xs uppercase tracking-wider text-muted font-bold">{label}</div>
        <div
          className={`mt-2 text-2xl font-semibold font-display tnum ${coral ? "text-coral" : "text-ink"}`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </Card>
    </Link>
  );
}

export function MoneyRow({
  invoices,
  rebooksThisMonth,
  rebooksAllTime,
}: {
  invoices: ProInvoice[];
  rebooksThisMonth: number;
  rebooksAllTime: number;
}) {
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();

  const { billedMonth, collectedMonth, outstanding, groups, windowRate } = useMemo(() => {
    const notVoid = invoices.filter((i) => i.status !== "void");
    const billedMonth = notVoid
      .filter((i) => monthIndex(i.created_at) === nowIdx)
      .reduce((s, i) => s + Number(i.total), 0);
    const collectedMonth = invoices
      .filter((i) => i.paid_at && monthIndex(i.paid_at) === nowIdx)
      .reduce((s, i) => s + Number(i.total), 0);
    const outstanding = invoices
      .filter((i) => i.status === "open")
      .reduce((s, i) => s + Number(i.total), 0);

    const months: { label: string; billed: number; collected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "narrow" }),
        billed: 0,
        collected: 0,
      });
    }
    const startIdx = nowIdx - 5;
    for (const i of notVoid) {
      const bi = monthIndex(i.created_at) - startIdx;
      if (bi >= 0 && bi <= 5) months[bi].billed += Number(i.total);
    }
    for (const i of invoices) {
      if (!i.paid_at) continue;
      const ci = monthIndex(i.paid_at) - startIdx;
      if (ci >= 0 && ci <= 5) months[ci].collected += Number(i.total);
    }
    const groups: BarGroup[] = months.map((m) => ({
      label: m.label,
      bars: [
        {
          value: m.billed,
          fill: "var(--indigobg)",
          stroke: "var(--indigo)",
          title: `Billed ${money0.format(m.billed)}`,
        },
        {
          value: m.collected,
          fill: "var(--indigo)",
          title: `Collected ${money0.format(m.collected)}`,
        },
      ],
    }));
    const windowBilled = months.reduce((s, m) => s + m.billed, 0);
    const windowCollected = months.reduce((s, m) => s + m.collected, 0);
    const windowRate = windowBilled > 0 ? Math.round((windowCollected / windowBilled) * 100) : null;
    return { billedMonth, collectedMonth, outstanding, groups, windowRate };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, nowIdx]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Tile
          label="Billed this month"
          value={money0.format(billedMonth)}
          to="/pro/invoices"
          delay={1}
        />
        <Tile
          label="Collected this month"
          value={money0.format(collectedMonth)}
          to="/pro/invoices"
          delay={2}
        />
        <Tile
          label="Outstanding"
          value={money0.format(outstanding)}
          coral={outstanding > 0}
          sub={outstanding > 0 ? "Open invoices" : "Nothing owed"}
          to="/pro/invoices"
          delay={3}
        />
        <Tile
          label="Rebooked"
          value={<CountUp value={rebooksThisMonth} className="text-coral" />}
          sub={`this month · ${rebooksAllTime} all time`}
          to="/pro/due"
          delay={4}
        />
      </div>
      <Card className="anim-fade-up d-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">
            Billed vs collected · 6 months
          </div>
          {windowRate !== null && (
            <div className="text-xs font-semibold text-indigo tnum">{windowRate}% collected</div>
          )}
        </div>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Invoices you send will chart here.{" "}
            <Link to="/pro/invoices/new" className="font-semibold text-indigo hover:underline">
              Create your first invoice
            </Link>
          </p>
        ) : (
          <div className="mt-3">
            <BarChart groups={groups} height={110} />
            <div className="mt-2 flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-indigo"
                  style={{ background: "var(--indigobg)" }}
                />
                Billed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: "var(--indigo)" }}
                />
                Collected
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both pass. If `border-indigo` is not a valid utility in this Tailwind setup, replace that span's classes with `style={{ background: "var(--indigobg)", border: "1px solid var(--indigo)" }}`.

- [ ] **Step 3: Commit**

```bash
git add src/components/money-row.tsx
git commit -m "Add MoneyRow dashboard component with revenue bar chart"
```

---

### Task 6: ActionQueue component

**Files:**
- Create: `src/components/action-queue.tsx`

**Interfaces:**
- Consumes: `Btn, Card, Eyebrow, Pill` from `@/lib/ui`; `formatDate, logEvent, mockSend` from `@/lib/hb`; `formatMoney, markInvoicePaid, ProInvoice` from `@/lib/invoices`; `CheckCircle2` from `lucide-react`.
- Produces (exact exports from `@/components/action-queue`):
  - `type QueueContact = { id: string; name: string; phone: string | null; email: string | null }`
  - `type QueueJob = { id: string; what_done: string; next_service_date: string; customer: QueueContact | null; address: string | null }`
  - `type QueueStaleHome = { homeId: string; address: string; customer: QueueContact | null; sentAt: string }`
  - `ActionQueue({ proId, proBusiness, dueJobs, overdueInvoices, staleHomes, onInvoicePaid, onToast })` where `onInvoicePaid: (invoiceId: string) => void` and `onToast: (msg: string) => void`. The parent passes already-filtered, already-sorted lists.

- [ ] **Step 1: Create the file**

```tsx
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { formatDate, logEvent, mockSend } from "@/lib/hb";
import { formatMoney, markInvoicePaid, type ProInvoice } from "@/lib/invoices";

/* "Needs attention" queue: every row is a problem plus a one-click action.
   Sources arrive pre-filtered and pre-sorted from the dashboard:
   overdue/due-soon service, open invoices past due, stale unclaimed homes. */

export type QueueContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};
export type QueueJob = {
  id: string;
  what_done: string;
  next_service_date: string;
  customer: QueueContact | null;
  address: string | null;
};
export type QueueStaleHome = {
  homeId: string;
  address: string;
  customer: QueueContact | null;
  sentAt: string;
};

type Row =
  | { kind: "due"; key: string; job: QueueJob }
  | { kind: "invoice"; key: string; inv: ProInvoice }
  | { kind: "stale"; key: string; home: QueueStaleHome };

const DAY = 24 * 3600 * 1000;
const MAX_ROWS = 8;

function daysOverdue(dueDate: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(dueDate + "T23:59:59").getTime()) / DAY));
}

function daysAgo(iso: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

export function ActionQueue({
  proId,
  proBusiness,
  dueJobs,
  overdueInvoices,
  staleHomes,
  onInvoicePaid,
  onToast,
}: {
  proId: string;
  proBusiness: string;
  dueJobs: QueueJob[];
  overdueInvoices: ProInvoice[];
  staleHomes: QueueStaleHome[];
  onInvoicePaid: (invoiceId: string) => void;
  onToast: (msg: string) => void;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const all: Row[] = [
    ...dueJobs.map((job): Row => ({ kind: "due", key: `due-${job.id}`, job })),
    ...overdueInvoices.map((inv): Row => ({ kind: "invoice", key: `inv-${inv.id}`, inv })),
    ...staleHomes.map((home): Row => ({ kind: "stale", key: `stale-${home.homeId}`, home })),
  ];
  const rows = all.slice(0, MAX_ROWS);
  const truncated = all.length > MAX_ROWS;

  async function nudge(row: Row & { kind: "due" }) {
    const c = row.job.customer;
    if (!c || (!c.phone && !c.email)) return;
    setBusy(row.key);
    const body = `Hi ${c.name.split(" ")[0]}, it's ${proBusiness}. Your ${row.job.what_done.toLowerCase()} is due for service around ${formatDate(row.job.next_service_date)}. Reply here or book a time and we'll take care of it.`;
    await mockSend({
      channel: c.phone ? "sms" : "email",
      to: c.phone ?? c.email ?? "",
      body,
      kind: "other",
    });
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
      job_id: row.job.id,
      customer_id: c.id,
    });
    setDone((prev) => new Set(prev).add(row.key));
    setBusy(null);
    onToast(`Rebook nudge sent to ${c.name} (mock)`);
  }

  async function markPaid(row: Row & { kind: "invoice" }) {
    setBusy(row.key);
    const ok = await markInvoicePaid(row.inv);
    setBusy(null);
    if (!ok) {
      onToast("Could not mark the invoice paid. Try again.");
      return;
    }
    setDone((prev) => new Set(prev).add(row.key));
    onInvoicePaid(row.inv.id);
    onToast(`Marked paid: ${formatMoney(Number(row.inv.total))}`);
  }

  async function remind(row: Row & { kind: "stale" }) {
    const c = row.home.customer;
    if (!c || (!c.phone && !c.email)) return;
    setBusy(row.key);
    const body = `Hi ${c.name.split(" ")[0]}, it's ${proBusiness}. Your service record for ${row.home.address} is waiting for you on HomesBrain. Claim your home to keep its history forever.`;
    await mockSend({
      channel: c.phone ? "sms" : "email",
      to: c.phone ?? c.email ?? "",
      body,
      kind: "record",
    });
    await logEvent(`pro:${proId}`, "claim_nudge_sent", {
      home_id: row.home.homeId,
      customer_id: c.id,
    });
    setDone((prev) => new Set(prev).add(row.key));
    setBusy(null);
    onToast(`Claim reminder sent to ${c.name} (mock)`);
  }

  return (
    <Card className="anim-fade-up d-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eyebrow accent="indigo">Needs attention</Eyebrow>
          {all.length > 0 && <span className="text-xs text-muted tnum">{all.length}</span>}
        </div>
        {truncated && (
          <div className="text-xs font-semibold">
            <Link to="/pro/due" className="text-indigo hover:underline">
              All due
            </Link>
            <span className="text-muted"> · </span>
            <Link to="/pro/invoices" className="text-indigo hover:underline">
              All invoices
            </Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 size={18} className="text-muted" />
          You're all caught up.
        </div>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {rows.map((row) => {
            const isDone = done.has(row.key);
            if (row.kind === "due") {
              const overdue = new Date(row.job.next_service_date).getTime() < Date.now();
              const c = row.job.customer;
              const noContact = !c || (!c.phone && !c.email);
              return (
                <div
                  key={row.key}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {c?.name ?? "-"}
                      <span className="text-muted font-normal"> · {row.job.what_done}</span>
                    </div>
                    <div className={`text-xs ${overdue ? "text-red font-semibold" : "text-muted"}`}>
                      {overdue
                        ? `Overdue since ${formatDate(row.job.next_service_date)}`
                        : `Due ${formatDate(row.job.next_service_date)}`}
                      {row.job.address ? ` · ${row.job.address}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill accent="amber">Service due</Pill>
                    {isDone ? (
                      <span className="anim-scale-in">
                        <Pill accent="coral">Nudged</Pill>
                      </span>
                    ) : (
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={busy === row.key}
                        disabled={noContact}
                        title={noContact ? "No phone or email on file" : undefined}
                        onClick={() => nudge(row)}
                      >
                        Nudge
                      </Btn>
                    )}
                  </div>
                </div>
              );
            }
            if (row.kind === "invoice") {
              return (
                <div
                  key={row.key}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {row.inv.customers?.name ?? "-"}
                      <span className="text-muted font-normal">
                        {" "}
                        · {formatMoney(Number(row.inv.total))}
                      </span>
                    </div>
                    <div className="text-xs text-red font-semibold">
                      {daysOverdue(row.inv.due_date!)} days overdue
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/pro/invoices"
                      className="text-xs font-semibold text-indigo hover:underline"
                    >
                      View
                    </Link>
                    {isDone ? (
                      <span className="anim-scale-in">
                        <Pill accent="indigo">Paid</Pill>
                      </span>
                    ) : (
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={busy === row.key}
                        onClick={() => markPaid(row)}
                      >
                        Mark paid
                      </Btn>
                    )}
                  </div>
                </div>
              );
            }
            const c = row.home.customer;
            const noContact = !c || (!c.phone && !c.email);
            return (
              <div key={row.key} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{row.home.address}</div>
                  <div className="text-xs text-muted">
                    {c?.name ? `${c.name} · ` : ""}record sent {daysAgo(row.home.sentAt)} days ago,
                    not claimed
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill accent="ink">Unclaimed</Pill>
                  {isDone ? (
                    <span className="anim-scale-in">
                      <Pill accent="indigo">Reminded</Pill>
                    </span>
                  ) : (
                    <Btn
                      variant="indigo"
                      size="sm"
                      loading={busy === row.key}
                      disabled={noContact}
                      title={noContact ? "No phone or email on file" : undefined}
                      onClick={() => remind(row)}
                    >
                      Remind
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both pass. Note: `Btn` in `src/lib/ui.tsx` may not accept a `title` prop; if lint/build complains, wrap the button in `<span title={...}>` instead.

- [ ] **Step 3: Commit**

```bash
git add src/components/action-queue.tsx
git commit -m "Add ActionQueue dashboard component with nudge, mark paid, remind"
```

---

### Task 7: maplibre-gl dependency + CustomerMap component

**Files:**
- Modify: `package.json`, `bun.lock` (via `bun add maplibre-gl`)
- Create: `src/components/customer-map.tsx`
- Modify: `src/styles.css` (append pin + canvas styles at the end)

**Interfaces:**
- Consumes: `Card, Pill` from `@/lib/ui`; `maplibre-gl` (dynamically imported, client only).
- Produces (exact exports from `@/components/customer-map`):
  - `type MapPinStatus = "owes" | "due" | "unclaimed" | "active"`
  - `type MapPin = { homeId: string; customerId: string | null; name: string; address: string; lat: number; lng: number; status: MapPinStatus }`
  - `CustomerMap({ pins, geocodingCount }: { pins: MapPin[]; geocodingCount?: number })`

- [ ] **Step 1: Install the dependency**

Run: `bun add maplibre-gl`
Expected: dependency added to `package.json`. The bunfig supply-chain guard blocks versions younger than 24h; if it blocks, confirm with the user before adding any exclusion.

- [ ] **Step 2: Append map styles to `src/styles.css`**

```css
/* Pro dashboard customer map */
.hb-map-pin {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
  cursor: pointer;
  padding: 0;
}
.hb-map-canvas .maplibregl-canvas {
  filter: saturate(0.82);
}
```

- [ ] **Step 3: Create `src/components/customer-map.tsx`**

```tsx
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Card, Eyebrow, Pill } from "@/lib/ui";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";

/* Customer map: MapLibre GL over free OSM raster tiles (no API key).
   The maplibre JS (~200KB) loads via dynamic import inside an effect, so it
   never runs during SSR and stays out of the main bundle. Pin colors follow
   status priority: coral owes money, amber due for service, ink unclaimed,
   indigo active. */

export type MapPinStatus = "owes" | "due" | "unclaimed" | "active";

export type MapPin = {
  homeId: string;
  customerId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: MapPinStatus;
};

const STATUS_META: Record<MapPinStatus, { label: string; color: string; accent: "coral" | "amber" | "ink" | "indigo" }> = {
  owes: { label: "Owes money", color: "var(--coral)", accent: "coral" },
  due: { label: "Due for service", color: "var(--amber)", accent: "amber" },
  unclaimed: { label: "Unclaimed", color: "var(--ink)", accent: "ink" },
  active: { label: "Active", color: "var(--indigo)", accent: "indigo" },
};

const FILTERS: (MapPinStatus | "all")[] = ["all", "owes", "due", "unclaimed", "active"];

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function CustomerMap({
  pins,
  geocodingCount = 0,
}: {
  pins: MapPin[];
  geocodingCount?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const [filter, setFilter] = useState<MapPinStatus | "all">("all");
  const [selected, setSelected] = useState<MapPin | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? pins : pins.filter((p) => p.status === filter)),
    [pins, filter],
  );

  const counts = useMemo(() => {
    const c: Record<MapPinStatus, number> = { owes: 0, due: 0, unclaimed: 0, active: 0 };
    for (const p of pins) c[p.status] += 1;
    return c;
  }, [pins]);

  useEffect(() => {
    if (!containerRef.current || visible.length === 0) return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: OSM_STYLE,
          center: [visible[0].lng, visible[0].lat],
          zoom: 11,
          attributionControl: { compact: true },
        });
      }
      for (const m of markersRef.current) m.remove();
      markersRef.current = visible.map((p) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "hb-map-pin";
        el.style.background = STATUS_META[p.status].color;
        el.setAttribute("aria-label", `${p.name}, ${p.address}`);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(p);
        });
        return new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(mapRef.current!);
      });
      if (visible.length === 1) {
        mapRef.current.jumpTo({ center: [visible[0].lng, visible[0].lat], zoom: 13 });
      } else {
        const b = new maplibregl.LngLatBounds();
        for (const p of visible) b.extend([p.lng, p.lat]);
        mapRef.current.fitBounds(b, { padding: 48, maxZoom: 14, duration: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(
    () => () => {
      for (const m of markersRef.current) m.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <Card className="anim-fade-up d-4 mt-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Eyebrow accent="indigo">Your customers on the map</Eyebrow>
        {geocodingCount > 0 && (
          <span className="text-xs text-muted tnum">
            Placing {geocodingCount} {geocodingCount === 1 ? "home" : "homes"} on the map...
          </span>
        )}
      </div>

      {pins.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Your service area appears here as customers are added.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f;
              const label =
                f === "all" ? `All (${pins.length})` : `${STATUS_META[f].label} (${counts[f]})`;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setSelected(null);
                  }}
                  className={`pressable rounded-full px-3 py-1 text-xs font-semibold border transition-colors duration-150 ${
                    active
                      ? "bg-indigobg text-indigo border-indigo/40"
                      : "bg-paper text-muted border-line hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative mt-3">
            <div
              ref={containerRef}
              className="hb-map-canvas h-[300px] md:h-[380px] rounded-2xl overflow-hidden border border-line"
            />
            {visible.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-soft/70 text-sm text-muted">
                No customers match this filter.
              </div>
            )}
            {selected && (
              <div className="absolute left-3 bottom-3 z-10 max-w-[280px] rounded-2xl border border-line bg-paper p-3 shadow-lg anim-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{selected.name}</div>
                    <div className="text-xs text-muted">{selected.address}</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setSelected(null)}
                    className="text-muted hover:text-ink shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Pill accent={STATUS_META[selected.status].accent}>
                    {STATUS_META[selected.status].label}
                  </Pill>
                  {selected.customerId && (
                    <Link
                      to="/pro/customers/$customerId"
                      params={{ customerId: selected.customerId }}
                      className="text-xs font-semibold text-indigo hover:underline"
                    >
                      Open customer →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun run lint && bun run build`
Expected: both pass. Watch for two known risks: (a) if `Pill`'s `Accent` type does not include all four accents used, check `src/lib/ui.tsx:70` (it accepts `Accent` which includes indigo/coral/amber/red/ink, so `"amber"` and `"ink"` are fine); (b) if `attributionControl: { compact: true }` mismatches the installed maplibre version's types, use `attributionControl: false` and add `new maplibregl.AttributionControl({ compact: true })` via `map.addControl(...)`.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/components/customer-map.tsx src/styles.css
git commit -m "Add CustomerMap component on maplibre-gl with OSM tiles"
```

---

### Task 8: Rewrite pro.index.tsx as the command center

**Files:**
- Modify: `src/routes/pro.index.tsx` (full rewrite)

**Interfaces:**
- Consumes: `MoneyRow` (Task 5); `ActionQueue, QueueJob, QueueStaleHome` (Task 6); `CustomerMap, MapPin` (Task 7); `ProHome, fetchProHomes, backfillHomeGeocodes, formatDate` from `@/lib/hb`; `listInvoicesForPro, isOverdue, ProInvoice` from `@/lib/invoices`; existing `SparkLine, ProgressRing, CountUp` from `@/components/svg`.
- Produces: the final dashboard page. Layout order: onboarding card (empty only) → MoneyRow → ActionQueue → CustomerMap → activity strip → Recent jobs + Win feed.

- [ ] **Step 1: Replace the full contents of `src/routes/pro.index.tsx`**

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card, Eyebrow, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import {
  backfillHomeGeocodes,
  fetchProHomes,
  formatDate,
  type ProHome,
} from "@/lib/hb";
import { isOverdue, listInvoicesForPro, type ProInvoice } from "@/lib/invoices";
import { CountUp, ProgressRing, SparkLine } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
import { MoneyRow } from "@/components/money-row";
import { ActionQueue, type QueueJob, type QueueStaleHome } from "@/components/action-queue";
import { CustomerMap, type MapPin } from "@/components/customer-map";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Dashboard - HomesBrain" }] }),
  component: ProDashboard,
});

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  home_id: string;
  homes: { address: string } | null;
};
type JobRow = {
  id: string;
  home_id: string;
  what_done: string;
  next_service_date: string | null;
  created_at: string;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
  homes: { address: string } | null;
  records: { id: string; viewed_at: string | null; sent_sms_at: string | null }[] | null;
};
type RebookEvent = {
  id: string;
  created_at: string;
  props: { job_id?: string; pro_id?: string; home_id?: string };
};
type ReviewEvent = { id: string; created_at: string; props: { customer_id?: string } };
type Win = {
  key: string;
  ts: string;
  label: string;
  detail?: string;
  kind: "viewed" | "claimed" | "rebooked" | "review";
};

const DAY = 24 * 3600 * 1000;
const DUE_WINDOW = 14 * DAY;
const STALE_UNCLAIMED = 7 * DAY;

function ProDashboard() {
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<ProInvoice[]>([]);
  const [homes, setHomes] = useState<ProHome[]>([]);
  const [rebooks, setRebooks] = useState<RebookEvent[]>([]);
  const [reviewAsks, setReviewAsks] = useState<ReviewEvent[]>([]);
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const backfillStarted = useRef(false);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const [{ data: c }, { data: j }, inv, hs, { data: rb }, { data: rv }] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone,email,home_id,homes(address)")
          .eq("pro_id", proId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select(
            "id,home_id,what_done,next_service_date,created_at,customers(id,name,phone,email),homes(address),records(id,viewed_at,sent_sms_at)",
          )
          .eq("pro_id", proId)
          .order("created_at", { ascending: false }),
        listInvoicesForPro(proId),
        fetchProHomes(proId),
        supabase
          .from("events")
          .select("id,created_at,props")
          .eq("type", "rebooked")
          .eq("props->>pro_id", proId)
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id,created_at,props")
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .order("created_at", { ascending: false }),
      ]);
      setCustomers((c ?? []) as unknown as CustomerRow[]);
      setJobs((j ?? []) as unknown as JobRow[]);
      setInvoices(inv);
      setHomes(hs);
      setRebooks((rb ?? []) as unknown as RebookEvent[]);
      setReviewAsks((rv ?? []) as unknown as ReviewEvent[]);
      setLoading(false);
    })();
  }, [proId]);

  // Lazy geocode backfill: up to 5 ungeocoded homes per visit, 1s apart.
  useEffect(() => {
    if (loading || backfillStarted.current) return;
    const pending = homes.filter((h) => !h.geocoded_at);
    if (pending.length === 0) return;
    backfillStarted.current = true;
    setGeocodingCount(Math.min(pending.length, 5));
    void backfillHomeGeocodes(homes, (updated) => {
      setHomes((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setGeocodingCount((n) => Math.max(0, n - 1));
    });
  }, [loading, homes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const sentCount = jobs.length;
  const viewedCount = jobs.filter((j) => j.records?.[0]?.viewed_at).length;

  const weeklyJobs = useMemo(() => {
    const buckets = new Array(8).fill(0);
    const now = Date.now();
    for (const j of jobs) {
      const weeksAgo = Math.floor((now - new Date(j.created_at).getTime()) / (7 * DAY));
      if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += 1;
    }
    return buckets;
  }, [jobs]);

  const rebooksThisMonth = useMemo(() => {
    const now = new Date();
    return rebooks.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [rebooks]);

  // Queue source 1: jobs due within 14 days or overdue, most overdue first.
  const dueQueue = useMemo<QueueJob[]>(
    () =>
      jobs
        .filter(
          (j) =>
            j.next_service_date &&
            new Date(j.next_service_date).getTime() - Date.now() <= DUE_WINDOW,
        )
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))
        .map((j) => ({
          id: j.id,
          what_done: j.what_done,
          next_service_date: j.next_service_date!,
          customer: j.customers,
          address: j.homes?.address ?? null,
        })),
    [jobs],
  );

  // Queue source 2: open invoices past due, most overdue first.
  const overdueInvoices = useMemo(
    () =>
      invoices
        .filter((i) => isOverdue(i))
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [invoices],
  );

  // Queue source 3: unclaimed homes whose latest record went out 7+ days ago.
  const staleHomes = useMemo<QueueStaleHome[]>(() => {
    const customerByHome = new Map(customers.map((c) => [c.home_id, c]));
    const latestSentByHome = new Map<string, string>();
    for (const j of jobs) {
      const sent = j.records?.[0]?.sent_sms_at;
      if (!sent) continue;
      const prev = latestSentByHome.get(j.home_id);
      if (!prev || sent > prev) latestSentByHome.set(j.home_id, sent);
    }
    return homes
      .filter((h) => !h.claimed_at)
      .flatMap((h) => {
        const sentAt = latestSentByHome.get(h.id);
        if (!sentAt || Date.now() - new Date(sentAt).getTime() < STALE_UNCLAIMED) return [];
        const c = customerByHome.get(h.id);
        return [
          {
            homeId: h.id,
            address: h.address,
            customer: c ? { id: c.id, name: c.name, phone: c.phone, email: c.email } : null,
            sentAt,
          },
        ];
      })
      .sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));
  }, [homes, jobs, customers]);

  // Map pins: status priority owes > due > unclaimed > active.
  const pins = useMemo<MapPin[]>(() => {
    const customerByHome = new Map(customers.map((c) => [c.home_id, c]));
    const owesHomes = new Set(
      invoices.filter((i) => i.status === "open").map((i) => i.home_id),
    );
    const dueHomes = new Set(
      jobs
        .filter(
          (j) =>
            j.next_service_date &&
            new Date(j.next_service_date).getTime() - Date.now() <= DUE_WINDOW,
        )
        .map((j) => j.home_id),
    );
    return homes
      .filter((h) => h.lat !== null && h.lng !== null)
      .map((h) => {
        const c = customerByHome.get(h.id);
        const status = owesHomes.has(h.id)
          ? ("owes" as const)
          : dueHomes.has(h.id)
            ? ("due" as const)
            : !h.claimed_at
              ? ("unclaimed" as const)
              : ("active" as const);
        return {
          homeId: h.id,
          customerId: c?.id ?? null,
          name: c?.name ?? "Customer",
          address: h.address,
          lat: h.lat!,
          lng: h.lng!,
          status,
        };
      });
  }, [homes, customers, invoices, jobs]);

  const wins = useMemo<Win[]>(() => {
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const list: Win[] = [];
    for (const j of jobs) {
      const viewedAt = j.records?.[0]?.viewed_at;
      if (viewedAt) {
        list.push({
          key: `viewed-${j.id}`,
          ts: viewedAt,
          label: `${j.customers?.name ?? "A homeowner"} viewed their service record`,
          detail: j.homes?.address ?? undefined,
          kind: "viewed",
        });
      }
    }
    for (const h of homes) {
      if (!h.claimed_at) continue;
      list.push({
        key: `claimed-${h.id}`,
        ts: h.claimed_at,
        label: `${h.address} was claimed by the homeowner`,
        kind: "claimed",
      });
    }
    for (const r of rebooks) {
      const job = r.props.job_id ? jobById.get(r.props.job_id) : undefined;
      list.push({
        key: `rebooked-${r.id}`,
        ts: r.created_at,
        label: `${job?.customers?.name ?? "A homeowner"} rebooked from their reminder`,
        detail: job?.what_done,
        kind: "rebooked",
      });
    }
    for (const r of reviewAsks) {
      const cust = r.props.customer_id ? customerById.get(r.props.customer_id) : undefined;
      list.push({
        key: `review-${r.id}`,
        ts: r.created_at,
        label: `Review requested from ${cust?.name ?? "a customer"}`,
        kind: "review",
      });
    }
    return list.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 5);
  }, [jobs, customers, homes, rebooks, reviewAsks]);

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="dashboard">
        <ProPageSkeleton variant="dashboard" />
      </ProShell>
    );
  }

  const empty = jobs.length === 0;
  const viewRate = sentCount ? viewedCount / sentCount : 0;

  return (
    <ProShell pro={pro} active="dashboard">
      <ProPageHead
        eyebrow="Dashboard"
        title={pro.business}
        sub={pro.google_rating ? `${pro.google_rating} ★ on Google` : undefined}
      />

      {empty && (
        <Card className="anim-fade-up mb-5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <CoreLoopScene variant="compact" pose="pro" className="w-28 shrink-0 opacity-90" />
          <div className="flex-1 min-w-[200px]">
            <Eyebrow accent="indigo">Get started</Eyebrow>
            <div className="mt-1 font-semibold text-ink">Log your first job (about 30 seconds)</div>
            <p className="text-sm text-muted mt-0.5">
              We'll send a branded record to your customer and ask for a Google review.
            </p>
          </div>
          <Link to="/pro/jobs/new" className="shrink-0">
            <Btn variant="indigo">Log a job</Btn>
          </Link>
        </Card>
      )}

      <MoneyRow
        invoices={invoices}
        rebooksThisMonth={rebooksThisMonth}
        rebooksAllTime={rebooks.length}
      />

      <ActionQueue
        proId={proId!}
        proBusiness={pro.business}
        dueJobs={dueQueue}
        overdueInvoices={overdueInvoices}
        staleHomes={staleHomes}
        onInvoicePaid={(invoiceId) =>
          setInvoices((prev) =>
            prev.map((i) =>
              i.id === invoiceId
                ? { ...i, status: "paid" as const, paid_at: new Date().toISOString() }
                : i,
            ),
          )
        }
        onToast={setToast}
      />

      <CustomerMap pins={pins} geocodingCount={geocodingCount} />

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="anim-fade-up d-4">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Records sent</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="text-xl font-semibold font-display">
              <CountUp value={sentCount} />
            </div>
            <SparkLine points={weeklyJobs} color="var(--indigo)" width={64} height={22} />
          </div>
        </Card>
        <Card className="anim-fade-up d-4">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">View rate</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <ProgressRing
              value={viewRate}
              size={40}
              strokeWidth={4}
              label={`${Math.round(viewRate * 100)}% of records viewed`}
            />
            <div className="text-xs text-muted tnum">
              {viewedCount} of {sentCount} viewed
            </div>
          </div>
        </Card>
        <Link to="/pro/customers" className="block">
          <Card lift className="anim-fade-up d-4 h-full">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">Customers</div>
            <div className="mt-1.5 text-xl font-semibold font-display">
              <CountUp value={customers.length} />
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-5 items-start">
        <Card className="anim-fade-up d-5">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">Recent jobs</Eyebrow>
            <Link to="/pro/records" className="text-xs font-semibold text-indigo hover:underline">
              All records →
            </Link>
          </div>
          {jobs.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              No jobs yet. The jobs you log will show here with their record status.
            </p>
          )}
          <div className="mt-3 divide-y divide-line">
            {jobs.slice(0, 8).map((j) => {
              const rec = j.records?.[0];
              const inner = (
                <>
                  <div>
                    <div className="font-semibold text-ink">{j.customers?.name ?? "-"}</div>
                    <div className="text-xs text-muted">{j.homes?.address}</div>
                    <div className="text-sm mt-0.5">{j.what_done}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted font-mono tnum">
                      {formatDate(j.created_at)}
                    </div>
                    {rec?.viewed_at ? (
                      <Pill accent="indigo">Viewed</Pill>
                    ) : rec?.sent_sms_at ? (
                      <Pill accent="indigo">Sent</Pill>
                    ) : null}
                  </div>
                </>
              );
              const rowCls =
                "py-3 flex items-start justify-between gap-3 -mx-2 px-2 rounded-lg hover:bg-soft active:bg-line/50 transition-colors duration-150";
              return rec ? (
                <Link
                  key={j.id}
                  to="/pro/records/$recordId"
                  params={{ recordId: rec.id }}
                  className={rowCls}
                >
                  {inner}
                </Link>
              ) : (
                <div key={j.id} className={rowCls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="anim-fade-up d-5">
          <Eyebrow accent="indigo">Wins</Eyebrow>
          {wins.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Wins from your records (views, claims, rebooks) will show up here.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {wins.map((w) => (
                <div key={w.key} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{w.label}</div>
                    {w.detail && <div className="text-xs text-muted">{w.detail}</div>}
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-xs text-muted font-mono tnum">{formatDate(w.ts)}</div>
                    {w.kind === "rebooked" ? (
                      <Pill accent="coral">Rebooked</Pill>
                    ) : (
                      <Pill accent="indigo">
                        {w.kind === "viewed"
                          ? "Viewed"
                          : w.kind === "claimed"
                            ? "Claimed"
                            : "Review ask"}
                      </Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
```

Notes for the implementer:

- The old file had an unused `requests`/`fetchNotifications` state and a `panel` due/customers tab card; both are intentionally gone (the queue replaces the tab card).
- The claimed-homes query is gone: `fetchProHomes` returns all homes and the win feed filters `claimed_at` client-side.
- `SparkLine` and `ProgressRing` accept the size overrides shown (`width`/`height` and `size`/`strokeWidth` are existing props in `src/components/svg.tsx`).

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/pro.index.tsx
git commit -m "Rebuild pro dashboard as command center with money row, queue, map"
```

---

### Task 9: End-to-end verification in the dev server

**Files:** none (fix regressions in the files above if found, then amend nothing; make new commits).

- [ ] **Step 1: Start the dev server**

Run: `bun dev` (leave running). Log in as a pro via `/login` (mock OTP; role pro).

- [ ] **Step 2: Seed the states you need**

Through the UI: log a job with a new customer + address (real-looking US address so Nominatim resolves), set a `next_service_date` in the past for one job, create invoices at `/pro/invoices/new` (one open with a past due date, one you mark paid). Homes and events from earlier demo data cover claims/rebooks if present.

- [ ] **Step 3: Walk the checklist**

1. Money row: tile values match hand-computed sums from `/pro/invoices`; all four tiles navigate; chart shows 6 months with hover titles; "% collected" readout is plausible; fresh pro shows the chart empty state.
2. Queue: all three source types render in order (overdue service, overdue invoices, stale unclaimed); Nudge writes a `messages` row and logs `rebook_nudge_sent` (console shows `[event]`); Mark paid flips the invoice and the money row updates; Remind logs `claim_nudge_sent`; disabled state shows for a contact-less customer; empty state renders when nothing pending.
3. Map: the new home from Step 2 gets a pin (may take a second; check `homes.lat` populated); ungeocoded older homes backfill up to 5 with the "Placing n homes..." note; pin colors match status; chips filter; clicking a pin opens the overlay with a working customer link; fresh pro sees the empty copy; no SSR crash on hard reload of `/pro`.
4. Activity strip: sent count, view rate ring, customers tile link.
5. Recent jobs and Wins render; Wins caps at 5.
6. Mobile width (devtools ~390px): everything stacks, map is 300px tall, queue rows wrap without overflow.

- [ ] **Step 4: Final gates**

Run: `bun run lint && bun run build`
Expected: both pass. Fix and commit anything found.

- [ ] **Step 5: Update Notion**

Per the working agreement, update the Pro dashboard screen Status in the Notion Screen inventory (or tell the user to if Notion access is unavailable).
