# Google Business Auto-Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a pro connects Google, auto-find their Google Business listing from the business name + service area they already entered, show "Is this your business?" cards with the live rating, and let them confirm with one tap. This replaces the manual "paste a link + type your rating" flow (paste-a-link stays as a fallback, with no rating).

**Architecture:** Three layers, all following patterns that already exist in this repo. (1) A new `findBusiness` op in the existing `geo` Supabase edge function proxies Google Places Text Search so the API key stays server-side. (2) A new `findBusiness()` helper in `src/lib/geo.ts` calls it and never throws. (3) The shared `GoogleConnect` component (`src/components/google-connect.tsx`) is reworked to be search-first. Because `GoogleConnect` is shared by `/pro/setup`, `/pro/reviews`, and `/pro/settings`, and its props do not change, no route files need edits.

**Tech Stack:** TanStack Start + React 19 + TypeScript, Tailwind v4, Supabase edge functions (Deno), Google Places API (New). Bun is the package manager.

## Global Constraints

- **Never use em dashes (U+2014) anywhere**: not in code, comments, copy, commit messages, or this plan's outputs. Use a period, comma, colon, parentheses, or plain hyphen.
- **No schema changes.** `pros.google_place_id` keeps storing the Google Maps URL (not a raw place ID); `pros.google_rating` stores the rating. Every existing consumer (`isGoogleUrl`, pro profile page, records) keeps working untouched.
- **Do not change the `GoogleConnect` props interface** (`proId`, `pro`, `onUpdated`, `onToast`). Three routes render it; none of them may need edits.
- **Never edit `src/routeTree.gen.ts`** (auto-generated).
- **Brand rules:** indigo is the only brand accent on this surface. Secondary text stays exactly `text-muted`. Build from `src/lib/ui.tsx` primitives (`Btn`, `Field`, `Input`, `Pill`), not shadcn.
- **No test suite exists in this repo.** Each task's verification is `bun run lint`, `bun run build`, and a manual dev-server walkthrough. Do not add a test framework.
- **Edge functions deploy via git push** (Lovable syncs from GitHub and deploys `supabase/functions/`). Do NOT deploy through the Supabase MCP. The local dev server calls the already-deployed function, so the new op only responds end-to-end after the edge function commit is pushed to `main`.
- **Never rewrite published git history.** Plain commits on `main`, pull before push (Lovable also pushes to `main`; run `git pull --rebase=false` before pushing).
- Commands: `bun install`, `bun dev`, `bun run build`, `bun run lint`.

## Existing code you will touch (read these first)

| File | What it is |
|---|---|
| `supabase/functions/geo/index.ts` | Edge function proxying Google Places/Geocoding. Has ops `autocomplete`, `details`, `reverse`, `forward`. You add `findBusiness`. |
| `src/lib/geo.ts` | Client helpers for that function. All resolve to fallbacks on failure, never throw. You add `findBusiness()` + `BusinessCandidate`. |
| `src/components/google-connect.tsx` | The component you rewrite. Currently paste-a-link + manual rating. |
| `src/lib/hb.ts` | `normalizeGoogleUrl()` (line ~239), `isGoogleUrl()` (line ~264), `logEvent()` (line ~47). Use as-is, do not modify. |
| `src/components/pro-shell.tsx` | `ProRow` type (line 29): `{ id, business, owner_first_name, trade, service_area, logo, google_place_id, google_rating, plan }`. |

Key behavior of the current component to preserve: the connected-state card, the disconnect action, the RLS guard pattern on updates (`.select("id")` so a 0-row update fails loudly), and the `hint` copy telling pros how to find their Google link.

---

### Task 1: `findBusiness` op in the geo edge function

**Files:**
- Modify: `supabase/functions/geo/index.ts`

**Interfaces:**
- Consumes: `GOOGLE_MAPS_API_KEY` env secret (already set in Supabase; Places API (New) already enabled for the existing ops).
- Produces: op `findBusiness` accepting JSON body `{ op: "findBusiness", query: string, area?: string }`, returning `{ candidates: Candidate[] }` where `Candidate = { placeId: string, name: string, address: string | null, rating: number | null, ratingCount: number | null, mapsUrl: string }`. On upstream failure returns `{ candidates: [], error: "find_business_failed" }` with HTTP 200 (soft-fail, same as `autocomplete`).

- [ ] **Step 1: Extend the `Body` type**

In `supabase/functions/geo/index.ts`, update the `Body` type (currently lines 33-41) to:

```ts
type Body = {
  op?: "autocomplete" | "details" | "reverse" | "forward" | "findBusiness";
  input?: string;
  placeId?: string;
  sessionToken?: string;
  address?: string;
  lat?: number;
  lng?: number;
  query?: string;
  area?: string;
};
```

