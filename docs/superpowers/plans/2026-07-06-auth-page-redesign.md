# Auth Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tabbed `/login` page with an email-first flow (role auto-detected server-side) inside a new split-screen `AuthShell`, and re-wrap `/reset-password` in the same shell.

**Architecture:** A new SECURITY DEFINER RPC `lookup_login_method(p_email)` maps an email to `pro | homeowner | both | none`. `/login` becomes a small client-side state machine that branches on the RPC result. A reusable `AuthShell` component provides the split layout (form left, warm indigo brand panel with a mini record card right). Existing Supabase auth calls are unchanged.

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase (Postgres RPC via `supabase.rpc`), existing `src/lib/ui.tsx` brand kit.

## Global Constraints

- Never use em dashes (U+2014) anywhere: copy, comments, docs, commit messages.
- Indigo is the only brand accent on auth surfaces. No coral, no amber.
- Secondary text stays `text-muted` exactly; never lighten with opacity.
- Migrations are files in `supabase/migrations/` only. Never apply schema through the Supabase MCP; Lovable applies them on sync.
- `src/routeTree.gen.ts` is auto-generated; never edit it.
- Do not edit `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-attacher.ts`, `auth-middleware.ts`. The one allowed touch in `src/integrations/supabase/types.ts` is adding the `lookup_login_method` entry to the `Functions` block, matching the generator's shape exactly (Task 1).
- There is no test suite. Each task verifies with `bun run build` (and `bun run lint` where noted); final task verifies flows against `bun dev`.
- Commit after every task. Never force-push or rewrite published history.

---

### Task 1: `lookup_login_method` RPC (migration + client type)

**Files:**
- Create: `supabase/migrations/20260706230000_lookup_login_method.sql`
- Modify: `src/integrations/supabase/types.ts` (Functions block, around line 532)

