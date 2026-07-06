import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { Logo } from "@/components/svg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - HomesBrain" }] }),
  component: Login,
});

type Tab = "pro" | "homeowner";

function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("pro");

  // Pro state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState<string | null>(null);

  // Homeowner state - real magic link auth
  const [hoEmail, setHoEmail] = useState("");
  const [hoErr, setHoErr] = useState<string | null>(null);
  const [hoBusy, setHoBusy] = useState(false);
  const [hoSent, setHoSent] = useState<string | null>(null);

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
    setForgotSent(null);
    setErr(null);
    if (!email.trim()) {
      setErr("Enter your email above first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setForgotSent(email.trim());
  }

  async function homeownerLogin() {
    setHoBusy(true);
    setHoErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: hoEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      setHoErr(error.message);
      setHoBusy(false);
      return;
    }
    setHoSent(hoEmail.trim());
    setHoBusy(false);
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Log in</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-6">
          <h1 className="text-3xl tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            {tab === "pro"
              ? "Sign in with your email and password."
              : "We'll email you a one-tap sign-in link."}
          </p>
        </div>

        <div className="mb-4 flex gap-1 rounded-full bg-paper border border-line p-1">
          <button
            type="button"
            onClick={() => setTab("pro")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "pro" ? "bg-indigobg text-indigo" : "text-muted hover:text-ink"
            }`}
          >
            I'm a pro
          </button>
          <button
            type="button"
            onClick={() => setTab("homeowner")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "homeowner" ? "bg-indigobg text-indigo" : "text-muted hover:text-ink"
            }`}
          >
            I'm a homeowner
          </button>
        </div>

        <Card>
          {tab === "pro" && !forgotOpen && (
            <div className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                  autoFocus
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email && password && !busy) proLogin();
                  }}
                />
              </Field>
              {err && (
                <div
                  role="alert"
                  className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2"
                >
                  {err}
                </div>
              )}
              <Btn
                variant="indigo"
                size="lg"
                className="w-full"
                disabled={!email || !password || busy}
                onClick={proLogin}
              >
                {busy ? "Signing in…" : "Sign in"}
              </Btn>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setErr(null);
                  }}
                  className="font-semibold text-indigo hover:underline"
                >
                  Forgot password?
                </button>
                <Link to="/pro/signup" className="font-semibold text-indigo hover:underline">
                  Start free
                </Link>
              </div>
            </div>
          )}

          {tab === "pro" && forgotOpen && (
            <div className="space-y-4">
              <Field label="Email" hint="We'll send a reset link.">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoFocus
                />
              </Field>
              {err && (
                <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>
              )}
              {forgotSent && (
                <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
                  Reset link sent to <span className="font-semibold">{forgotSent}</span>.
                </div>
              )}
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setForgotOpen(false)}>
                  Back
                </Btn>
                <Btn variant="indigo" className="flex-1" onClick={sendReset}>
                  Send reset link
                </Btn>
              </div>
            </div>
          )}

          {tab === "homeowner" && (
            <div className="space-y-4">
              {hoSent ? (
                <div className="space-y-3">
                  <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
                    Check your email at <span className="font-semibold">{hoSent}</span> and click
                    the link to sign in.
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo hover:underline"
                    onClick={() => setHoSent(null)}
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={hoEmail}
                      onChange={(e) => setHoEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && hoEmail.trim() && !hoBusy) homeownerLogin();
                      }}
                    />
                  </Field>
                  {hoErr && (
                    <div
                      role="alert"
                      className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2"
                    >
                      {hoErr}
                    </div>
                  )}
                  <Btn
                    variant="indigo"
                    size="lg"
                    className="w-full"
                    disabled={!hoEmail.trim() || hoBusy}
                    onClick={homeownerLogin}
                  >
                    {hoBusy ? "Sending…" : "Email me a sign-in link"}
                  </Btn>
                  <div className="text-center text-xs text-muted">
                    New homeowner?{" "}
                    <Link to="/home/signup" className="font-semibold text-indigo hover:underline">
                      Start free
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
