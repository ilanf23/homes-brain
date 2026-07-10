# Homeowner setup completion - design

Date: 2026-07-10
Status: approved approach (option C: short wizard + checklist), spec pending user review

## Problem

A homeowner today is created by claiming a record link. They land on `/home` with a session and no obligations. If they do nothing else we lose three things:

1. Return access: no password means no way back in without another magic-link email.
2. Reachability: their phone/email was typed by the pro, not confirmed by them, and no notification consent is captured beyond the pro-side consent checkbox. Reminders (the core promise) can silently fail. This also matters for A2P 10DLC compliance once real SMS ships.
3. Loop growth: their other pros never get invited, appliances never get added.

The existing mitigation is a one-time `SetPasswordCard` on `/home`, triggered by a `hb_prompt_secure` sessionStorage flag set during claim. It is session-scoped and dismissable, so one dismiss or a closed tab kills it forever.

## Principle

The homeowner's psychology differs from the pro's. The pro arrived intending to set up a business tool; a 6-step wizard is fine. The homeowner tapped a link out of curiosity. So: record first, setup second, and only genuinely account-critical items go in the wizard. Trust-gated items (appliances, inviting pros) stay as post-setup nudges.

## Design

### 1. Wizard route `/home/setup` (new file `src/routes/home.setup.tsx`)

Same skeleton as `pro.setup.tsx`: header with progress dots and close button, `STEP_KEYS` array, first-incomplete-step detection on load, per-step persistence, sticky footer with back/next.

`STEP_KEYS = ["name", "password", "contact", "home"]`

| Step | Title | Writes | Rules |
|---|---|---|---|
| name | What should we call you? | `homeowners.name` | Required, trim length > 1, prefilled from existing row |
| password | Secure your account | `supabase.auth.updateUser({ password, data: { has_password: true } })` | Min 8 chars. Skippable ("Skip for now"). Step hidden entirely when the auth user's provider is Google |
| contact | How should your home reach you? | `homeowners.phone` (PhoneInput, US format), `email`, toggles `notify_sms`, `notify_email`, `respect_quiet_hrs`, checkbox `marketing_consent`; stamp `consent_at = now()` if null | Required: at least one reachable channel (valid phone or valid email) with its notify toggle on |
| home | Is this your home? | none beyond confirm; on Done stamp `homeowners.setup_completed_at = now()` | Shows `homes.address` as a KV card with a confirm button. A muted "Something wrong with the address?" link points to `/home/settings`. Finishing fires `homeowner_setup_completed` event with `{ skipped_password: boolean }` and navigates to `/home` |

Step completion detection (for first-incomplete-step):

- name: `homeowners.name` non-empty
- password: `user.user_metadata.has_password === true`, or provider is Google (treated as complete)
- contact: `consent_at` non-null
- home: `setup_completed_at` non-null

Skipping password does not block overall completion; `setup_completed_at` is the single source of truth for "done".

### 2. Data change

One migration:

```sql
ALTER TABLE public.homeowners
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;
```

Password state lives in auth `user_metadata.has_password`, no schema change. RLS is unchanged: homeowners already update their own row.

### 3. Entry points

- Claim flow (`claim.$token.tsx`): unchanged navigation. They see their record and home immediately. The `hb_prompt_secure` sessionStorage write is removed.
- `/login` homeowner redirect and `/auth/callback` homeowner path: after resolving the homeowner row, if `setup_completed_at` is null navigate to `/home/setup` instead of `/home`.
- `/home` (`home.index.tsx`): while `setup_completed_at` is null, render a persistent "Finish setting up your home" card at the top linking to `/home/setup`. This replaces `SetPasswordCard`, which is deleted along with its sessionStorage plumbing.

### 4. Post-setup checklist card on `/home`

Rendered only when `setup_completed_at` is non-null and at least one item is outstanding. Data-derived, no new columns, no dismissal state:

- "Add your appliances": done when at least one equipment row for the home has `source = 'homeowner'` (links to `/home/add`).
- "Invite your other pros": done when at least one `invites` row exists from this homeowner (links to `/home/pros`; the invite flow already fires `pro_invited`).

Card disappears when both are done.

### 5. Events

- `homeowner_setup_completed` with `{ skipped_password }`, actor `homeowner:<id>`, fired once on wizard completion.
- Existing events untouched; `pro_invited` continues to fire from the invite flow.

### 6. Edge cases

- Existing homeowners: `setup_completed_at` is null, so their next login routes through the wizard once. All fields prefill, so this is a fast confirm pass and back-fills `consent_at` for the existing base. Intentional.
- Google-auth homeowners: password step hidden; wizard is 3 steps for them.
- Password failure (weak password, network): inline error, stays on step, same pattern as `pro.setup.tsx`.
- Homeowner with no home yet (edge state handled today by `OnboardingNoHome`): wizard still works; the home step shows the no-home state copy and still allows finishing.
- Wizard close button: allowed (exits to `/home`); the persistent card on `/home` remains the pull-back.

### Out of scope

- Real SMS/email sends (A2P blocked; mocks stay).
- Changing the pro-side consent capture on log-a-job.
- Password change UX in `/home/settings` (kept as is).