**Interfaces:**
- Consumes: existing tables `public.pros(auth_user_id)`, `public.homeowners(auth_user_id)`, `auth.users(email)`.
- Produces: RPC callable from the browser client as `supabase.rpc("lookup_login_method", { p_email: string })` returning `"pro" | "homeowner" | "both" | "none"` (typed as `string`). Task 3 depends on this exact name and arg.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706230000_lookup_login_method.sql`:

```sql
-- Email-first login: tells /login whether an email belongs to a pro,
-- a homeowner, both, or neither. Trade-off accepted in the 2026-07-06
-- auth redesign spec: this reveals account existence, which is standard
-- for email-first login flows.
CREATE OR REPLACE FUNCTION public.lookup_login_method(p_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_pro boolean;
  v_is_ho boolean;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN 'none';
  END IF;
  SELECT id INTO v_uid FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN 'none';
  END IF;
  v_is_pro := EXISTS (SELECT 1 FROM public.pros WHERE auth_user_id = v_uid);
  v_is_ho  := EXISTS (SELECT 1 FROM public.homeowners WHERE auth_user_id = v_uid);
  IF v_is_pro AND v_is_ho THEN RETURN 'both';
  ELSIF v_is_pro THEN RETURN 'pro';
  ELSIF v_is_ho THEN RETURN 'homeowner';
  ELSE RETURN 'none';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.lookup_login_method(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_login_method(text) TO anon, authenticated;
```

- [ ] **Step 2: Add the client type**

In `src/integrations/supabase/types.ts`, inside the `Functions: {` block, add this entry in alphabetical position (after the last `homeowner_*` entry, before `my_homeowner_id` or whatever follows alphabetically):

```ts
      lookup_login_method: { Args: { p_email: string }; Returns: string }
```

This matches what the Supabase type generator will emit when Lovable applies the migration, so a later regeneration is a no-op for this entry.

- [ ] **Step 3: Verify the build**

Run: `bun run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706230000_lookup_login_method.sql src/integrations/supabase/types.ts
git commit -m "Add lookup_login_method RPC for email-first login"
```

---

### Task 2: `AuthShell` component

**Files:**
- Create: `src/components/auth-shell.tsx`

**Interfaces:**
- Consumes: `Logo` from `@/components/svg` (prop `markClassName`), `Card`, `KV`, `Pill` from `@/lib/ui`.
- Produces: `export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode })`. Tasks 3 and 4 wrap their page content in this. `children` renders in a vertically centered `max-w-sm` column on the left; `footer` (optional) replaces the default muted footer line.

- [ ] **Step 1: Write the component**

Create `src/components/auth-shell.tsx`:

```tsx
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/svg";
import { Card, KV, Pill } from "@/lib/ui";

/* Split-screen shell for the auth pages (/login, /reset-password).
   Left: logo top-left, form column vertically centered, muted footer line.
   Right (lg and up): warm indigo panel with a mini record card, so the
   auth pages read as the product's front door, not an app screen. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="font-app min-h-dvh bg-soft text-ink lg:grid lg:grid-cols-[1fr_minmax(0,44%)]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="group inline-flex w-fit items-center gap-2.5">
          <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="text-center text-xs text-muted">
          {footer ?? <span>Free for homeowners. Records stay yours for life.</span>}
        </div>
      </div>
      <aside
        aria-hidden="true"
        className="hidden lg:flex flex-col items-center justify-center gap-8 border-l border-line bg-gradient-to-b from-indigobg via-indigobg to-soft px-10 py-16"
      >
        <MiniRecordCard />
        <div className="max-w-xs text-center">
          <div className="text-xl font-extrabold tracking-tight text-ink">
            A home that remembers itself.
          </div>
          <p className="mt-2 text-sm text-muted">
            Every visit from your pros becomes a verified record your home keeps for good.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* Static mock of a service record, floating slightly tilted on the panel. */
function MiniRecordCard() {
  return (
    <Card className="w-full max-w-xs -rotate-2 shadow-[0_24px_48px_-24px_rgba(42,36,112,0.35)]">
      <Pill accent="indigo">Verified record</Pill>
      <div className="mt-3 text-lg font-extrabold tracking-tight">AquaPure Water Co.</div>
      <div className="mt-0.5 text-sm text-muted">Whole-home filter replacement</div>
      <div className="mt-3">
        <KV k="Next service" v="Oct 12, 2026" />
        <KV k="Serial" v="AP-2231-884" />
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `bun run build`
Expected: build completes with no TypeScript errors (component is not yet imported anywhere, which is fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/auth-shell.tsx
git commit -m "Add split-screen AuthShell for auth pages"
```

---

### Task 3: Rewrite `/login` as an email-first state machine

**Files:**
- Modify: `src/routes/login.tsx` (full rewrite of the component; route config unchanged)

**Interfaces:**
- Consumes: `AuthShell` from Task 2; `lookup_login_method` RPC from Task 1; existing `supabase.auth.signInWithPassword`, `signInWithOtp`, `resetPasswordForEmail`; `logEvent` from `@/lib/hb`; `Btn`, `Field`, `Input` from `@/lib/ui`.
- Produces: `/login` route behavior other pages link to (unchanged URL). Links out to `/pro/signup`, `/home/signup`, `/reset-password` (via email link), `/pro`, `/home`.

- [ ] **Step 1: Rewrite login.tsx**

Replace the entire contents of `src/routes/login.tsx` with:

```tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn, Field, Input } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - HomesBrain" }] }),
  component: Login,
});

/* Email-first login. One email field for everyone; the
   lookup_login_method RPC decides the path:
   pro -> password step, homeowner -> magic link sent immediately,
   both -> small choice, none -> signup pointers. */
type Step =
  | "email"
  | "pro-password"
  | "ho-sent"
  | "no-account"
  | "choose-role"
  | "forgot"
  | "forgot-sent";

const STEP_COPY: Record<Step, { title: string; sub: string }> = {
  email: { title: "Welcome back", sub: "Enter your email and we'll take it from there." },
  "pro-password": { title: "Welcome back", sub: "Enter your password to sign in." },
  "ho-sent": { title: "Check your email", sub: "We sent you a one-tap sign-in link." },
  "no-account": { title: "No account yet", sub: "We couldn't find an account for that email." },
  "choose-role": { title: "Two accounts, one email", sub: "How do you want to sign in?" },
  forgot: { title: "Reset your password", sub: "We'll email you a reset link." },
  "forgot-sent": { title: "Check your email", sub: "Your reset link is on the way." },
};

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function resetToEmail() {
    setStep("email");
    setPassword("");
    setErr(null);
  }

  async function continueWithEmail() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("lookup_login_method", {
      p_email: email.trim(),
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if (data === "pro") {
      setStep("pro-password");
      setBusy(false);
    } else if (data === "homeowner") {
      await sendMagicLink();
    } else if (data === "both") {
      setStep("choose-role");
      setBusy(false);
    } else {
      setStep("no-account");
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setStep("ho-sent");
    setBusy(false);
  }

  async function proLogin() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const { data: pro } = await supabase
      .from("pros")
      .select("id,business")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();
    if (!pro) {
      setErr("This account isn't a pro account. Contact support.");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    await logEvent(`pro:${pro.id}`, "logged_in", { role: "pro" });
    navigate({ to: "/pro" });
  }

  async function sendReset() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setStep("forgot-sent");
    setBusy(false);
  }

  const copy = STEP_COPY[step];

  return (
    <AuthShell>
      <div className="mb-6">
        <h1 className="text-3xl tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted">{copy.sub}</p>
      </div>

      <div className="space-y-4">
        {step === "email" && (
          <>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim() && !busy) continueWithEmail();
                }}
              />
            </Field>
            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!email.trim()}
              loading={busy}
              onClick={continueWithEmail}
            >
              Continue
            </Btn>
            <p className="text-center text-xs text-muted">
              New here?{" "}
              <Link to="/pro/signup" className="font-semibold text-indigo hover:underline">
                Start free as a pro
              </Link>{" "}
              or{" "}
              <Link to="/home/signup" className="font-semibold text-indigo hover:underline">
                create your home account
              </Link>
            </p>
          </>
        )}

        {step === "pro-password" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password && !busy) proLogin();
                }}
              />
            </Field>
            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!password}
              loading={busy}
              onClick={proLogin}
            >
              Sign in
            </Btn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("forgot");
                  setErr(null);
                }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {step === "ho-sent" && (
          <>
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              We emailed a sign-in link to <span className="font-semibold">{email.trim()}</span>.
              Click it and you're in.
            </div>
            <BackToEmail onClick={resetToEmail} />
          </>
        )}

        {step === "no-account" && (
          <>
            <div className="text-sm text-ink bg-soft border border-line rounded-xl px-3 py-2">
              Nothing yet for <span className="font-semibold">{email.trim()}</span>. Pick where to
              start:
            </div>
            <Link to="/pro/signup" className="block">
              <Btn variant="indigo" size="lg" className="w-full">
                Start free as a pro
              </Btn>
            </Link>
            <Link to="/home/signup" className="block">
              <Btn variant="secondary" size="lg" className="w-full">
                Create your home account
              </Btn>
            </Link>
            <BackToEmail onClick={resetToEmail} />
          </>
        )}

        {step === "choose-role" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              onClick={() => {
                setStep("pro-password");
                setErr(null);
              }}
            >
              Sign in with password
            </Btn>
            <Btn
              variant="secondary"
              size="lg"
              className="w-full"
              loading={busy}
              onClick={sendMagicLink}
            >
              Email me a sign-in link
            </Btn>
          </>
        )}

        {step === "forgot" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <ErrorRow err={err} />
            <Btn variant="indigo" size="lg" className="w-full" loading={busy} onClick={sendReset}>
              Send reset link
            </Btn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("pro-password");
                  setErr(null);
                }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {step === "forgot-sent" && (
          <>
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              Reset link sent to <span className="font-semibold">{email.trim()}</span>. Open it to
              set a new password.
            </div>
            <BackToEmail onClick={resetToEmail} />
          </>
        )}
      </div>
    </AuthShell>
  );
}

