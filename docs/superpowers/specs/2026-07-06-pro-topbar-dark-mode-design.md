# Pro portal top bar + portal dark mode

Date: 2026-07-06
Status: approved (design), pending implementation

## Goal

Give the Pro portal a proper top navigation bar that becomes the home for
notifications and account actions, and add a full dark theme for the app
portal (pro and homeowner). Marketing pages and the public record page stay
light and untouched.

## Scope

In scope:

- New desktop top bar in `ProShell` with: global search, compact "Log a job"
  button, theme toggle, notification bell, account menu.
- Bell moves out of the sidebar header (sidebar header returns to logo-only).
- Sidebar footer identity card and sign-out move into the top bar account menu.
- Theme system (`src/lib/theme.ts`) with localStorage persistence.
- Dark token palette in `styles.css` under a `.dark` scope, applied by both
  `ProShell` and `HomeShell` on their root div.
- Theme toggle in the pro mobile header and in the homeowner shell.
- Sweep for hardcoded light-mode assumptions (e.g. Toast `bg-ink text-white`).

Out of scope (deliberate):

- System-theme auto detection ("auto" mode).
- Cmd+K command palette (the inline search is built so it can be layered on later).
- Any notifications changes beyond relocating the bell.
- Marketing, public record (`/r/:id`), claim, login, signup pages: all stay light.

## Architecture

### 1. Theme system: `src/lib/theme.ts`

Mirrors the `session.ts` pattern:

- `type Theme = "light" | "dark"`.
- `getTheme(): Theme` reads localStorage key `hb_theme`, defaults to `"light"`.
- `setTheme(t: Theme)` writes localStorage and dispatches a
  `hb_theme_change` window event.
- `useTheme(): [Theme, (t: Theme) => void]` hook: state seeded from
  `getTheme()` in an effect (SSR-safe: server renders light, corrects on
  hydrate), subscribes to `hb_theme_change` so multiple toggles stay in sync.

Both shells call `useTheme()` and put `dark` on their root div:

```tsx
<div className={`font-app min-h-dvh bg-soft md:flex ${theme === "dark" ? "dark" : ""}`}>
```

The Tailwind v4 `@custom-variant dark (&:is(.dark *))` already exists, and all
brand colors flow through CSS variables, so redefining the variables under
`.dark` re-themes every component with no per-component changes. Nothing in
the portal renders outside the shell tree (Toast is inline, dropdowns are
absolute-positioned inline), so scoping to the shell root is safe.

### 2. Dark palette (styles.css)

Added directly below the `:root` block. Values are starting points tuned for
the warm-ledger personality; verify AA during the polish pass and adjust.

```css
.dark {
  --ink: #f0eee6;      /* warm light text */
  --muted: #9b988f;    /* keep exact, no opacity tricks */
  --line: #33322a;
  --bg: #201f18;       /* cards / paper surfaces */
  --paper: #201f18;
  --soft: #171610;     /* page background, darkest */

  --indigo: #8a82ea;   /* brightened for legibility on dark */
  --indigobg: #2a2751;
  --indigo-dark: #c5c1f5;  /* text on tint flips light */
  --coral: #e87a4a;
  --coralbg: #3f2118;
  --coral-dark: #f2a184;
  --amber: #d9a04a;
  --amberbg: #3a2f16;
  --amber-dark: #ecc687;
  --red: #e06c6c;
  --redbg: #402020;
}
```

Notes:

- In light mode cards (paper) are lighter than the page (soft); dark mode
  keeps that relationship: cards slightly lighter than the page.
- `*-dark` tones are "text on tint" and therefore flip light in dark mode.
- Indigo fills that carry `text-white` (buttons, badge) must keep AA: if the
  brightened `--indigo` fails with white text, the Btn indigo fill uses a
  dedicated fill tone or drops to `text-ink`-on-fill in dark. Decide during
  the sweep, whichever passes AA with the least churn.

### 3. Hardcoded-color sweep

Grep the portal surface for `text-white`, `bg-ink`, hex literals, and rgba
shadows; fix only what breaks in dark:

- Toast (`src/lib/ui.tsx`): `bg-ink text-white` becomes `bg-ink text-bg`
  (in dark this inverts to a light toast with dark text, which is correct).
