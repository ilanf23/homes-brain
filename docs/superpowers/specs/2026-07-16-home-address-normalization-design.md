# Home address normalization: one physical house, one home record

Date: 2026-07-16. Approved by Ilan (silent linking confirmed).

## Problem

Homes are keyed by the exact address string. `upsert_home_by_address` matches `address = p_address`, so any variation in what the pro types ("72 Sunshine bass" vs "72 Sunshine Bass Court") creates a sibling home record and splits the house's history. The client-side `normalizeAddress` only fixes casing and punctuation and cannot catch missing words or misspellings. Live data already has one such sibling pair.

## Decision

Key homes by place, not by string. Google Places is already in the stack (autocomplete, details, forward and reverse geocoding via the `geo` edge function) and returns a canonical formatted address, coordinates, and a stable `place_id`. Make that the home's identity when available; fall back to the normalized string when it is not. When a typed address resolves to an existing home, link silently (same behavior as the customer silent dedupe); a wrong link is rare and repairable, and the 30-second log-a-job promise wins.

## Changes

### 1. Schema and RPC, `supabase/migrations/20260716210000_home_place_identity.sql`

- `homes.place_id text` with a partial unique index (`WHERE place_id IS NOT NULL`).
- `public.hb_normalize_address(text)` immutable SQL function: lowercase, strip punctuation, collapse whitespace (mirrors the client `normalizeAddress`), plus an expression index on `hb_normalize_address(address)`.
- Drop and recreate `upsert_home_by_address(p_address text, p_place_id text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)`. Match order: `place_id`, then exact address, then normalized address. On match, backfill missing `place_id`, coordinates, and upgrade the stored address to the canonical form when that does not collide with another row. On miss, insert with the canonical values. Same `SECURITY DEFINER` + `my_pro_id()` guard as today. Old one-argument callers keep working through the defaults.

Additive DDL: applied live through the Lovable MCP `query_database` tool (migrations do not run on git sync), with the file kept in the repo as the record.

### 2. Geo edge function, `supabase/functions/geo/index.ts`

- `details` response gains `placeId` (already available server-side, currently dropped).
- `forward` response gains `address` (Google's `formatted_address`) and `placeId` (`place_id`), so a freehand-typed address can be canonicalized in one call.
- Deploys do not happen on git sync: after pushing, ask the Lovable agent to redeploy `geo` with no code changes.

### 3. Log-a-job, `src/routes/pro.jobs.new.tsx` + `src/lib/geo.ts`

- `ResolvedAddress` carries `placeId`; autocomplete picks flow it into the `resolved` state.
- At submit, both home-upsert call sites (new customer, known customer at a different address) pass the best identity we have: the resolved pick's canonical address, placeId, and coords when it matches the final address; otherwise one blocking forward-geocode (short timeout, roughly 2.5s). If Google resolves it, use the canonical form; if not, save the typed string as its own home. Never block the save on geocoding failure.
- Linking to an existing home is silent. "Matched wrong house" repair stays a manual edit, out of scope for v0.

### 4. One-time sibling merge (cleanup)

Detect candidate pairs: same `hb_normalize_address(address)`, or coordinates within 30 meters with the same leading street number. Merge policy:

- Never auto-merge two homes claimed by different homeowners; leave those alone (surface manually if they ever appear).
- Survivor: the claimed home, else the geocoded one, else the oldest. Loser's claim (if any and survivor unclaimed) moves to the survivor.
- Repoint every table with a home FK: `jobs`, `equipment`, `customers`, `invoices`, `invites`, `payments`, `claim_tokens`; backfill survivor claim, `place_id`, and coords from the loser when missing; delete the loser.

Run as verified DML via `query_database` (candidate list reviewed first; today it is one pair), SQL kept in `supabase/migrations/` for the record.

## Out of scope

USPS/abbreviation string normalization tables, a pro-facing home-merge UI, unit/apartment splitting, and re-keying homes that never geocode (they stay string-keyed and functional).
