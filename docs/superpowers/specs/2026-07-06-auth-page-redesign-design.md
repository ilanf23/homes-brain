# Auth page redesign: email-first login in a split-screen AuthShell

Date: 2026-07-06
Status: Approved

## Goal

Redesign the auth surfaces so they work as the product's front door: visually premium and on-brand (the kept-ledger warmth), structurally simpler (no pro/homeowner tab choice), and consistent as a family. Scope for this pass is `/login` and `/reset-password`. Signup pages keep their current design and can adopt the new shell later.

## Background

Real Supabase auth just landed (commits `3a63564`..`8dadd27`): pros sign in with email + password, homeowners with an email magic link. The current `/login` is a centered card with an "I'm a pro / I'm a homeowner" pill tab switcher. It works but looks generic and pushes a role decision onto the user that the system can make itself.

## Design

### 1. Flow: email-first with role auto-detect

`/login` becomes a small state machine instead of tabs. Steps:

- `email`: single email field + Continue button. No role choice.
- `pro-password`: password field revealed below the (now read-only) email, Sign in button, forgot-password link, "Use a different email" back link.
- `ho-sent`: "Check your email at X" confirmation after the magic link is sent.
- `no-account`: friendly "No account found for that email" with two links: Start free as a pro (`/pro/signup`) and Create your home account (`/home/signup`).
- `choose-role`: shown only when the email maps to both roles. Two options: "Sign in with password" (goes to `pro-password`) and "Email me a sign-in link" (sends the magic link, goes to `ho-sent`).
- `forgot` and `forgot-sent`: forgot-password sub-flow, same `resetPasswordForEmail` logic as today.

On Continue, the client calls a new RPC `lookup_login_method(p_email text)` and branches:

- `pro` -> `pro-password`. Sign-in uses the existing `signInWithPassword` + pros-table check + `logEvent("logged_in")` logic unchanged.
- `homeowner` -> immediately fire `signInWithOtp` (same options as today) and go to `ho-sent`. This removes one click versus the current flow.
- `none` -> `no-account`.
- `both` -> `choose-role`.

Every post-email state has a "Use a different email" path back to `email`.

### 2. New migration: `lookup_login_method`

One new SQL migration in `supabase/migrations/` (shipped via the normal repo/Lovable sync, never applied through the Supabase MCP):

- `public.lookup_login_method(p_email text) returns text`
- SECURITY DEFINER, `search_path` pinned, EXECUTE granted to `anon` and `authenticated`.
- Logic: resolve `auth.users` by `lower(email) = lower(p_email)`, then check membership in `public.pros` and `public.homeowners` via `auth_user_id` (both tables have this column). Return `'pro'`, `'homeowner'`, `'both'`, or `'none'`.

Accepted trade-off: this reveals whether an email has an account (enumeration). That is standard for email-first login (Notion, Slack) and low-risk for this product; accepted for v0.

### 3. Layout: reusable `AuthShell`

New `src/components/auth-shell.tsx`, used by `/login` and `/reset-password`:

- Two-column grid at `lg` and up, `min-h-dvh`.
- Left column: logo top-left linking to `/` (replaces the sticky app header; auth pages read as a door, not an app screen), form content vertically centered at about `max-w-sm`, small muted footer line.
- Right column (hidden below `lg`): warm indigo-tint panel. Background blends `indigobg` toward `soft` (not flat brand indigo) to keep the ledger warmth. Contents (revised 2026-07-06 after review; the original single tilted record card read flat and empty):
  - A static ledger timeline for a fictional home ("128 Alder Lane", "The ledger so far"): three small record cards on a connected vertical line, two completed visits with verified checks and one upcoming visit, each with trade, business, and date.
  - Tagline below: "A home that remembers itself." plus one muted supporting line.
- Mobile: single centered column, panel hidden, no functional loss.

Brand rules apply throughout: indigo only (no coral/amber on auth), Plus Jakarta Sans, pill buttons, secondary text stays `--muted` (#73706a), no em dashes in any copy.

### 4. States and errors

- Same error treatment as today: `redbg` alert rows with `role="alert"`.
- Busy states on all submit buttons (Continue, Sign in, Send reset link).
- Enter-key submission preserved on email and password fields.
- `logEvent("logged_in")` kept on successful pro sign-in.
- `/reset-password` keeps its current logic, re-wrapped in `AuthShell`.

### 5. Out of scope

- Signup pages (`/pro/signup`, `/home/signup`): unchanged this pass; they can adopt `AuthShell` later.
- `auth.callback.tsx`: unchanged.
- Any change to the underlying Supabase auth calls or session handling.

## Verification

No test suite. Verify by running `bun dev` and exercising:

1. Pro login with correct and wrong password.
2. Homeowner email -> magic link sent state.
3. Unknown email -> no-account state with both signup links.
4. Forgot password send and `/reset-password` render.
5. Mobile width: panel hidden, single column intact.
