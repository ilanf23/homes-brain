## Goal

Replace the current record-notification email content with the approved 10-step hierarchy: warmer subject, "Your home remembers today's service." headline, a "note from [Pro]" panel, tighter Service / Equipment / Next service rows, and a "See what [Pro] saved" CTA. Visual language stays inside the current HomesBrain design system (Plus Jakarta Sans-safe stack, indigo brand, warm cream canvas, 20–22px rounded cards, pill CTA). All 4 locales, security, deliverability, and CAN-SPAM behavior are preserved.

## Design approach

- Keep the existing shared shell (`renderEmailShell`): same warm `#f2f0ea` canvas, 600px container, indigo house-squircle mark, brandLine + eyebrow lockup, white card with 2px indigo border, footer with reason + unsubscribe + postal address. This is exactly the "clearly connected to the record / portal" chrome we want.
- Content restructure inside the card:
  1. `renderH1("Your home remembers today's service.")` (localized). Ink `#16160f`, 24px/800, tight tracking — matches current H1 style.
  2. Intro paragraph: "[Pro] created a permanent record after servicing [equipment or service type] at [address]." Uses `renderBodyHtml` with `emphasize()` on business + address so brand + address read as anchors.
  3. New "A note from [Pro]" panel: soft cream `#f7f6f1` rounded 16px block, 1px `#ecebe4` border, left indigo 3px accent bar, small uppercase eyebrow "A NOTE FROM [PRO]" (indigo `#473fb0`, 11px/700, +0.14em), then italicized first-person summary quoting `what_done` (respect localized/translated variant). Falls back gracefully (panel omitted) if `what_done` is empty.
  4. Compact summary via existing `renderDetails` reduced to three rows in fixed order: **Service** (what_done, one line, ellipsized ~90 chars), **Equipment** (type + make + model), **Next service** (formatted `next_service_date` when present). Address moves out of the table into the intro sentence. Warranty row is dropped from this email to reduce clutter (still visible on the record page).
  5. `renderCta(ctaUrl, "See what [Pro] saved")` — indigo pill, unchanged component.
  6. `renderFinePrint("One tap opens the record. It is free, private, and yours for life.")` — muted, sits directly under CTA.
- Coral usage: a single restrained coral accent — a small coral dot `•` (or 6px coral square) before the "A NOTE FROM [PRO]" eyebrow, nothing else. Keeps indigo dominant, coral as payoff nod. If this feels off-brand at review time, drop the dot; no other coral in the email.
- No new fonts, images, background images, or web assets — email-client-safe inline styles only, same stack the shell already uses (Plus Jakarta not embedded in emails; system stack renders identically to today).

## Files to modify

- `supabase/functions/invite-claim/index.ts`
  - Rewrite `EMAIL_COPY` for all four locales (en/es/ru/uk): new `subject`, new `title`, new `intro` (replaces `description`/`addedAt`), new `noteFrom` label, new `service`/`equipment`/`nextService` labels, new `cta` ("See what [Pro] saved"), new `oneTap` reassurance. Keep `reason`, `footer`, `via`, `tagline` (text fallback) intact for compliance parity.
  - Subject template: "[Business] saved today's service record for your home" (localized equivalents). Pro first name is not currently stored (see gaps); business name is the reliable identity.
  - `recordEmail()`: build the note panel via a small new `renderNotePanel(label, body)` helper (added locally in this file, not in the shared shell, to avoid touching other emails). Reorder `bodyHtml` to: H1 → intro → note panel (optional) → details (3 rows) → CTA → fine print. Keep plain-text mirror updated with the same reordering.
  - Details rows: swap in "Next service" (uses existing `next_service_date` already selected on the job query around line 474; format with existing `formatEmailDate`). Drop warranty row.
- `supabase/functions/_shared/email-shell.ts`
  - No changes. The shell is unchanged so the other 4 transactional emails (`invite-pro`, `pro-welcome`, `password-reset`, `send-follow-up`) are unaffected.
- `supabase/functions/_shared/email-compliance.ts`
  - No changes. Footer, unsub, postal address, `List-Unsubscribe` header all reused as-is.

## Email-client compatibility risks

- Note panel: implemented as a `<table role="presentation">` with a left `<td>` holding the indigo accent bar (fixed width, background color) and a right `<td>` for eyebrow + quote. Avoids `border-left` quirks in Outlook. Matches the table-based pattern already used in `renderDetails`.
- Coral dot: rendered as a Unicode `•` colored via inline `color:#c2461f`, not a background chip — safe across Gmail/Outlook/Apple Mail.
- Italic quote: `<em>` with inline `font-style:italic;color:#16160f;` — universally supported.
- No new webfonts, background images, media queries, or dark-mode inversions introduced beyond what the shell already handles.
- Length: `what_done` displayed in both the note panel (full, wrapped) and the Service row (truncated to ~90 chars with ellipsis) to protect table layout on narrow clients.

## Content/data fields not currently available

- **Pro first name.** `pros` has `business`, not a person name. Recommendation: use business name everywhere the spec says "[Pro]" (subject, intro, note panel label, CTA). This is honest and matches the sender identity. If we later add `pros.owner_first_name`, we can swap in without changing structure.
- **Next service date.** Available on `jobs.next_service_date` and already fetched — safe to surface. If null, the row is omitted (no empty "—").
- **Service type label vs raw `what_done`.** No structured `service_type` field. Intro sentence uses equipment type when present, otherwise a generic localized "your home" fallback: "[Business] created a permanent record after today's service at [address]." Keeps the sentence truthful without inventing a category.

## Sender identity

Already "[Business] via HomesBrain" via the shell's `brandLine` + `eyebrow`. The From header stays `HomesBrain <records@homesbrain.com>` (or current sender) to protect DKIM/SPF alignment; visible identity is handled by the header lockup as approved. No sender-domain changes.

## Locales, security, deliverability, compliance

- All new strings added to `EMAIL_COPY` for en/es/ru/uk in the same call. No English fallback baked into HTML.
- Homeowner translation pipeline (`translations.what_done`, `translations.equipment_type`) continues to feed the note panel and Service/Equipment rows unchanged.
- Claim token minting, hashing, TTL, single-use, opt-out check, per-pro daily cap, `List-Unsubscribe` header, postal address, unsubscribe URL, and reason line are untouched.
- No new env vars, no new external calls, no auth changes, `verify_jwt` stays as-is.

## Rollout

1. Edit `invite-claim/index.ts` only. No shared-shell changes.
2. Deploy `invite-claim` with `supabase--deploy_edge_functions`.
3. Trigger one test record from the demo pro account to `appreview@homesbrain.com` and eyeball rendering in Gmail web + iOS Mail before closing out.
