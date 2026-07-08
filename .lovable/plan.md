## Goal

On the Customer step of `/pro/jobs/new`, when the pro's current GPS location matches an existing customer's home, highlight that customer in the list with a purple treatment and a "Matches your address" label, instead of pinning a separate card at the top and hiding the row from the list.

Also make sure the match actually fires: today it relies on `homes.lat/lng`, and most existing homes have never been geocoded, so the recommendation silently never appears.

## Changes (all in `src/routes/pro.jobs.new.tsx`)

1. **Backfill geocodes on page load.** After loading `existing` customers, call `backfillHomeGeocodes` (already in `src/lib/hb.ts`) for any linked homes that have `geocoded_at == null`. Update local state as each home resolves so `locationMatch` can start matching without a reload.

2. **Keep the matched customer inside the main list, lit purple.**
   - Remove the pinned "This matches your address" card above the search input.
   - Remove the `.filter((c) => !(locationMatch && ... ))` that hides the matched row from the list.
   - In the customer row render, when `c.id === locationMatch?.id`, swap the neutral card styles for the indigo treatment: `border-indigo/40 bg-indigobg`, indigo name text, and a small "Matches your address" caption (indigo, uppercase, tracking-wider) under the address.
   - Sort the matched customer to the top of `filteredCustomers` so it's the first thing the pro sees.

3. **Match logic stays as-is** (GPS haversine < 60m, address-normalize fallback). No changes to how `locationMatch` is computed.

## Out of scope

- No changes to the address step, the DB schema, or any other route.
- No new match heuristics (still 60m radius + normalized-address fallback).

## Technical notes

- `backfillHomeGeocodes` already paces requests ~1s apart and stamps `geocoded_at` even on failure, so it won't hammer the geocode function or retry bad addresses.
- The matched-row purple style reuses the existing `border-indigo/40 bg-indigobg` tokens already used by the pinned card, so no new design tokens.
