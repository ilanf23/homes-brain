# Homeowner Setup Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 4-step homeowner setup wizard at `/home/setup` (name, password, contact + consent, home confirm), routed into on login while incomplete, plus a post-setup checklist card on `/home`, replacing the fragile sessionStorage password nudge.

**Architecture:** New file-based route `home.setup.tsx` cloned from the `pro.setup.tsx` wizard pattern (STEP_KEYS, first-incomplete-step detection, per-step persistence, sticky footer). One additive migration: `homeowners.setup_completed_at` column plus two SECURITY DEFINER RPCs (`homeowner_confirm_contact`, `homeowner_complete_setup`). Profile writes go through the existing `homeowner_update_profile` RPC. Password lives in Supabase auth with a `has_password` user_metadata flag.

**Tech Stack:** TanStack Start (file-based routes), React 19, Supabase (RPCs, auth), Tailwind v4, brand kit from `src/lib/ui.tsx`. Bun for all commands.

Spec: `docs/superpowers/specs/2026-07-10-homeowner-setup-completion-design.md`

## Global Constraints

- Never use em dashes anywhere: not in copy, comments, docs, or commit messages.
- Indigo is the brand accent for this whole flow. No coral (no payoff moment here), amber only if a warning state appears, red only for errors.
- Build app surfaces from `src/lib/ui.tsx` primitives (`Btn`, `Card`, `Field`, `Input`, `PhoneInput`, `Toggle`, `Pill`, `Eyebrow`, `PageLoader`), not `src/components/ui/`.
- `src/routeTree.gen.ts` is auto-generated: never edit it by hand. It regenerates when `bun dev` or `bun run build` runs.
- Do NOT edit `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-attacher.ts`, `auth-middleware.ts`.
- Migrations ship via repo/Lovable sync. Do NOT apply schema through the Supabase MCP. This means the new RPCs will 404 against the remote DB until the migration lands; local verification is lint + build, full flow verification happens after push/sync (Task 5).
- The working tree has unrelated pre-existing modifications (`src/components/forgetting-scene.tsx`, `src/styles.css`, `supabase/functions/geo/index.ts`, `src/routeTree.gen.ts`). Never `git add -A` or `git add .`; stage only the files each task names.
- There is no test suite. Each task verifies with `bun run lint` and `bun run build`, plus the manual flow pass in Task 5.
- Copy tone: warm, plain, homeowner-facing. Secondary text uses `text-muted` exactly.

---

### Task 1: Migration, generated types, and HomeownerRow

**Files:**
- Create: `supabase/migrations/20260710120000_homeowner_setup_completion.sql`
- Modify: `src/integrations/supabase/types.ts` (homeowners Row/Insert/Update + two Functions entries)
- Modify: `src/components/home-shell.tsx:10-20` (HomeownerRow type)

**Interfaces:**
- Consumes: existing `public.my_homeowner_id()` helper, existing `homeowners` table.
- Produces: `homeowners.setup_completed_at timestamptz` column; RPC `homeowner_confirm_contact()` returns void, stamps `consent_at` if null; RPC `homeowner_complete_setup()` returns void, stamps `setup_completed_at` if null. TypeScript: `HomeownerRow` gains `consent_at?: string | null` and `setup_completed_at?: string | null`. Later tasks call `supabase.rpc("homeowner_confirm_contact")` and `supabase.rpc("homeowner_complete_setup")` with no args.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260710120000_homeowner_setup_completion.sql`:

```sql
-- Homeowner setup completion: wizard completion stamp + contact confirmation.
-- setup_completed_at is the single source of truth for "finished /home/setup".
ALTER TABLE public.homeowners
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

-- Homeowner confirms ownership of the contact info a pro entered for them.
-- Stamps consent_at once; idempotent on repeat calls.
CREATE OR REPLACE FUNCTION public.homeowner_confirm_contact()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.homeowners
     SET consent_at = COALESCE(consent_at, now())
   WHERE id = v_ho;
END $$;