- [ ] **Step 2: Add the `findBusiness` case**

Inside the `switch (body.op)` block, directly after the closing brace of `case "forward": { ... }` and before `default:`, add:

```ts
      case "findBusiness": {
        const query = (body.query ?? "").trim();
        if (query.length < 2) return json({ candidates: [] });
        const area = (body.area ?? "").trim();
        /* Places Text Search (New). No session tokens here: text search is
           billed per request, not per session like autocomplete. */
        const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
          },
          body: JSON.stringify({
            textQuery: area ? `${query} ${area}` : query,
            regionCode: "US",
            maxResultCount: 5,
          }),
        });
        if (!resp.ok) {
          console.error("findBusiness error", resp.status, await resp.text());
          return json({ candidates: [], error: "find_business_failed" }, 200);
        }
        const data = await resp.json();
        type Place = {
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          rating?: number;
          userRatingCount?: number;
          googleMapsUri?: string;
        };
        const candidates = ((data.places ?? []) as Place[])
          .map((p) => {
            if (!p.id || !p.displayName?.text || !p.googleMapsUri) return null;
            return {
              placeId: p.id,
              name: p.displayName.text,
              address: p.formattedAddress ?? null,
              rating: typeof p.rating === "number" ? p.rating : null,
              ratingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
              mapsUrl: p.googleMapsUri,
            };
          })
          .filter(Boolean);
        return json({ candidates });
      }
```

Also update the doc comment at the top of the file (the "Ops (JSON body { op, ... })" list) to add this line after the `forward` line:

```
     findBusiness { query, area? }                       -> { candidates: [{ placeId, name, address, rating, ratingCount, mapsUrl }] }
```

- [ ] **Step 3: Verify it compiles as valid TypeScript**

The edge function is Deno code and is not covered by `bun run lint` or the Vite build. Verify syntax with:

Run: `bunx tsc --noEmit --target es2022 --lib es2022,dom supabase/functions/geo/index.ts`
Expected: exits 0 with no output (pre-existing `Deno` declaration in the file satisfies the type checker).

If `bunx tsc` is unavailable, fall back to a syntax-only check: `node --input-type=module -e "await import('node:fs').then(fs => fs.promises.readFile('supabase/functions/geo/index.ts','utf8'))" && echo read-ok` and rely on careful review; but tsc should work.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/geo/index.ts
git commit -m "feat(geo): add findBusiness op for Google Business listing search"
```

- [ ] **Step 5: Push so Lovable deploys the function (required for later end-to-end verification)**

```bash
git pull --rebase=false && git push origin main
```

Expected: push succeeds. Lovable redeploys the `geo` function on sync (usually within a couple of minutes).

- [ ] **Step 6: Smoke-test the deployed op**

Get the project URL and anon key from `src/integrations/supabase/client.ts` (they are hardcoded there as `SUPABASE_URL` and the publishable key). Then:

```bash
curl -s -X POST "<SUPABASE_URL>/functions/v1/geo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -d '{"op":"findBusiness","query":"Culligan Water","area":"Austin, TX"}'
```

Expected: `{"candidates":[{"placeId":"...","name":"Culligan ...","address":"...","rating":4.x,"ratingCount":NNN,"mapsUrl":"https://maps.google.com/..."}]}` with 1-5 candidates. If the deploy has not landed yet, an unknown-op response `{"error":"unknown op"}` means wait and retry; do not proceed to Task 3 verification until this returns candidates.

---

### Task 2: `findBusiness()` client helper

**Files:**
- Modify: `src/lib/geo.ts`

**Interfaces:**
- Consumes: the `call<T>()` private helper already in `src/lib/geo.ts` (invokes the `geo` edge function, resolves to a fallback on any failure).
- Produces: `export type BusinessCandidate = { placeId: string; name: string; address: string | null; rating: number | null; ratingCount: number | null; mapsUrl: string }` and `export async function findBusiness(query: string, area: string | null): Promise<BusinessCandidate[]>`. Task 3 imports both from `@/lib/geo`. Never throws; resolves to `[]` on any failure (including an old deployed function that does not know the op yet).

- [ ] **Step 1: Add the type and helper**

Append to the end of `src/lib/geo.ts`:

```ts
export type BusinessCandidate = {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string;
};

/* Google Business listing search for the GoogleConnect flow. Soft-fails to []
   so the UI degrades to the paste-a-link fallback. */
