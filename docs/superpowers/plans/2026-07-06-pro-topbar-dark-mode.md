# Pro Top Bar + Portal Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop top bar to the Pro portal (global search, log-a-job shortcut, theme toggle, bell, account menu) and a dark theme for both app portals.

**Architecture:** A small theme lib (`src/lib/theme.ts`) persists `hb_theme` in localStorage and both shells apply a `dark` class on their root div. All brand colors flow through CSS variables, so a `.dark { ... }` token block in `styles.css` re-themes everything. The top bar is a new header inside `ProShell`'s content column; search is a standalone component.

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase client, lucide-react icons. No test suite: verify with `bun run lint` and `bun dev`.

## Global Constraints

- Never use em dashes (U+2014) anywhere: copy, comments, commits.
- Indigo is the brand color; coral only for payoff moments; amber warnings; red errors.
- Keep secondary text at `--muted` exactly, no opacity lightening; maintain WCAG AA.
- Marketing, public record (`/r/:id`), claim, login, signup pages stay light.
- Do not edit `src/routeTree.gen.ts` or `src/integrations/supabase/*`.
- `src/lib/ui.tsx` and `src/styles.css` have pre-existing uncommitted changes in the working tree: before the first commit that touches them, inspect `git diff` on those files and keep unrelated WIP out of task commits if it is clearly separate work.

---

### Task 1: Theme lib + toggle component

**Files:**
- Create: `src/lib/theme.ts`
- Create: `src/components/theme-toggle.tsx`

**Interfaces:**
- Produces: `getTheme(): Theme`, `setTheme(t: Theme)`, `useTheme(): [Theme, (t: Theme) => void]` from `@/lib/theme`; `<ThemeToggle />` (no props) from `@/components/theme-toggle`.

- [ ] **Step 1: Write `src/lib/theme.ts`**

```ts
// Portal theme preference. Mirrors the session.ts pattern: localStorage +
// a window event so every mounted toggle stays in sync. Marketing pages
// never read this; only the portal shells apply the class.
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "hb_theme";
const EVENT = "hb_theme_change";

/* Private-mode fallback: if localStorage throws, the choice still works
   for the current page life via this module variable. */
let memoryTheme: Theme | null = null;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* fall through to memory */
  }
  return memoryTheme ?? "light";
}

export function setTheme(t: Theme) {
  memoryTheme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* memory-only */
  }
  window.dispatchEvent(new Event(EVENT));
}

/* SSR renders light; the effect corrects after hydration. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => set(getTheme());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [theme, setTheme];
}
```

- [ ] **Step 2: Write `src/components/theme-toggle.tsx`**

```tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/* Icon button matching the bell/sign-out chrome in the shells. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="pressable text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
```

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: passes (new files clean).

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme.ts src/components/theme-toggle.tsx
git commit -m "Add portal theme lib and toggle component"
```

---

### Task 2: Dark token palette + hardcoded-color fixes

**Files:**
- Modify: `src/styles.css` (add `.dark` block after `:root`, add `--on-indigo` token)
- Modify: `src/lib/ui.tsx` (Toast, Btn indigo variant, any `text-white`-on-indigo)

**Interfaces:**
- Produces: `.dark` scope that re-themes all tokens; `--on-indigo` var for text on indigo fills (white in light, near-black in dark).

- [ ] **Step 1: Add `--on-indigo` to `:root` in `styles.css`** (inside the existing `:root` block, after `--redbg`):

```css
  /* Text on solid indigo fills. Flips dark in dark mode because the dark
     palette brightens indigo past AA-with-white. */
  --on-indigo: #ffffff;
```

- [ ] **Step 2: Add the `.dark` block in `styles.css`** directly below the `:root` block:

```css
/* Dark theme: applied by the portal shells on their root div only.
   Marketing and public record pages never get this class. Same warm-ledger
   personality, inverted: cards stay one step lighter than the page. */
