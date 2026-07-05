# Pro Dashboard Money-First Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three payoff widgets to the `/pro` dashboard home page: a coral rebooked counter, a review tracker, and a full-width win feed, all read from existing tables.

**Architecture:** All changes live in `src/routes/pro.index.tsx`. Three new Supabase reads (rebooked events, review-request events, claimed homes) join the existing `Promise.all`; widgets are built from the `src/lib/ui.tsx` kit and `src/components/svg.tsx` primitives. No schema changes, no new events logged, no new routes.

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase JS client (`@/integrations/supabase/client`).

**Spec:** `docs/superpowers/specs/2026-07-05-pro-dashboard-money-widgets-design.md`

## Global Constraints

- Never use em dashes (U+2014) anywhere: copy, comments, commits.
- Existing tables only: no migrations, no schema changes.
- Coral is for payoff moments only (rebook entries, rebooked count); everything else indigo/ink. Amber and red are not used here.
- Secondary text stays `text-muted`, never opacity-lightened.
- Build from `src/lib/ui.tsx` primitives (Card, Eyebrow, Pill), not `src/components/ui/` (shadcn).
- `src/routeTree.gen.ts` is auto-generated: never edit it.
- There is no test suite. Verification is `bun run lint`, `bun run build`, and exercising the flow in `bun dev`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Data fetching + payoff row (rebooked counter and review tracker)

**Files:**
- Modify: `src/routes/pro.index.tsx`

**Interfaces:**
- Consumes: `useProGuard()` from `@/components/pro-shell` (provides `proId: string | null`, `pro` with `google_rating`, `google_place_id`); `supabase` client; `Card`, `Pill` from `@/lib/ui`; `CountUp` from `@/components/svg`.
- Produces: component state `rebooks: RebookEvent[]`, `reviewAsks: ReviewEvent[]`, `claimedHomes: ClaimedHome[]` and the type aliases below. Task 2 relies on these exact names.

- [ ] **Step 1: Add types and state**

In `src/routes/pro.index.tsx`, below the existing `JobRow` type, add:

```tsx
type RebookEvent = {
  id: string;
  created_at: string;
  props: { job_id?: string; pro_id?: string; home_id?: string };
};
type ReviewEvent = { id: string; created_at: string; props: { customer_id?: string } };
type ClaimedHome = { id: string; address: string; claimed_at: string };
```

Inside `ProDashboard`, below the existing `jobs` state, add:

```tsx
const [rebooks, setRebooks] = useState<RebookEvent[]>([]);
const [reviewAsks, setReviewAsks] = useState<ReviewEvent[]>([]);
const [claimedHomes, setClaimedHomes] = useState<ClaimedHome[]>([]);
```

- [ ] **Step 2: Extend the Promise.all with the three new reads**

Replace the destructuring and queries in the `useEffect` so it reads:

```tsx
const [{ data: c }, { data: j }, { data: rb }, { data: rv }, { data: ch }] = await Promise.all([
  supabase
    .from("customers")
    .select("id,name,phone,email,homes(address)")
    .eq("pro_id", proId)
    .order("created_at", { ascending: false }),
  supabase
    .from("jobs")
    .select(
      "id,what_done,next_service_date,created_at,customers(name),homes(address),records(id,viewed_at,sent_sms_at)",
    )
    .eq("pro_id", proId)
    .order("created_at", { ascending: false }),
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
  supabase
    .from("homes")
    .select("id,address,claimed_at")
    .eq("created_by_pro", proId)
    .not("claimed_at", "is", null)
    .order("claimed_at", { ascending: false }),
]);
setCustomers((c ?? []) as unknown as CustomerRow[]);
setJobs((j ?? []) as unknown as JobRow[]);
setRebooks((rb ?? []) as unknown as RebookEvent[]);
setReviewAsks((rv ?? []) as unknown as ReviewEvent[]);
setClaimedHomes((ch ?? []) as unknown as ClaimedHome[]);
setLoading(false);
```

The JSON filter `props->>pro_id` matches the shape logged in `home.reminders.tsx` and `home.pros.tsx` (`rebooked` events carry `props.pro_id`). The `review_requested` filter matches `pro.reviews.tsx`.

- [ ] **Step 3: Compute the month bucket**

Below the existing `weeklyJobs` memo, add:

```tsx
const rebooksThisMonth = useMemo(() => {
  const now = new Date();
  return rebooks.filter((r) => {
    const d = new Date(r.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}, [rebooks]);
```

- [ ] **Step 4: Render the payoff row**

Directly after the closing `</div>` of the existing 4-card stat grid (`grid grid-cols-2 md:grid-cols-4 gap-4`), add:

```tsx
<div className="mt-4 grid md:grid-cols-3 gap-4">
  <Card lift className="anim-fade-up d-2 md:col-span-2">
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs uppercase tracking-wider text-muted font-bold">
        Rebooked via HomesBrain
      </div>
      {rebooks.length > 0 && <Pill accent="coral">Payoff</Pill>}
    </div>
    {rebooks.length === 0 ? (
      <p className="mt-2 text-sm text-muted">
        When homeowners rebook from their HomesBrain reminders, wins land here.
      </p>
    ) : (
      <div className="mt-2 flex items-end gap-8">
        <div>
          <div className="text-3xl font-semibold font-display text-coral">
            <CountUp value={rebooksThisMonth} />
          </div>
          <div className="text-xs text-muted mt-0.5">this month</div>
        </div>
        <div>
          <div className="text-3xl font-semibold font-display">
            <CountUp value={rebooks.length} />
          </div>
          <div className="text-xs text-muted mt-0.5">all time</div>
        </div>
      </div>
    )}
  </Card>
  <Link to="/pro/reviews" className="block">
    <Card lift className="anim-fade-up d-3 h-full">
      <div className="text-xs uppercase tracking-wider text-muted font-bold">Reviews</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="text-3xl font-semibold font-display tnum">
          {pro.google_place_id && pro.google_rating ? pro.google_rating : "-"}
        </div>
        {!!pro.google_place_id && <Star size={18} className="text-coral fill-coralbg" />}
      </div>
      <div className="text-xs text-muted mt-1">
        {reviewAsks.length} review {reviewAsks.length === 1 ? "ask" : "asks"} sent
      </div>
    </Card>
  </Link>
</div>
```

Add `Star` to the imports: `import { Star } from "lucide-react";` (top of file). The coral star mirrors the existing `pro.reviews.tsx` treatment; all other accents in this card are ink/muted.

- [ ] **Step 5: Lint and build**

Run: `bun run lint && bun run build`
Expected: both pass with no errors for `pro.index.tsx`.

- [ ] **Step 6: Visual check in dev**

Run `bun dev`, log in as a pro (mock OTP at `/login`), open `/pro`. Confirm: the new row renders between the stat cards and the Recent jobs row; a pro with no rebooks sees the empty-state copy; the Reviews card links to `/pro/reviews`.

- [ ] **Step 7: Commit**

```bash
git add src/routes/pro.index.tsx
git commit -m "feat(pro): add rebooked counter and review tracker to dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Win feed

**Files:**
- Modify: `src/routes/pro.index.tsx`

**Interfaces:**
- Consumes: state from Task 1 (`rebooks`, `reviewAsks`, `claimedHomes`), existing `jobs` and `customers` state, `formatDate` from `@/lib/hb`, `Card`, `Eyebrow`, `Pill` from `@/lib/ui`.
- Produces: nothing consumed later; final rendering change.

- [ ] **Step 1: Build the merged win list**

Below the `rebooksThisMonth` memo, add:

```tsx
type Win = {
  key: string;
  ts: string;
  label: string;
  detail?: string;
  kind: "viewed" | "claimed" | "rebooked" | "review";
};

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
  for (const h of claimedHomes) {
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
  return list.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10);
}, [jobs, customers, claimedHomes, rebooks, reviewAsks]);
```

- [ ] **Step 2: Render the win feed card**

After the closing `</div>` of the existing two-column row (Recent jobs | tab card), add:

```tsx
<Card className="anim-fade-up d-5 mt-5">
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
                {w.kind === "viewed" ? "Viewed" : w.kind === "claimed" ? "Claimed" : "Review ask"}
              </Pill>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</Card>
```

- [ ] **Step 3: Lint and build**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/pro.index.tsx
git commit -m "feat(pro): add win feed to dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: End-to-end verification

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1-2.
- Produces: confirmation that all widgets populate and empty states render.

- [ ] **Step 1: Exercise the full loop in dev**

With `bun dev` running:
1. Log in as a pro at `/login` (mock OTP).
2. Log a job at `/pro/jobs/new`; note the record URL from the on-screen message preview.
3. Open the record at `/r/:id` (marks it viewed, logs `record_viewed`).
4. Claim the home at `/claim/:id` as a homeowner.
5. As the homeowner, rebook from `/home/reminders` (logs a `rebooked` event with `pro_id`).
6. Return to `/pro`: confirm the rebooked counter shows 1/1 in coral, the Reviews card shows 1 review ask sent, and the win feed shows all four entry kinds in reverse-chronological order with a coral pill only on the rebook.

- [ ] **Step 2: Empty-state check**

Sign out, sign up as a brand-new pro at `/pro/signup`, open `/pro`: confirm the rebooked card shows the empty-state copy, the Reviews card shows "-" and "0 review asks sent", and the Wins card shows its empty state. No console errors.

- [ ] **Step 3: Update the screen inventory**

Per the working agreement, note in the Notion Screen inventory that the Pro dashboard screen gained rebooked counter, review tracker, and win feed (or flag to the user to update it if Notion access is unavailable).