export async function findBusiness(
  query: string,
  area: string | null,
): Promise<BusinessCandidate[]> {
  if (query.trim().length < 2) return [];
  const data = await call<{ candidates?: BusinessCandidate[] }>(
    { op: "findBusiness", query: query.trim(), area: area?.trim() || undefined },
    {},
  );
  return data.candidates ?? [];
}
```

- [ ] **Step 2: Verify lint and build pass**

Run: `bun run lint && bun run build`
Expected: both exit 0 (an unused-export warning will not appear; the linter does not flag unused exports here).

- [ ] **Step 3: Commit**

```bash
git add src/lib/geo.ts
git commit -m "feat(geo): client helper for Google Business search"
```

---

### Task 3: Search-first `GoogleConnect` component

**Files:**
- Modify: `src/components/google-connect.tsx` (full rewrite of the component body; props interface unchanged)

**Interfaces:**
- Consumes: `findBusiness`, `BusinessCandidate` from `@/lib/geo` (Task 2); `isGoogleUrl`, `logEvent`, `normalizeGoogleUrl` from `@/lib/hb`; `Btn`, `Field`, `Input`, `Pill` from `@/lib/ui`; `ShieldCheck` from `@/components/svg`; `ProRow` from `@/components/pro-shell`; `supabase` client.
- Produces: the same component signature as today: `GoogleConnect({ proId, pro, onUpdated, onToast })`. Callers in `src/routes/pro.setup.tsx:462`, `src/routes/pro.reviews.tsx:118`, `src/routes/pro.settings.tsx:319` must keep working with zero edits.

Behavior spec:
1. When not connected (or when editing), auto-search once on open using `pro.business` + `pro.service_area`, showing a loading state, then up to 5 candidate cards (name, address, "4.9 ★ (127 reviews)" or "No rating yet", and a "This is me" button).
2. Confirming a candidate saves `google_place_id = candidate.mapsUrl` and `google_rating = candidate.rating` (rounded to 1 decimal), fires `google_connected` with `method: "matched"`, and shows the connected card. The confirmed listing's name + address are shown session-only (there is no DB column for them; this is intentional, no migration).
3. A search box (pre-filled with the business name) lets them retry with a different spelling. Enter key or Search button triggers it.
4. "Can't find it? Paste your Google link" reveals the old paste field. Pasting saves the normalized URL with `google_rating: null` and `method: "pasted"`. The manual rating input is deleted entirely.
5. Zero results or a failed search shows guidance plus the fallback, never a dead end.
6. Connected card, Edit, and Disconnect keep working as before (Disconnect clears both columns and re-opens a fresh search).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/google-connect.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Btn, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleUrl, logEvent, normalizeGoogleUrl } from "@/lib/hb";
import { findBusiness, type BusinessCandidate } from "@/lib/geo";
import { ShieldCheck } from "@/components/svg";
import type { ProRow } from "@/components/pro-shell";

/* Search-first Google connect flow, shared by /pro/setup, /pro/reviews and
   /pro/settings. Auto-matches the pro's Google Business listing from their
   business name + service area (geo edge fn `findBusiness` op). Confirming a
   match stores the listing's Google Maps URL in pros.google_place_id and the
   live Google rating in pros.google_rating. Paste-a-link remains as the
   fallback and stores no rating (we only show ratings that came from Google). */
export function GoogleConnect({
  proId,
  pro,
  onUpdated,
  onToast,
}: {
  proId: string;
  pro: ProRow;
  onUpdated: (patch: Partial<ProRow>) => void;
  onToast?: (msg: string) => void;
}) {
  const connected = !!pro.google_place_id;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<BusinessCandidate[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showPaste, setShowPaste] = useState(false);
  const [link, setLink] = useState("");

  /* Which listing was confirmed, session-only: there is no DB column for the
     listing name/address, so this only shows right after confirming. */
  const [confirmedListing, setConfirmedListing] = useState<{
    name: string;
    address: string | null;
  } | null>(null);

  const showSearch = !connected || editing;

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setSearching(true);
    setErr(null);
    const results = await findBusiness(trimmed, pro.service_area);
    setCandidates(results);
    setSearched(true);
    setSearching(false);
  }

  /* Auto-search once per open of the search UI, seeded from the business name
     the pro already entered. */
  const autoRan = useRef(false);
  useEffect(() => {
    if (!showSearch || autoRan.current) return;
    autoRan.current = true;
    const initial = (pro.business ?? "").trim();
    setQuery(initial);
    if (initial.length >= 2) {
      void runSearch(initial);
    } else {
      setSearched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch]);

  async function saveConnection(args: {
    url: string;
    rating: number | null;
    method: "matched" | "pasted";
    placeId?: string;
  }): Promise<boolean> {
    setBusy(true);
    setErr(null);
    const patch = { google_place_id: args.url, google_rating: args.rating };
    /* .select("id") so an RLS-filtered update (0 rows) fails loudly instead of
       reporting success - same guard as the settings page saves. */
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    setBusy(false);
    setSavingId(null);
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
      return false;
    }
    onUpdated(patch);
    setEditing(false);
    setShowPaste(false);
    onToast?.(connected ? "Google connection updated" : "Google connected");
    logEvent(`pro:${proId}`, "google_connected", {
      url: args.url,
      rating: args.rating,
      method: args.method,
      place_id: args.placeId ?? null,
    });
    return true;
  }

  async function confirmCandidate(c: BusinessCandidate) {
    setSavingId(c.placeId);
    const rating = c.rating != null ? Math.round(c.rating * 10) / 10 : null;
    const ok = await saveConnection({
      url: c.mapsUrl,
      rating,
      method: "matched",
      placeId: c.placeId,
    });
    if (ok) setConfirmedListing({ name: c.name, address: c.address });
  }

  async function savePasted() {
    const url = normalizeGoogleUrl(link);
    if (!url) {
      setErr(
        "That doesn't look like a Google link. Paste your business's link from Google Maps (open your listing, tap Share, copy the link).",
      );
      return;
    }
    const ok = await saveConnection({ url, rating: null, method: "pasted" });
    if (ok) setConfirmedListing(null);
  }

  async function disconnect() {
    setBusy(true);
    setErr(null);
    const patch = { google_place_id: null, google_rating: null };
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    setBusy(false);
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
      return;
    }
    onUpdated(patch);
    setEditing(false);
    setConfirmedListing(null);
    setShowPaste(false);
    setLink("");
    setCandidates([]);
    setSearched(false);
    autoRan.current = false;
    onToast?.("Google disconnected");
    logEvent(`pro:${proId}`, "google_disconnected");
  }

  if (connected && !editing) {
    return (
      <div className="mt-3">
        <div className="rounded-xl border border-indigo/30 bg-indigobg/50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck size={22} className="text-indigo shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-ink truncate">
                {confirmedListing ? confirmedListing.name : "Connected"}
              </div>
              {confirmedListing?.address && (
                <div className="text-xs text-muted truncate">{confirmedListing.address}</div>
              )}
              <div className="text-xs text-muted tnum">
                {pro.google_rating != null
                  ? `Rating ${pro.google_rating} ★ from Google`
                  : "No rating on file"}
              </div>
            </div>
          </div>
          <Pill accent="indigo">Live</Pill>
        </div>
        {isGoogleUrl(pro.google_place_id) && (
          <a
            href={pro.google_place_id}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:underline"
          >
            View your Google page <ExternalLink size={12} />
          </a>
        )}
        {err && (
          <div
            role="alert"
            className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2"
          >
            {err}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => {
              setErr(null);
              setEditing(true);
            }}
            disabled={busy}
            className="text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            Edit
          </button>
          <button
            onClick={disconnect}
            disabled={busy}
            className="text-xs font-semibold text-muted hover:text-red transition-colors"
          >
            {busy ? "Working…" : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {!connected && (
        <p className="text-sm text-muted">
          Route review asks to your Google profile and show your rating on every record.
        </p>
      )}

      <Field
        label="Find your business on Google"
        hint="We search Google with your business name and service area."
      >
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aqua Works"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !searching) void runSearch(query);
            }}
          />
          <Btn
            variant="indigo"
            loading={searching}
            disabled={query.trim().length < 2 || busy}
            onClick={() => void runSearch(query)}
          >
            Search
          </Btn>
        </div>
      </Field>

      {searching && <div className="text-sm text-muted">Searching Google…</div>}

      {!searching && candidates.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Is this your business?
          </div>
          {candidates.map((c) => (
            <div
              key={c.placeId}
              className="rounded-xl border border-line bg-white p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{c.name}</div>
                {c.address && <div className="text-xs text-muted truncate">{c.address}</div>}
                <div className="mt-1 text-xs text-muted tnum">
                  {c.rating != null
                    ? `${c.rating.toFixed(1)} ★${
                        c.ratingCount != null
                          ? ` (${c.ratingCount} review${c.ratingCount === 1 ? "" : "s"})`
                          : ""
                      }`
                    : "No rating yet"}
                </div>
              </div>
              <Btn
                variant="indigo"
                loading={savingId === c.placeId}
                disabled={busy}
                onClick={() => void confirmCandidate(c)}
              >
                This is me
              </Btn>
            </div>
          ))}
        </div>
      )}

      {!searching && searched && candidates.length === 0 && (
        <div className="text-sm text-muted">
          No matches found. Try a different spelling, or paste your Google link below.
        </div>
      )}

      {!showPaste ? (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setShowPaste(true);
          }}
          className="text-xs font-semibold text-indigo hover:underline"
        >
          Can&apos;t find it? Paste your Google link
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-soft p-4">
          <Field
            label="Your Google link"
            hint="In Google Maps, open your business, tap Share, and copy the link. Your rating won't show until the listing is matched on Google."
          >
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
              inputMode="url"
              autoComplete="off"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Btn variant="indigo" className="flex-1" loading={busy && savingId === null} onClick={savePasted}>
              Connect with this link
            </Btn>
            <Btn variant="ghost" onClick={() => setShowPaste(false)} disabled={busy}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {err && (
        <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
          {err}
        </div>
      )}

      {editing && (
        <Btn variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Btn>
      )}
    </div>
  );
}
```