.dark {
  --ink: #f0eee6;
  --muted: #9b988f;
  --line: #33322a;
  --bg: #201f18;
  --paper: #201f18;
  --soft: #171610;

  --indigo: #8a82ea;
  --indigobg: #2a2751;
  --indigo-dark: #c5c1f5;
  --coral: #e87a4a;
  --coralbg: #3f2118;
  --coral-dark: #f2a184;
  --amber: #d9a04a;
  --amberbg: #3a2f16;
  --amber-dark: #ecc687;
  --red: #e06c6c;
  --redbg: #402020;

  --on-indigo: #191813;
}
```

- [ ] **Step 3: Fix hardcoded light-mode colors in `src/lib/ui.tsx`**

First read the `btnStyles` map near the top of the file. Apply:

1. Btn indigo variant: replace `text-white` with `text-(--on-indigo)` (keep everything else). If other variants hardcode `text-white` on token fills (e.g. an ink variant), leave them: `bg-ink` flips light in dark and `text-white`... check each: any `bg-ink text-white` combo must become `bg-ink text-bg`.
2. Toast: `bg-ink text-white` becomes `bg-ink text-bg`, and the inline check-svg `stroke="#fff"` becomes `stroke="var(--bg)"`.

- [ ] **Step 4: Sweep the shells and portal surfaces for other breakers**

Run: `rg -n "text-white|#fff|rgba\(" src/components/pro-shell.tsx src/components/home-shell.tsx src/lib/ui.tsx`
Fix only combos that break in dark: `bg-indigo ... text-white` becomes `text-(--on-indigo)` (the bell badge in `pro-shell.tsx` has one). Leave rgba shadows alone.

- [ ] **Step 5: Lint + commit**

```bash
bun run lint
git add src/styles.css src/lib/ui.tsx src/components/pro-shell.tsx
git commit -m "Add dark token palette and fix hardcoded light-mode colors"
```

(If `git diff` shows unrelated pre-existing WIP in `ui.tsx`/`styles.css`, note it in the commit body or split it out first.)

---

### Task 3: Global search component

**Files:**
- Create: `src/components/pro-search.tsx`

**Interfaces:**
- Consumes: `supabase` client, `logEvent(actor, type, props)` from `@/lib/hb`.
- Produces: `<GlobalSearch proId={string | null} />` from `@/components/pro-search`.

- [ ] **Step 1: Write `src/components/pro-search.tsx`**

```tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";

type Hit = {
  kind: "customer" | "record";
  id: string;
  primary: string;
  secondary: string | null;
};

/* Top-bar combobox: finds the pro's own customers (name/phone) and recent
   records (home address). Debounced 250ms, min 2 chars, max 6 rows.
   Failures resolve to empty groups; search must never break the shell. */
