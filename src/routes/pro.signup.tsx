import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo, ShieldCheck } from "@/components/svg";

/* Frictionless pro signup: 2 fields (first name + email), Continue sends
   a Resend magic link (via pro-login), tap opens /claim/:token which
   creates the pros row and routes to /pro/setup for business + trade +
   service area. Google is also here as the one-tap alternative.

   No password, no business, no trade on this screen — everything is
   deferred into /pro/setup to keep the first ask trivial for the pro. */

type ProSignupSearch = { email?: string };

export const Route = createFileRoute("/pro/signup")({
  head: () => ({ meta: [{ title: "Start free - HomesBrain for pros" }] }),
  validateSearch: (s: Record<string, unknown>): ProSignupSearch => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: ProSignup,
});

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function ProSignup() {
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const canContinue = firstName.trim().length > 0 && isValidEmail(email.trim());

  async function sendMagicLink() {
    setSubmitting(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("pro-login", {
      body: {
        email: email.trim(),
        first_name: firstName.trim(),
        origin: window.location.origin,
      },
    });
    if (error) {
      setErr(error.message);
      setSubmitting(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : res?.code === "daily_limit"
            ? "Too many sign-in links sent recently. Try again later."
            : "We couldn't send that link. Try again.",
      );
      setSubmitting(false);
      return;
    }
    setSentTo(email.trim());
    setSubmitting(false);
  }

  async function continueWithGoogle() {
    setGoogleBusy(true);
    setErr(null);
    // Stash pro-signup intent + captured first name so /auth/callback can
    // create the pros row for a brand-new pro coming back from Google.
    try {
      localStorage.setItem(
        "hb_pending_pro_signup",
        JSON.stringify({
          intent: "pro",
          owner_first_name: firstName.trim() || null,
        }),
      );
    } catch {
      // ignore storage failure; callback will fall back to homeowner default
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      setErr(result.error.message ?? "Google sign-in failed");
      setGoogleBusy(false);
      return;
    }
    if (result.redirected) return;
    window.location.href = "/auth/callback";
  }

  if (sentTo) {
    return (
      <div className="font-app min-h-dvh bg-soft">
        <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
          <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
            </Link>
            <Pill accent="indigo">Check your email</Pill>
          </div>
        </header>
        <div className="mx-auto max-w-md px-5 py-16">
          <Card className="text-center">
            <ShieldCheck size={40} className="mx-auto text-indigo" />
            <h1 className="mt-4 text-2xl tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-muted">
              We sent a one-tap link to{" "}
              <span className="font-semibold text-ink">{sentTo}</span>. Tap it and you're in.
            </p>
            <p className="mt-3 text-xs text-muted">
              The link works from your inbox and expires in 30 minutes.
            </p>
            <div className="mt-6 text-xs text-muted">
              Wrong email?{" "}
              <button
                onClick={() => setSentTo(null)}
                className="font-semibold text-indigo hover:underline"
              >
                Start over
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <Pill accent="indigo">For pros</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl tracking-tight">Start free</h1>
          <p className="mt-2 text-sm text-muted">
            No password. Two fields to start.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                autoComplete="given-name"
                autoFocus
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canContinue && !submitting) void sendMagicLink();
                }}
              />
            </Field>
            <Field label="Email" hint="We'll email you a one-tap sign-in link.">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                autoComplete="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canContinue && !submitting) void sendMagicLink();
                }}
              />
            </Field>
            {err && (
              <div role="alert" className="text-sm text-red bg-redbg rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!canContinue}
              loading={submitting}
              onClick={sendMagicLink}
            >
              Continue
            </Btn>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
              <div className="h-px flex-1 bg-line" />
              or
              <div className="h-px flex-1 bg-line" />
            </div>
            <GoogleSignupButton busy={googleBusy} onClick={continueWithGoogle} />
            <p className="text-center text-xs text-muted">
              Already a pro?{" "}
              <Link to="/login" className="font-semibold text-indigo hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GoogleSignupButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
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
