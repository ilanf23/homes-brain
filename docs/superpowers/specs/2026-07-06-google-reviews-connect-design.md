# Google reviews connection (paste-link flow)

Date: 2026-07-06
Status: approved

## Goal

Let a pro connect their Google reviews presence from the pro Reviews page by pasting their Google Maps/business link and (optionally) entering their current star rating. Replace the fake "Connect Google" toggle with this flow everywhere it appears.

## Decisions made

- Paste-a-link flow, no Google API, no OAuth (real Places/Business integration comes later).
- Rating is entered manually by the pro, optional, 0 to 5 with one decimal.
- Reuse the existing `pros.google_place_id` column to store the normalized URL. No migration, no `types.ts` change. Nothing in the codebase parses that column as a place ID today; it is only checked for truthiness and displayed nowhere. Rename can ship with the real integration.
- "Connected" everywhere stays `!!pro.google_place_id`.

## Components

1. `normalizeGoogleUrl(input)` in `src/lib/hb.ts`: validates and normalizes a pasted link. Accepts `maps.app.goo.gl`, `goo.gl/maps`, `g.page`, `search.google.com/local/writereview`, and `google.<tld>/maps` hosts; prepends `https://` when missing; returns `null` for anything else.
2. `GoogleConnect` component in `src/components/google-connect.tsx`: owns both states.
   - Not connected: paste-link field, optional rating field, Connect button, help text on where to find the link (Google Maps, your business, Share button).
   - Connected: connected panel with rating, "View your Google page" link (only when the stored value is a URL, so old `demo_place_id` rows do not render a broken link), Edit (reopens the form prefilled) and Disconnect actions.
   - Writes `google_place_id` and `google_rating` on `pros`, calls `onUpdated(patch)` so callers refresh local state, logs `google_connected` / `google_disconnected` events.
3. `pro.reviews.tsx`: right column gets the GoogleConnect card above "The rule we follow". The rating stat card drops its link to settings (the connect card is on the page now). Toast on success.
4. `pro.settings.tsx`: the Google Business card renders GoogleConnect instead of the stub toggle; the `toggleGoogle` stub is removed.
5. `r.$recordId.tsx`: "Leave a review" button becomes a real link to the stored URL when the value is a URL; otherwise unchanged.

## Error handling

- Updates use `.update(...).select("id")` and treat 0 returned rows as failure, since RLS-filtered updates return success with no error (same guard as the settings page saves). Persistence depends on migration `20260706120000_v0_public_settings_updates.sql` being applied.
- Invalid link: inline red error under the field, nothing saved.
- Rating outside 0 to 5 or not a number: inline error.
- Supabase errors surface in the existing inline error styles.

## Out of scope

- Signup's Google step (still the old stub; pros can connect properly from Reviews or Settings).
- Fetching rating or reviews from Google.
- Column rename or migration.

## Verification

No test suite. Verify by running `bun dev`: connect with a real Maps link on /pro/reviews, check rating card, check settings shows the same connection, disconnect, reconnect, and confirm the record page review button links out.