Notes for the implementer:
- The `Btn` component in `src/lib/ui.tsx` supports `variant`, `size`, `className`, `loading`, `disabled`, `onClick`. Confirm `variant="ghost"` exists before using it (the old component used it, so it does).
- `void runSearch(query)` and `void confirmCandidate(c)` satisfy the no-floating-promises style used elsewhere in the repo.
- Keep the `…` ellipsis character in "Searching Google…" and the placeholder; it is already used in this codebase. Do not substitute an em dash anywhere.

- [ ] **Step 2: Verify lint and build pass**

Run: `bun run lint && bun run build`
Expected: both exit 0. If lint flags `react-hooks/exhaustive-deps` despite the inline disable comment, keep the comment placement exactly as shown (on the line directly above the dependency array's closing `}, [showSearch]);`).

- [ ] **Step 3: Manual walkthrough (requires Task 1 Step 6 to have passed)**

Run: `bun dev`

Then in a browser, logged in as a pro (any existing dev account):

1. `/pro/settings`: if Google is connected, click Disconnect. The search UI should appear and auto-search with the pro's business name. Confirm candidates render with name, address, and rating.
2. Click "This is me" on a candidate. Expected: toast "Google connected", connected card shows the listing name, address, and "Rating X ★ from Google", and "View your Google page" opens the right listing.
3. Reload the page. Expected: connected card shows "Connected" + rating (listing name/address are session-only, this is by design).
4. Disconnect, type a nonsense query like "zzzzqqqq plumbing", press Enter. Expected: "No matches found" plus the paste fallback link, no dead end.
5. Click "Can't find it? Paste your Google link", paste `https://maps.app.goo.gl/abc123`, click "Connect with this link". Expected: connects with no rating shown ("No rating on file").
6. Paste garbage like `notalink`, expected inline red error about it not looking like a Google link.
7. `/pro/reviews` and `/pro/setup?step=google`: confirm the same search-first UI renders in both places.
8. In the Supabase `events` table (or console logs), confirm `google_connected` events carry `method: "matched"` or `method: "pasted"` and the rating.

- [ ] **Step 4: Commit and push**

```bash
git add src/components/google-connect.tsx
git commit -m "feat: search-first Google Business connect with auto-matched rating"
git pull --rebase=false && git push origin main
```

---

### Task 4: Final verification sweep

**Files:** none created or modified (fix-forward if anything fails).

- [ ] **Step 1: Full build and lint from clean state**

Run: `bun install && bun run lint && bun run build`
Expected: all exit 0.

- [ ] **Step 2: Regression check on consumers of the two columns**

The columns' semantics are unchanged (URL + numeric rating), but eyeball these render paths in the running dev app:

1. `/pro/:city/:trade/:business` (public pro profile): rating still renders for a matched pro.
2. `/pro` dashboard and `/pro/reviews`: Google rating display unchanged.
3. Setup wizard `/pro/setup`: the google step still counts as done when connected (it checks `isGoogleUrl(google_place_id)`, and both matched and pasted paths store an https URL, so this holds).

- [ ] **Step 3: Update Notion screen inventory**

Per the working agreement, update the Status/notes for the Google connect surface in the Notion "Screen inventory & app spec" page: connect flow is now search-first with auto-pulled rating; manual rating entry removed. If Notion access is unavailable in your environment, report this step back to the user as pending instead of silently skipping it.

---

## Out of scope (do not build)

- Periodic rating re-sync (rating refreshes only when the pro reconnects).
- Storing the raw Google place ID, listing name/address, or review count in the DB (no migrations in this feature).
- Google Business Profile OAuth.
- Any change to the business-name step of the setup wizard.