CREATE OR REPLACE FUNCTION public.homeowner_complete_setup()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho uuid := public.my_homeowner_id();
BEGIN
  IF v_ho IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.homeowners
     SET setup_completed_at = COALESCE(setup_completed_at, now())
   WHERE id = v_ho;
END $$;

REVOKE ALL ON FUNCTION public.homeowner_confirm_contact() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.homeowner_complete_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.homeowner_confirm_contact() TO authenticated;
GRANT EXECUTE ON FUNCTION public.homeowner_complete_setup() TO authenticated;
```

- [ ] **Step 2: Add the column to generated types**

In `src/integrations/supabase/types.ts`, find the `homeowners:` block (around line 218). Add `setup_completed_at: string | null` to the `Row` type, and `setup_completed_at?: string | null` to both `Insert` and `Update` types, keeping alphabetical order (after `respect_quiet_hrs`, before `sms_opt_out` if sorted that way; match the file's existing ordering exactly).

Note: this file is Lovable-generated. We edit it only to keep TypeScript in sync with the migration in the same commit; the next Lovable regeneration will produce the same shape.

- [ ] **Step 3: Add the two RPC entries to Functions**

In the same file, find the `Functions:` block (near `get_home_view: { Args: never; Returns: Json }` around line 924). Add, matching the surrounding entry style and alphabetical placement:

```ts
      homeowner_complete_setup: { Args: never; Returns: undefined }
      homeowner_confirm_contact: { Args: never; Returns: undefined }
```

If neighboring void-returning functions use a different `Returns` shape (for example `Returns: undefined` vs `Returns: null`), copy the shape used by an existing void RPC like `homeowner_update_profile`.

- [ ] **Step 4: Extend HomeownerRow**

In `src/components/home-shell.tsx`, extend the type (currently lines 10-20) to:

```ts
export type HomeownerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notify_email?: boolean;
  notify_sms?: boolean;
  sms_opt_out?: boolean;
  respect_quiet_hrs?: boolean;
  marketing_consent?: boolean;
  consent_at?: string | null;
  setup_completed_at?: string | null;
};
```

No other change in this file. `get_home_view` already returns `row_to_json(ho)`, so both new fields flow through automatically once the column exists.

- [ ] **Step 5: Lint and build**

Run: `bun run lint` then `bun run build`
Expected: both pass with no new errors (build regenerates `routeTree.gen.ts`; do not stage it).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260710120000_homeowner_setup_completion.sql src/integrations/supabase/types.ts src/components/home-shell.tsx
git commit -m "Add homeowner setup completion column and RPCs"
```

---

### Task 2: The wizard route `/home/setup`

**Files:**
- Create: `src/routes/home.setup.tsx`

**Interfaces:**
- Consumes: `useHomeownerGuard()` from `@/components/home-shell` (returns `homeowner: HomeownerRow | null`, `home`, `loading`, `refresh`); `supabase.rpc("homeowner_update_profile", {...})`; RPCs from Task 1; `phoneDigits` and `logEvent` from `@/lib/hb`; `Btn, Field, Input, PageLoader, PhoneInput, Pill, Toggle` from `@/lib/ui`; `Logo` from `@/components/svg`.
- Produces: route `/home/setup` accepting optional `?step=name|password|contact|home`. Fires `homeowner_setup_completed` event with `{ skipped_password: boolean }` on finish.

- [ ] **Step 1: Create the wizard**

Create `src/routes/home.setup.tsx` with exactly this content:

```tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Btn, Field, Input, PageLoader, PhoneInput, Pill, Toggle } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, phoneDigits } from "@/lib/hb";
import { Logo } from "@/components/svg";
import { useHomeownerGuard } from "@/components/home-shell";

/* Homeowner setup wizard, the /pro/setup pattern for the other side of the
   loop. Only account-critical items live here (name, password, contact +
   consent, home confirm). Trust-gated items (appliances, inviting pros)
   stay as the checklist card on /home. Password step is skippable and is
   hidden entirely for Google-auth users. */

const ALL_STEPS = ["name", "password", "contact", "home"] as const;
type StepKey = (typeof ALL_STEPS)[number];

type SetupSearch = { step?: StepKey };

export const Route = createFileRoute("/home/setup")({
  head: () => ({ meta: [{ title: "Finish setting up - HomesBrain" }] }),
  validateSearch: (raw: Record<string, unknown>): SetupSearch => {
    const s = raw.step;
    return { step: ALL_STEPS.includes(s as StepKey) ? (s as StepKey) : undefined };
  },
  component: HomeSetupWizard,
});

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function HomeSetupWizard() {
  const navigate = useNavigate();
  const { step: initialStep } = Route.useSearch();
  const { homeowner, home, loading: guardLoading, refresh } = useHomeownerGuard();

  const [userLoading, setUserLoading] = useState(true);
  const [isGoogle, setIsGoogle] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [quietHrs, setQuietHrs] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const [stepIdx, setStepIdx] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const steps = useMemo<StepKey[]>(
    () => (isGoogle ? ALL_STEPS.filter((s) => s !== "password") : [...ALL_STEPS]),
    [isGoogle],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      setIsGoogle(u?.app_metadata?.provider === "google");
      setHasPassword(u?.user_metadata?.has_password === true);
      setUserLoading(false);
    })();
  }, []);

  // Prefill and jump to the first incomplete step once both loads settle.
  useEffect(() => {
    if (guardLoading || userLoading || initialized || !homeowner) return;
    setName((homeowner.name ?? "").trim());
    setPhone((homeowner.phone ?? "").trim());
    setEmail((homeowner.email ?? "").trim());
    setNotifySms(homeowner.notify_sms ?? true);
    setNotifyEmail(homeowner.notify_email ?? true);
    setQuietHrs(homeowner.respect_quiet_hrs ?? true);
    setMarketing(homeowner.marketing_consent ?? false);

    const keys: StepKey[] = isGoogle
      ? ALL_STEPS.filter((s) => s !== "password")
      : [...ALL_STEPS];
    const done: Record<StepKey, boolean> = {
      name: !!homeowner.name?.trim(),
      password: isGoogle || hasPassword,
      contact: !!homeowner.consent_at,
      home: !!homeowner.setup_completed_at,
    };
    let idx = 0;
    if (initialStep && keys.includes(initialStep)) {
      idx = keys.indexOf(initialStep);
    } else {
      const firstIncomplete = keys.findIndex((k) => !done[k]);
      idx = firstIncomplete === -1 ? 0 : firstIncomplete;
    }
    setStepIdx(Math.max(0, idx));
    setInitialized(true);
  }, [guardLoading, userLoading, initialized, homeowner, isGoogle, hasPassword, initialStep]);

  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx === steps.length - 1;

  const validPhone = phoneDigits(phone).length === 10;
  const validEmail = isValidEmail(email.trim());
  const reachable = (validPhone && notifySms) || (validEmail && notifyEmail);

  const canAdvance = useMemo(() => {
    switch (step) {
      case "name":
        return name.trim().length > 1;
      case "password":
        return password.length >= 8;
      case "contact":
        return reachable;
      case "home":
        return true;
      default:
        return true;
    }
  }, [step, name, password, reachable]);

  async function persistCurrent(): Promise<boolean> {
    setSaving(true);
    setErr(null);
    try {
      switch (step) {
        case "name": {
          const { error } = await supabase.rpc("homeowner_update_profile", {
            p_name: name.trim(),
          });
          if (error) throw error;
          break;
        }
        case "password": {
          const { error } = await supabase.auth.updateUser({
            password,
            data: { has_password: true },
          });
          if (error) throw error;
          setHasPassword(true);
          break;
        }
        case "contact": {
          const { error } = await supabase.rpc("homeowner_update_profile", {
            p_phone: validPhone ? phone.trim() : undefined,
            p_email: validEmail ? email.trim() : undefined,
            p_notify_sms: notifySms,
            p_notify_email: notifyEmail,
            p_respect_quiet_hrs: quietHrs,
            p_marketing_consent: marketing,
          });
          if (error) throw error;
          const { error: confirmErr } = await supabase.rpc("homeowner_confirm_contact");
          if (confirmErr) throw confirmErr;
          break;
        }
        case "home":
          break;
      }
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (!canAdvance || saving) return;
    const ok = await persistCurrent();
    if (!ok) return;
    if (isLast) {
      const { error } = await supabase.rpc("homeowner_complete_setup");
      if (error) {
        setErr(error.message);
        return;
      }
      if (homeowner) {
        await logEvent(`homeowner:${homeowner.id}`, "homeowner_setup_completed", {
          skipped_password: !isGoogle && !hasPassword,
        });
      }
      await refresh();
      navigate({ to: "/home" });
      return;
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }

  function goBack() {
    setErr(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  function skipPassword() {
    setErr(null);
    setPassword("");
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }

  if (guardLoading || userLoading || !initialized || !homeowner) {
    return <PageLoader label="Loading your account" />;
  }

  return (
    <div className="font-app min-h-dvh bg-soft flex flex-col">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="indigo">
              Step {stepIdx + 1} of {steps.length}
            </Pill>
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              className="pressable p-2 rounded-full text-muted hover:text-ink hover:bg-paper"
              aria-label="Close setup"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-5 pb-3 flex items-center gap-1.5">
          {steps.map((k, i) => (
            <div
              key={k}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-indigo" : "bg-line"}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-5 py-10 sm:py-16">
        {step === "name" && (
          <StepFrame
            title="What should we call you?"
            sub="Your pros see this on the record they keep for you."
          >
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Rivera"
                autoComplete="name"
                className="!text-xl !py-4"
                autoFocus
              />
            </Field>
          </StepFrame>
        )}

        {step === "password" && (
          <StepFrame
            title="Secure your account"
            sub="Set a password so you can sign in any time, without waiting for an emailed link."
          >
            <Field label="Password" hint="At least 8 characters.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="!text-xl !py-4"
                autoFocus
              />
            </Field>
          </StepFrame>
        )}

        {step === "contact" && (
          <StepFrame
            title="How should your home reach you?"
            sub="Service reminders and new records go here. Confirm this is really you."
          >
            <div className="space-y-4">
              <Field label="Mobile phone">
                <PhoneInput value={phone} onChange={(v) => setPhone(v)} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <div className="space-y-2">
                <PrefRow
                  label="Text me reminders"
                  sub="Service due dates and new records by SMS."
                  checked={notifySms}
                  onChange={setNotifySms}
                />
                <PrefRow
                  label="Email me reminders"
                  sub="The same updates in your inbox."
                  checked={notifyEmail}
                  onChange={setNotifyEmail}
                />
                <PrefRow
                  label="Respect quiet hours"
                  sub="No messages late at night."
                  checked={quietHrs}
                  onChange={setQuietHrs}
                />
                <PrefRow
                  label="Occasional home tips"
                  sub="Seasonal maintenance tips. Optional."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
              {!reachable && (
                <p className="text-xs text-muted">
                  Keep at least one way to reach you: a valid phone with texts on, or a valid
                  email with email on.
                </p>
              )}
            </div>
          </StepFrame>
        )}

        {step === "home" && (
          <StepFrame title="Is this your home?" sub="Your record lives at this address.">
            {home ? (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Address
                </div>
                <div className="mt-1 text-lg font-bold text-ink">{home.address}</div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No home is linked yet. Claim a service record from your pro, or add your
                address from your home screen after you finish.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Something wrong?{" "}
              <Link to="/home/settings" className="font-semibold text-indigo hover:underline">
                Fix it in settings
              </Link>
              .
            </p>
          </StepFrame>
        )}

        {err && (
          <div role="alert" className="mt-4 text-sm text-red bg-redbg rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        {step === "password" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={skipPassword}
              className="text-sm font-semibold text-muted hover:text-ink underline underline-offset-2"
            >
              Skip for now: keep using emailed links
            </button>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-md px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIdx === 0}
            className="pressable inline-flex items-center justify-center w-14 h-14 rounded-full border border-line bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <Btn
            variant="indigo"
            size="lg"
            className="flex-1 h-14"
            disabled={!canAdvance}
            loading={saving}
            onClick={goNext}
          >
            {isLast ? (
              <span className="inline-flex items-center gap-2">
                <Check size={20} /> Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Next <ArrowRight size={20} />
              </span>
            )}
          </Btn>
        </div>
      </footer>
    </div>
  );
}

function PrefRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function StepFrame({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="anim-fade-up">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-2 text-base text-muted">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}
```

