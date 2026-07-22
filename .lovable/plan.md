
## Current state (verified)

The record email is already 90% aligned with the requested design. `supabase/functions/invite-claim/index.ts` renders the notification via `renderEmailShell` and today produces: indigo house-mark header + business + "VIA HOMESBRAIN" eyebrow, H1 "Your home remembers today's service.", intro naming pro + equipment + address, italic "A note from [Pro]" panel (with coral dot accent), Service / Equipment / Next service rows, indigo pill CTA "See what [Business] saved", "One tap opens the record…" fine print, localized subject "[Business] saved today's service record for your home", compliance footer with unsubscribe. All four locales (en/es/ru/uk) are wired.

So this is a **visual polish + hierarchy tightening pass**, not a from-scratch rebuild.

## Gaps between current output and the brief

1. **Typography**: shell/body use `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. Brief asks for Plus Jakarta Sans as the visual system. Email clients cannot load web fonts reliably (Gmail strips `@font-face`, Outlook ignores it). Approach: add Plus Jakarta Sans as the first family in the stack so Apple Mail / iOS / macOS users who have it installed see it, and fall back to the current system stack everywhere else. No `<link>` or `@font-face` (would hurt deliverability and be silently dropped).
2. **Sender identity "[Business] via HomesBrain"**: the shell header already shows this, but the actual RFC `From:` name is set outside this file (in the send call). Need to confirm the From line reads "[Business] via HomesBrain" and, if not, adjust the `from` string passed to the mail transport. Will verify in the send call site inside `invite-claim/index.ts` (lines 468–689 not yet read).
3. **Card chrome**: current card is `border-radius:20px` with a 2px solid indigo border. Brief says "rounded 20–22px cards" and "soft rare shadows" — the 2px indigo outline reads as heavier than the fintech-calm aesthetic. Soften to a 1px `#e7e5de` line plus the existing subtle shadow, keeping indigo as ink/CTA only. Bump radius to 22px for parity with in-app cards.
4. **Intro sentence**: currently one long line. Split so the equipment/service phrase reads more scannably and the address stays emphasized. Keep the same localized template — only change formatting (line-height, small margin), not the string.
5. **Note panel**: today the eyebrow uses indigo with a coral bullet. Brief wants coral as a *restrained* homeowner accent. Keep the coral dot; keep the eyebrow indigo. No change needed beyond confirming the dot survives Outlook (it's a `&bull;` inside a table cell — safe).
6. **Details rows**: `renderDetails` uses a `#f7f6f1` panel with rounded 14px. Bump to 16–18px radius and use `#f2f0ea` warm canvas inside the white card for the tonal contrast the brief describes. Tighten label color to `#73706a` (already correct) and value to `#16160f` (already correct).
7. **CTA**: already indigo `#473fb0`, pill 999px, white text. Increase vertical padding slightly (16px 34px) so it reads as the single hero action. No color change.
8. **Reassurance line**: already present as `renderFinePrint(copy.oneTap)`. Keep.
9. **Compliance footer**: already correct (reason, unsubscribe, contact, postal). Do not touch.

## Files to change

- `supabase/functions/_shared/email-shell.ts`
  - Prepend `"Plus Jakarta Sans"` to every font stack in the file.
  - Change card border from `2px solid #473fb0` to `1px solid #e7e5de`; bump `border-radius` 20→22.
  - Bump CTA padding from `14px 32px` to `16px 34px`.
  - Bump `renderDetails` panel radius 14→18 and background `#f7f6f1`→`#f2f0ea` with border `#e7e5de`.
- `supabase/functions/invite-claim/index.ts`
  - Confirm/adjust the `from` header (lines 468–689) to "[Business] via HomesBrain <sender@…>".
  - Bump `renderNotePanel` radius 16→18, background `#f7f6f1`→`#f2f0ea`, border to `#e7e5de`, and add Plus Jakarta to its inline font stacks.
  - No copy changes; all four locales stay as-is.

## Missing data fields

- **Pro first name**: not stored. Brief allows "[Pro or business]"; current code uses `business` everywhere, which is correct and consistent.
- **Business logo**: fetched but intentionally not rendered in header (design uses the indigo house mark). No change.
- **Address, equipment, next_service_date, what_done**: all already available in the query.

No new DB fields or migrations required.

## Email-client compatibility risks

- **Plus Jakarta Sans not installed on recipient device** → silent fallback to `-apple-system`/Segoe UI/Arial. Acceptable and expected.
- **Outlook (Windows, MSO)**: rounded corners on the card and CTA render as square. Already true today; no regression. Colors and layout stay correct because everything is table-based + inline CSS.
- **Gmail app on Android**: strips `class` attributes but keeps inline styles. `notranslate` class on brand still works because Gmail also honors `translate="no"`.
- **Dark-mode inversion (Apple Mail, Outlook.com)**: warm cream `#f2f0ea` may be inverted. Not fixing in this pass (out of scope, and today's email has the same behavior).
- **Web-font `@font-face`**: not being added — avoids the Gmail-strips-styles risk and keeps the message body under Gmail's 102KB clipping threshold.

## Locale, security, deliverability, compliance

- All four `EMAIL_COPY` entries stay byte-identical; no string touched.
- `renderEmailShell` continues to escape via `esc` + `protectBrand`; no new user-controlled HTML paths introduced.
- `unsubUrl`, `listUnsubscribeHeaders`, `isEmailOptedOut`, daily-limit, token minting, and CAN-SPAM footer are untouched.
- SPF/DKIM/DMARC unaffected — only inline HTML/CSS changes.
- Plain-text mirror unchanged.

## Implementation plan (build-mode steps)

1. Read lines 468–689 of `invite-claim/index.ts` to confirm the `from` header format; adjust only if it isn't already "[Business] via HomesBrain".
2. Edit `_shared/email-shell.ts`:
   - Extract font stack into a single constant `FONT_STACK = "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"` and reference it in every inline `font-family`.
   - Card: `border:1px solid #e7e5de; border-radius:22px;`.
   - CTA: `padding:16px 34px;`.
   - `renderDetails` panel: `background:#f2f0ea; border:1px solid #e7e5de; border-radius:18px;`.
3. Edit `invite-claim/index.ts` `renderNotePanel` only: same font-stack constant (local copy), `background:#f2f0ea; border-radius:18px; border:1px solid #e7e5de;` on the outer table; keep the coral bullet and indigo eyebrow.
4. Deploy `invite-claim` edge function.
5. Send a test record to `appreview@homesbrain.com` (or the reviewer's inbox) and open in Gmail web, Gmail iOS, Apple Mail, Outlook.com to confirm rendering; check one non-English locale (es) as well.

No other files, no schema changes, no shared-shell contract changes for other emails (they'll pick up the softer chrome automatically, which is desirable and consistent with the brief).