function ErrorRow({ err }: { err: string | null }) {
  if (!err) return null;
  return (
    <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
      {err}
    </div>
  );
}

/* The confirmed email, shown read-only above later steps. */
function EmailSummary({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5">
      <span className="truncate text-sm font-semibold text-ink">{email.trim()}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-xs font-semibold text-indigo hover:underline"
      >
        Not you?
      </button>
    </div>
  );
}

function BackToEmail({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onClick}
        className="text-xs font-semibold text-indigo hover:underline"
      >
        Use a different email
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build and lint**

Run: `bun run build && bun run lint`
Expected: both pass. If lint flags unused imports (`Card`, `Pill` are no longer used in login.tsx), they are already absent from the code above; fix any other stragglers.

- [ ] **Step 3: Commit**

```bash
git add src/routes/login.tsx
git commit -m "Rewrite login as email-first flow in AuthShell"
```

---

### Task 4: Re-wrap `/reset-password` in AuthShell

**Files:**
- Modify: `src/routes/reset-password.tsx`

**Interfaces:**
- Consumes: `AuthShell` from Task 2. All existing recovery/session logic stays byte-identical.
- Produces: same route behavior, new layout.

- [ ] **Step 1: Swap the layout**

In `src/routes/reset-password.tsx`:

1. Replace the imports line `import { Btn, Card, Field, Input, Pill } from "@/lib/ui";` with `import { Btn, Field, Input } from "@/lib/ui";` and add `import { AuthShell } from "@/components/auth-shell";`. Remove `Logo` from the svg import (keep `ShieldCheck`): `import { ShieldCheck } from "@/components/svg";`.
2. Replace the JSX return: delete the outer `<div className="font-app min-h-dvh bg-soft">`, the entire `<header>...</header>` block, the `<div className="mx-auto max-w-md px-5 py-12">` wrapper, and the `<Card>...</Card>` wrapper. Wrap the three conditional blocks (`!ready`, `ready && done`, `ready && !done && hasRecovery`, `ready && !done && !hasRecovery`) directly in `<AuthShell> ... </AuthShell>`.

The component body becomes (state, effect, and `updatePassword` unchanged from the current file):

```tsx
  return (
    <AuthShell>
      {!ready && <div className="text-sm text-muted">Loading…</div>}
      {ready && done && (
        <div className="text-center space-y-3">
          <ShieldCheck size={36} className="mx-auto text-indigo" />
          <h1 className="text-2xl tracking-tight">Password updated</h1>
          <p className="text-sm text-muted">Redirecting you to your dashboard…</p>
        </div>
      )}
      {ready && !done && hasRecovery && (
        <div className="space-y-4">
          <h1 className="text-2xl tracking-tight">Set a new password</h1>
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {err && <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>}
          <Btn variant="indigo" size="lg" className="w-full" loading={busy} onClick={updatePassword}>
            Update password
          </Btn>
        </div>
      )}
      {ready && !done && !hasRecovery && (
        <div className="space-y-3 text-center">
          <h1 className="text-2xl tracking-tight">Reset link required</h1>
          <p className="text-sm text-muted">
            Open the reset link from your email to set a new password. If it expired, request a
            new one on the login page.
          </p>
          <Link to="/login">
            <Btn variant="indigo" className="w-full">
              Back to login
            </Btn>
          </Link>
        </div>
      )}
    </AuthShell>
  );
```

Note: `useNavigate` and `Link` stay imported from `@tanstack/react-router` (both still used).

- [ ] **Step 2: Verify build and lint**

Run: `bun run build && bun run lint`
Expected: both pass, no unused-import warnings.

- [ ] **Step 3: Commit**

```bash
git add src/routes/reset-password.tsx
git commit -m "Wrap reset-password in AuthShell"
```

---

### Task 5: End-to-end verification against the dev server

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything above, running under `bun dev`.

Note: until the Lovable sync applies the Task 1 migration to the remote database, the RPC does not exist remotely and Continue will return a "function not found" error. Verify layout and states regardless; if the RPC 404s, confirm the error surfaces in the ErrorRow (not a crash) and flag the pending migration in the final report.

- [ ] **Step 1: Start the dev server**

Run: `bun dev` (background)
Expected: server up on the printed localhost URL.

- [ ] **Step 2: Exercise /login**

In a browser: open `/login`.
Check: split layout at desktop width (form left, indigo panel with record card right); panel hidden at mobile width; email step renders with Continue disabled until text is entered.
Then: enter an email and Continue. With the migration applied, verify pro email -> password step, wrong password -> error row, correct pro login -> `/pro`; homeowner email -> "check your email" state; unknown email -> no-account state with both signup buttons. Without it, verify the RPC error lands in the error row.

- [ ] **Step 3: Exercise forgot password and /reset-password**

From the pro password step, click "Forgot password?" -> Send reset link -> forgot-sent state. Open `/reset-password` directly: "Reset link required" state inside the AuthShell with a working "Back to login" button.

- [ ] **Step 4: Report**

Summarize what was verified and anything blocked (for example, the remote RPC pending Lovable sync). No commit.