- The mobile "Log a job" bottom-zone gradient uses `var(--soft)` already and
  needs no change.
- Shadows stay as-is (dark shadows read fine on dark surfaces).

### 4. `ProTopBar` (new component inside `pro-shell.tsx`)

Desktop only (`hidden md:flex`), sticky `top-0 z-40`, `h-16`, `bg-paper/85
backdrop-blur-md`, `border-b border-line`, sitting at the top of the content
column (above `<main>`).

Layout:

- Left: global search input (flex-1, max-w around 420px).
- Right cluster, in order: compact "Log a job" button (`Btn` indigo, small,
  Plus icon + label, label hidden below lg), theme toggle icon button
  (Sun/Moon from lucide, `aria-label` "Switch to dark mode" / "Switch to
  light mode"), `NotificationsBell` (align right), account menu.

Sidebar changes in the same file:

- Sidebar header: logo only (bell removed).
- Sidebar footer block (identity card + sign-out) removed entirely; the
  sidebar keeps the "Log a job" CTA and nav list.

Mobile header changes:

- Gains the theme toggle icon button in the icon row (theme toggle, bell,
  sign-out stays for now since the account menu is desktop-only).

### 5. Account menu

Avatar button (existing `Avatar` with business initials, 32px) opening a
dropdown (same pattern as NotificationsBell: fixed overlay + absolute card,
`role="menu"`):

- Header row: avatar, business name (bold), trade label (muted), non-interactive.
- Menu items: "Settings" (links to `/pro/settings`, Settings icon),
  "Sign out" (LogOut icon, calls existing `clearSession()` + navigate home).

While `pro` is null (loading), render a small skeleton circle in its place.

### 6. Global search

Inline combobox in the top bar:

- Debounce 250ms, minimum 2 characters, results capped at 6 total.
- Queries scoped to the signed-in pro:
  - `customers`: `ilike` on `name` and `phone`, `eq pro_id`, limit 4.
  - `jobs` joined to `homes(address)` and `records(id)`: `ilike` on address,
    `eq pro_id`, ordered by `created_at` desc, limit 3.
- Results dropdown grouped under "Customers" and "Records"; each row shows
  name/address plus a muted secondary line (phone / what_done).
- Keyboard: ArrowUp/ArrowDown move the active row, Enter navigates, Escape
  closes and blurs. Proper `role="combobox"` / `role="listbox"` wiring.
- Selecting navigates to `/pro/customers/$customerId` or
  `/pro/records/$recordId` and clears the input.
- Empty result state: single muted row "No matches".
- Analytics: `logEvent("search_used", ...)` fired on navigation only, never
  per keystroke.

### 7. HomeShell

- `useTheme()` + `dark` class on the root div (same one-liner as ProShell).
- Theme toggle icon button added next to the existing header icons (desktop
  sidebar header and mobile header). No top bar for the homeowner side in
  this pass.

## Error handling

- Search queries that fail resolve to empty groups; no error UI beyond the
  "No matches" row (search must never break the shell).
- Theme read/write wrapped in try/catch like `session.ts` (private-mode
  localStorage failures fall back to light, in-memory only).

## Testing / verification

No test suite exists. Verify by running `bun dev` and exercising:

1. Toggle dark in the pro portal: every pro screen, the notifications
   dropdown, account menu, toasts, skeletons render correctly; marketing
   pages and `/r/:id` stay light; theme survives reload.
2. Toggle in HomeShell: homeowner screens flip; theme is shared with the pro
   portal (same key) so switching roles keeps the preference.
3. Search: type a known customer name, a phone fragment, an address fragment;
   keyboard-only navigation; empty query and no-match states.
4. Account menu: settings link, sign out, loading skeleton.
5. Mobile viewport: header toggle works, bottom CTA unaffected.
6. `bun run lint` passes.

## Files touched

- `src/lib/theme.ts` (new)
- `src/lib/ui.tsx` (Toast token fix, possibly Btn dark AA fix)
- `src/styles.css` (`.dark` palette)
- `src/components/pro-shell.tsx` (top bar, sidebar cleanup, mobile toggle)
- `src/components/home-shell.tsx` (theme hook + toggle)
- `src/lib/hb.ts` (only if a search helper is worth centralizing there)