Implementation notes for this step:
- Check the actual `Toggle` props in `src/lib/ui.tsx` before assuming `checked`/`onChange`; `home.settings.tsx` line 257+ shows real usage. Match it.
- Check `PhoneInput` props against usage in `pro.setup.tsx` line 418 (`value`, `onChange={(v) => ...}`).
- If `supabase.rpc("homeowner_update_profile", ...)` rejects `undefined` args in TypeScript, pass `null` instead for the skipped params; the SQL uses COALESCE so null means "keep existing".

- [ ] **Step 2: Lint and build**

Run: `bun run lint` then `bun run build`
Expected: pass. Build regenerates `routeTree.gen.ts` to include `/home/setup` (do not stage the gen file; it will ship with the user's next sync or a later commit that touches it legitimately).

Note: if `bun run build` fails because `routeTree.gen.ts` must be committed for the route to exist in CI, stage it; otherwise leave it out per the dirty-tree constraint. Decide by whether the pre-existing local modification to `routeTree.gen.ts` already contains unrelated changes; if it does, do NOT stage it and say so in the task report.

- [ ] **Step 3: Commit**

```bash
git add src/routes/home.setup.tsx
git commit -m "Add homeowner setup wizard at /home/setup"
```

---

### Task 3: Route incomplete homeowners into setup on login

**Files:**
- Modify: `src/lib/hb.ts` (add helper near `logEvent`)
- Modify: `src/routes/login.tsx:206-225` (`homeownerPasswordLogin`)
- Modify: `src/routes/auth.callback.tsx:134-145` (homeowner path)

**Interfaces:**
- Consumes: `supabase.rpc("get_home_view")` (returns `{ homeowner: { setup_completed_at, ... }, ... }` and auto-creates the homeowners row for authed users).
- Produces: `homeownerNeedsSetup(): Promise<boolean>` exported from `@/lib/hb`.

- [ ] **Step 1: Add the helper to hb.ts**

In `src/lib/hb.ts`, after the existing exported helpers (near `logEvent`), add:

```ts
/* True when the signed-in homeowner has not finished /home/setup.
   get_home_view auto-creates the homeowners row for authed users, so this
   is safe to call right after login. Fails open (false) so a transient
   error never blocks someone out of /home. */
export async function homeownerNeedsSetup(): Promise<boolean> {
  const { data, error } = await supabase.rpc("get_home_view");
  if (error) return false;
  const ho = (
    data as { homeowner?: { setup_completed_at?: string | null } | null } | null
  )?.homeowner;
  return !!ho && !ho.setup_completed_at;
}
```

- [ ] **Step 2: Update password login**

In `src/routes/login.tsx`, `homeownerPasswordLogin` currently ends with:

```ts
    if (claimRecordId) {
      const { error: claimErr } = await supabase.rpc("claim_home", {
        p_record_id: claimRecordId,
      });
      if (claimErr) console.error("claim_home failed", claimErr);
    }
    navigate({ to: "/home" });
```

Replace the final `navigate` line with:

```ts
    const needsSetup = await homeownerNeedsSetup();
    navigate({ to: needsSetup ? "/home/setup" : "/home" });
```

Add `homeownerNeedsSetup` to the existing `@/lib/hb` import in this file.

- [ ] **Step 3: Update the auth callback homeowner path**

In `src/routes/auth.callback.tsx`, the homeowner branch currently ends with:

```ts
      await logEvent(`user:${user.id}`, "homeowner_signed_in", {});
      navigate({ to: "/home" });
```

Replace with:

```ts
      await logEvent(`user:${user.id}`, "homeowner_signed_in", {});
      const needsSetup = await homeownerNeedsSetup();
      navigate({ to: needsSetup ? "/home/setup" : "/home" });
```

Add `homeownerNeedsSetup` to the `@/lib/hb` import (currently `import { logEvent } from "@/lib/hb";`).

Do NOT touch the pro branches or the pending-signup logic above.

- [ ] **Step 4: Lint and build**

Run: `bun run lint` then `bun run build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hb.ts src/routes/login.tsx src/routes/auth.callback.tsx
git commit -m "Route homeowners with incomplete setup into /home/setup on login"
```

---

### Task 4: /home cards, retire the sessionStorage nudge, settings metadata

**Files:**
- Modify: `src/routes/home.index.tsx` (remove SetPasswordCard machinery; add FinishSetupCard + NextStepsCard)
- Modify: `src/routes/claim.$token.tsx:144-148` (remove `hb_prompt_secure` write)
- Modify: `src/routes/home.settings.tsx:457` (stamp `has_password` metadata)

**Interfaces:**
- Consumes: `useHomeownerGuard()` bundle fields `homeowner`, `equipment` (rows have `source: string`), `invites` (array). `HomeownerRow.setup_completed_at` from Task 1.
- Produces: no new exports; UI-only.

- [ ] **Step 1: Remove the old password nudge from home.index.tsx**

Delete, in `src/routes/home.index.tsx`:
- The `showSetPassword` state (line 37) and the `hb_prompt_secure` effect (lines 39-48).
- The `{showSetPassword && (<SetPasswordCard ... />)}` render block (lines 109-121).
- The entire `SetPasswordCard` function (lines 484-544).

- [ ] **Step 2: Add invites to the guard destructure**

The component currently destructures `{ homeowner, homeownerId, home, equipment, jobs, pros, records, loading, refresh }` from `useHomeownerGuard()` (lines 20-34; exact list may vary). Add `invites` to that destructure.

- [ ] **Step 3: Add the two cards**

Where the SetPasswordCard render block was (right under `<HomePageHead ... />`), add:

```tsx
      {homeowner && !homeowner.setup_completed_at && (
        <Card className="anim-fade-up mb-6 border-indigo/30">
          <Eyebrow accent="indigo">Finish setting up</Eyebrow>
          <p className="mt-2 text-sm text-ink">
            Confirm your details so reminders reach you, and set a password so you can sign
            back in any time.
          </p>
          <div className="mt-3">
            <Link to="/home/setup">
              <Btn variant="indigo">Finish setup</Btn>
            </Link>
          </div>
        </Card>
      )}

      {homeowner?.setup_completed_at && (!addedAppliance || !invitedPro) && (
        <NextStepsCard addedAppliance={addedAppliance} invitedPro={invitedPro} />
      )}
```

Above the component's `return`, alongside the other `useMemo` derivations, add:

```tsx
  const addedAppliance = equipment.some((e) => e.source === "homeowner");
  const invitedPro = invites.length > 0;
```

At the bottom of the file (module scope, near the other local components), add:

```tsx
function NextStepsCard({
  addedAppliance,
  invitedPro,
}: {
  addedAppliance: boolean;
  invitedPro: boolean;
}) {
  return (
    <Card className="anim-fade-up mb-6">
      <Eyebrow accent="indigo">Make your record complete</Eyebrow>
      <div className="mt-3 space-y-2">
        <ChecklistRow
          done={addedAppliance}
          label="Add your appliances"
          sub="Warranty and recall checks start with a model number."
          to="/home/add"
        />
        <ChecklistRow
          done={invitedPro}
          label="Invite your other pros"
          sub="Every trade you add deepens your home's record."
          to="/home/pros"
        />
      </div>
    </Card>
  );
}

function ChecklistRow({
  done,
  label,
  sub,
  to,
}: {
  done: boolean;
  label: string;
  sub: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition ${
        done ? "bg-soft opacity-60" : "bg-white hover:bg-soft"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-indigo text-white" : "border border-line text-transparent"
        }`}
      >
        <Check size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </Link>
  );
}
```

Import notes: `Card`, `Eyebrow`, `Btn` are already imported in this file (SetPasswordCard used them); `Link` comes from `@tanstack/react-router` (check the existing import line); add `Check` to the `lucide-react` import if not present. Remove `Input` from the `@/lib/ui` import ONLY if nothing else in the file still uses it after SetPasswordCard is gone (check first).

- [ ] **Step 4: Remove the claim-flow flag**

In `src/routes/claim.$token.tsx`, delete lines 144-148:

```ts
      try {
        sessionStorage.setItem("hb_prompt_secure", "1");
      } catch {
        // ignore
      }
