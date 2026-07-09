import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn, Field, Input } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { logEvent } from "@/lib/hb";

type LoginSearch = { email?: string; claim?: string; note?: string };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - HomesBrain" }] }),
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    email: typeof s.email === "string" ? s.email : undefined,
    claim: typeof s.claim === "string" ? s.claim : undefined,
    note: typeof s.note === "string" ? s.note : undefined,
  }),
  component: Login,
});

/* Email-first login. One email field for everyone; the
   lookup_login_method RPC decides the path:
   pro -> password step, homeowner -> magic link sent immediately,
   both -> small choice, none -> signup pointers. */
type Step =
  | "email"
  | "pro-sent"
  | "pro-password"
  | "ho-password"
  | "ho-sent"
  | "no-account"
  | "choose-role"
  | "forgot"
  | "forgot-sent";

const STEP_COPY: Record<Step, { title: string; sub: string }> = {
  email: { title: "Welcome back", sub: "Enter your email and we'll take it from there." },
  "pro-sent": { title: "Check your email", sub: "We sent you a one-tap sign-in link." },
  "pro-password": { title: "Welcome back", sub: "Enter your password to sign in." },
  "ho-password": { title: "Welcome back", sub: "Enter your password to sign in." },
  "ho-sent": { title: "Check your email", sub: "We sent you a one-tap sign-in link." },
  "no-account": { title: "No account yet", sub: "We couldn't find an account for that email." },
  "choose-role": { title: "Two accounts, one email", sub: "How do you want to sign in?" },
  forgot: { title: "Reset your password", sub: "We'll email you a reset link." },
  "forgot-sent": { title: "Check your email", sub: "Your reset link is on the way." },
};


function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showHoPassword, setShowHoPassword] = useState(false);
  const claimRecordId = search.claim ?? null;
  const expiredNote = search.note === "expired";

  // Prefill and auto-continue when the callback sent us here after an
  // expired magic link.
  useEffect(() => {
    if (search.email && expiredNote) {
      // Fire a fresh link automatically so it's really one tap.
      void sendMagicLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetToEmail() {
    setStep("email");
    setPassword("");
    setErr(null);
    setShowHoPassword(false);
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
      setStep("ho-password");
      setBusy(false);
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
    const { data, error } = await supabase.functions.invoke("homeowner-login", {
      body: { email: email.trim(), origin: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      if (res?.code === "no_account") {
        setStep("no-account");
        setBusy(false);
        return;
      }
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : res?.code === "daily_limit"
            ? "Too many sign-in links sent recently. Try again later."
            : "We couldn't send that link. Try again.",
      );
      setBusy(false);
      return;
    }
    setStep("ho-sent");
    setBusy(false);
  }


  async function homeownerPasswordLogin() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if (claimRecordId) {
      const { error: claimErr } = await supabase.rpc("claim_home", {
        p_record_id: claimRecordId,
      });
      if (claimErr) console.error("claim_home failed", claimErr);
    }
    navigate({ to: "/home" });
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
    const { data, error } = await supabase.functions.invoke("password-reset", {
      body: { email: email.trim(), origin: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : "We couldn't send that link. Try again.",
      );
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
            <GoogleButton
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/auth/callback`,
                });
                if (result.error) {
                  setErr(result.error.message ?? "Google sign-in failed");
                  setBusy(false);
                  return;
                }
                if (result.redirected) return;
                // Popup flow completed in-preview; session is set.
                navigate({ to: "/auth/callback" });
              }}
            />
            <OrDivider />
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

        {step === "ho-password" && (
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
                  if (e.key === "Enter" && password && !busy) homeownerPasswordLogin();
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
              onClick={homeownerPasswordLogin}
            >
              Sign in
            </Btn>
            <Btn
              variant="secondary"
              size="lg"
              className="w-full"
              loading={busy}
              onClick={sendMagicLink}
            >
              Email me a sign-in link instead
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
            {expiredNote && (
              <div className="text-sm text-ink bg-amberbg rounded-xl px-3 py-2">
                That link expired. We just sent a fresh one.
              </div>
            )}
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              We emailed a sign-in link to <span className="font-semibold">{email.trim()}</span>.
              Click it and you're in.
            </div>
            {showHoPassword ? (
              <>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && !busy) homeownerPasswordLogin();
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
                  onClick={homeownerPasswordLogin}
                >
                  Sign in
                </Btn>
              </>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoPassword(true);
                    setErr(null);
                  }}
                  className="text-xs font-semibold text-indigo hover:underline"
                >
                  Use my password instead
                </button>
              </div>
            )}
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

function GoogleButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-soft disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
      <div className="h-px flex-1 bg-line" />
      or
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