export function GlobalSearch({ proId }: { proId: string | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!proId || term.length < 2) {
      setHits([]);
      setOpen(false);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      /* Commas and parens would break PostgREST or() syntax. */
      const safe = term.replace(/[,()]/g, " ").trim();
      const like = `%${safe}%`;
      const [cust, jobs] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone")
          .eq("pro_id", proId)
          .or(`name.ilike.${like},phone.ilike.${like}`)
          .limit(4),
        supabase
          .from("jobs")
          .select("id,what_done,homes!inner(address),records(id)")
          .eq("pro_id", proId)
          .ilike("homes.address", like)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const next: Hit[] = [];
      for (const c of cust.data ?? []) {
        next.push({ kind: "customer", id: c.id, primary: c.name, secondary: c.phone });
      }
      for (const j of jobs.data ?? []) {
        const recordId = j.records?.[0]?.id;
        if (!recordId) continue;
        next.push({
          kind: "record",
          id: recordId,
          primary: j.homes?.address ?? "Record",
          secondary: j.what_done,
        });
      }
      setHits(next.slice(0, 6));
      setSearched(true);
      setOpen(true);
      setActive(-1);
    }, 250);
    return () => clearTimeout(t);
  }, [q, proId]);

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    setSearched(false);
    inputRef.current?.blur();
    logEvent(proId, "search_used", { kind: hit.kind, q: q.trim() });
    if (hit.kind === "customer") {
      navigate({ to: "/pro/customers/$customerId", params: { customerId: hit.id } });
    } else {
      navigate({ to: "/pro/records/$recordId", params: { recordId: hit.id } });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && active >= 0 && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const groups: { label: string; kind: Hit["kind"]; icon: typeof User }[] = [
    { label: "Customers", kind: "customer", icon: User },
    { label: "Records", kind: "record", icon: FileText },
  ];

  return (
    <div className="relative flex-1 max-w-[420px]">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => searched && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="pro-search-listbox"
        aria-label="Search customers and records"
        placeholder="Search customers, records..."
        className="w-full h-10 rounded-full border border-line bg-soft pl-9 pr-4 text-sm text-ink placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10 hover:border-ink/30"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="pro-search-listbox"
            role="listbox"
            aria-label="Search results"
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] overflow-hidden"
          >
            {hits.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">No matches</p>
            ) : (
              groups.map(({ label, kind, icon: Icon }) => {
                const rows = hits.filter((h) => h.kind === kind);
                if (rows.length === 0) return null;
                return (
                  <div key={kind} className="py-1.5 border-b border-line last:border-b-0">
                    <div className="px-4 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      {label}
                    </div>
                    {rows.map((h) => {
                      const idx = hits.indexOf(h);
                      return (
                        <button
                          key={`${h.kind}-${h.id}`}
                          role="option"
                          aria-selected={idx === active}
                          onClick={() => go(h)}
                          onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-left ${
                            idx === active ? "bg-soft" : ""
                          }`}
                        >
                          <Icon size={15} className="text-muted shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink truncate">
                              {h.primary}
                            </span>
                            {h.secondary && (
                              <span className="block text-xs text-muted truncate">
                                {h.secondary}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

Note: if TypeScript complains about `j.records` / `j.homes` shapes from the generated types (array vs object for the join), coerce with a local type for the row instead of `any`, e.g. `type JobHit = { id: string; what_done: string; homes: { address: string } | null; records: { id: string }[] | null }` and `const rows = (jobs.data ?? []) as unknown as JobHit[]`.

- [ ] **Step 2: Lint + commit**

```bash
bun run lint
git add src/components/pro-search.tsx
git commit -m "Add pro global search combobox"
```

---

### Task 4: ProShell top bar, sidebar cleanup, account menu

**Files:**
- Modify: `src/components/pro-shell.tsx`

**Interfaces:**
- Consumes: `useTheme` from `@/lib/theme`, `ThemeToggle`, `GlobalSearch`; existing `NotificationsBell`, `Avatar`, `Btn`, `Skeleton`, `tradeLabel`, `clearSession`.
- Produces: unchanged public API (`ProShell`, `useProGuard`, `ProPageHead`, `ProPageSkeleton`, `ProNavKey`).

- [ ] **Step 1: Add imports and theme wiring**

Add to imports: `useTheme` from `@/lib/theme`, `ThemeToggle` from `@/components/theme-toggle`, `GlobalSearch` from `@/components/pro-search`. Inside `ProShell`, first line: `const [theme] = useTheme();` and change the root div to:

```tsx
<div className={`font-app min-h-dvh bg-soft md:flex ${theme === "dark" ? "dark" : ""}`}>
```

- [ ] **Step 2: Sidebar header back to logo-only**

Remove `{pro && <NotificationsBell proId={pro.id} align="left" />}` and change the header div class from `justify-between` to plain flex (match HomeShell's `px-5 h-16 flex items-center border-b border-line`).

- [ ] **Step 3: Remove the sidebar footer block**

Delete the entire `<div className="p-3 border-t border-line">...</div>` (identity card + sign-out button). Keep `signOut()` in the component: the account menu and mobile header use it.

- [ ] **Step 4: Add `AccountMenu` component** (below `NotificationsBell` in the same file):

```tsx
/* Avatar dropdown in the top bar: identity, Settings, Sign out.
   Same overlay pattern as NotificationsBell. */
function AccountMenu({ pro, onSignOut }: { pro: ProRow | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  if (!pro) return <Skeleton className="w-8 h-8 rounded-xl shrink-0" />;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="pressable block rounded-xl"
      >
        <Avatar name={pro.business} accent="indigo" size={32} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Account"
            className="absolute top-full right-0 mt-2 z-50 w-64 rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-line flex items-center gap-2.5">
              <Avatar name={pro.business} accent="indigo" size={36} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink truncate">{pro.business}</div>
                <div className="text-xs text-muted truncate">{tradeLabel(pro.trade)}</div>
              </div>
            </div>
            <div className="p-1.5">
              <Link
                to="/pro/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="pressable flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted font-semibold hover:text-ink hover:bg-soft"
              >
                <Settings size={16} /> Settings
              </Link>
              <button
                role="menuitem"
                onClick={onSignOut}
                className="pressable w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted font-semibold hover:text-ink hover:bg-soft"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add the top bar** in the content column, ABOVE the existing mobile `<header>`:

```tsx
{/* Desktop top bar: search left, actions right. Mobile keeps its own header. */}
<header className="hidden md:flex sticky top-0 z-40 h-16 items-center gap-3 px-6 border-b border-line bg-paper/85 backdrop-blur-md">
  <GlobalSearch proId={pro?.id ?? null} />
  <div className="ml-auto flex items-center gap-1.5">
    <Link to="/pro/jobs/new">
      <Btn variant="indigo" size="sm" tabIndex={-1}>
        <Plus size={14} />
        <span className="hidden lg:inline">Log a job</span>
      </Btn>
    </Link>
    <ThemeToggle />
    {pro ? (
      <NotificationsBell proId={pro.id} align="right" />
    ) : (
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
    )}
    <AccountMenu pro={pro} onSignOut={signOut} />
  </div>
</header>
```

(Wrap the Link so the button is the interactive child, matching the sidebar CTA pattern. `tabIndex={-1}` on the Btn keeps a single tab stop, as the bottom-zone CTA does.)

- [ ] **Step 6: Mobile header gets the theme toggle**

In the mobile header icon row, add `<ThemeToggle />` before the bell.

- [ ] **Step 7: Lint + commit**

```bash
bun run lint
git add src/components/pro-shell.tsx
git commit -m "Add pro top bar with search, theme toggle, bell, account menu"
```

---

### Task 5: HomeShell theme wiring + toggle

**Files:**
- Modify: `src/components/home-shell.tsx`

- [ ] **Step 1: Wire the theme class**

Import `useTheme` and `ThemeToggle`. In `HomeShell`: `const [theme] = useTheme();` and root div:

```tsx
<div className={`font-app min-h-dvh bg-soft md:flex ${theme === "dark" ? "dark" : ""}`}>
```

- [ ] **Step 2: Add toggles**

Desktop: in the sidebar footer row, add `<ThemeToggle />` just before the sign-out button. Mobile: add `<ThemeToggle />` in the header icon row before the sign-out button.

- [ ] **Step 3: Lint + commit**

```bash
bun run lint
git add src/components/home-shell.tsx
git commit -m "Wire dark theme and toggle into homeowner shell"
```

---

### Task 6: End-to-end verification + dark AA sweep

**Files:**
- Possibly small fixes in any of the files above.

- [ ] **Step 1: Run the app**

`bun dev`, sign in as a pro (mock OTP), then check:

1. Top bar renders on every `/pro/*` screen; bell dropdown, account menu (Settings link, sign out), log-a-job shortcut work.
2. Search: known customer name, phone fragment, address fragment; keyboard-only flow (arrows, Enter, Escape); no-match state.
3. Toggle dark: dashboard, customers table, records, settings, notifications dropdown, account menu, toasts, skeletons all legible; theme survives reload; sidebar/topbar surfaces read as cards over the darker page.
4. Marketing pages, `/r/:id`, `/login` stay light with dark toggled on in the portal.
5. Homeowner side: toggle works in both headers, screens flip, preference shared with pro portal.
6. Mobile viewport (devtools): mobile header toggle, bottom CTA unaffected.

- [ ] **Step 2: Fix what the sweep finds** (contrast failures, missed hardcoded colors). Adjust `.dark` token values if any AA check fails; keep `--muted` a solid color.

- [ ] **Step 3: Final lint + commit fixes**

```bash
bun run lint
git add -A src/
git commit -m "Polish dark palette after portal sweep"
```

(Skip the commit if nothing changed.)
