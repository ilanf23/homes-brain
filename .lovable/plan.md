# Fix inaccurate geolocation on "Who is this for?"

## Problem

Two things stack up to make the detected address wrong:

1. `navigator.geolocation.getCurrentPosition()` runs with default options, so the browser can return a cached, low-accuracy fix (Wi-Fi/IP based, often hundreds of meters off — kilometers on desktop).
2. Nominatim reverse geocode then snaps that coarse point to the nearest OSM-known address, which in residential areas can be a neighbor or just the street.

The pro then sees one confidently-wrong address and no way to pick the right house.

## Fix (frontend only, no schema changes)

### 1. Request a real GPS fix

In the geolocation call inside `src/routes/pro.jobs.new.tsx`:

- Pass `{ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }` to force a fresh, GPS-preferred fix on mobile.
- Keep the existing `denied` / `unavailable` fallbacks.

### 2. Show accuracy and let the pro confirm, don't auto-decide

- Read `position.coords.accuracy` (meters) and display it under the detected address, e.g. "within ~15 m" (green under 25 m, amber 25–100 m, red over 100 m).
- Add a "Not this house?" button on the location card that expands to show the **3 nearest existing customers** (computed by haversine distance from `homes.lat/lng` we already store), each as a big tap card with distance ("28 m away"). One tap selects that customer.
- Also expose a "None of these — enter address" action that opens the manual form pre-filled with the reverse-geocoded street.

### 3. Loosen the auto-match

Today we auto-select a customer when the reverse-geocoded string equals an existing address via `normalizeAddress`. Change to:

- Auto-select **only** when there is exactly one existing home within 30 m of the GPS point (distance beats string match — Nominatim's string is unreliable).
- Otherwise show the nearest-customers list described above; never silently pick the wrong one.

### 4. Small UX polish

- While locating, show "Getting a precise location… this takes a few seconds on first use" instead of a bare spinner.
- Add a "Try again" link if accuracy comes back worse than 100 m, which re-invokes `getCurrentPosition` (a second call often gets a much better fix once GPS warms up).

## Out of scope (call out, don't build)

- Swapping Nominatim for Google/Mapbox reverse geocoding — bigger change, needs an API key and billing decision. Happy to plan separately if the above isn't enough.
- Google Places autocomplete on the manual address field — same reason.

## Files touched

- `src/routes/pro.jobs.new.tsx` — geolocation options, accuracy display, nearest-customers picker, auto-match rule.
- `src/lib/hb.ts` — add a small `haversineMeters(a, b)` helper (pure function, no deps).

No backend, migration, or edge function changes. `homes.lat/lng` already exist and are backfilled by `backfillHomeGeocodes`.