```

Confirm no other reference to `hb_prompt_secure` remains: `grep -rn "hb_prompt_secure" src/` must return nothing.

- [ ] **Step 5: Stamp has_password in settings**

In `src/routes/home.settings.tsx` line 457, change:

```ts
    const { error } = await supabase.auth.updateUser({ password: pw });
```

to:

```ts
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { has_password: true },
    });
```

This keeps the wizard's password-step detection truthful for homeowners who set a password from settings instead.

- [ ] **Step 6: Lint and build**

Run: `bun run lint` then `bun run build`
Expected: pass, no unused-import warnings in the touched files.

- [ ] **Step 7: Commit**

```bash
git add src/routes/home.index.tsx src/routes/claim.\$token.tsx src/routes/home.settings.tsx
git commit -m "Replace password nudge with setup card and next-steps checklist on /home"
```

---

### Task 5: End-to-end verification

**Files:** none created; this task exercises the flow.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Static checks**

Run: `bun run lint && bun run build`
Expected: both pass.

- [ ] **Step 2: Dev-server flow pass (pre-migration limits)**

Run `bun dev`, then verify in the browser:

1. `/home/setup` renders the wizard shell (header, dots, name step) for a signed-in homeowner.
2. The name step Next button disables until 2+ characters.
3. The password step shows the skip link; skipping advances without an API call.
4. The contact step Next disables when neither channel is valid+enabled (clear phone and email to confirm).
5. `/home` shows the "Finish setting up" card for a homeowner with null `setup_completed_at`.
6. `/home` no longer ever shows the old SetPasswordCard, and claiming a record does not write `hb_prompt_secure` (check DevTools sessionStorage after a claim).

Known limitation until the migration ships via sync: saving the name/contact steps calls `homeowner_update_profile` (exists today, works), but `homeowner_confirm_contact` and `homeowner_complete_setup` will error against the remote DB. Verify the error surfaces in the red inline alert rather than crashing, then complete flow verification after the push/sync in Step 3.

- [ ] **Step 3: Push and post-sync verification**

Confirm with the user before pushing (Lovable mirrors main). After push and Lovable sync applies the migration:

1. Complete the wizard end to end; confirm `/home` afterward shows the NextStepsCard instead of the finish-setup card.
2. Sign out, sign back in with email + password; confirm it lands on `/home` directly (setup complete).
3. In Supabase, confirm the homeowners row has `consent_at` and `setup_completed_at` stamped and an `events` row exists with type `homeowner_setup_completed`.

---

## Self-review notes

- Spec coverage: wizard (Task 2), migration (Task 1), entry points (Task 3), cards + retirement + settings metadata (Task 4), events (Task 2 goNext), edge cases (Google branch, no-home copy, prefill for existing homeowners) all present.
- The spec's "step hidden for Google users" is implemented by filtering `ALL_STEPS`, and the completion event fires exactly once because `homeowner_complete_setup` is idempotent and the event only fires on the wizard's Done path.
- Type consistency: `homeownerNeedsSetup` (Task 3) matches its call sites; `setup_completed_at` naming is identical across migration, types.ts, HomeownerRow, and all reads.
