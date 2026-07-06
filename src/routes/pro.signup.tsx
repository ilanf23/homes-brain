import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Input, Pill, Avatar, StepBar } from "@/lib/ui";
import { TRADES, logEvent } from "@/lib/hb";
import { supabase } from "@/integrations/supabase/client";
import { Logo, TradeIcon, ShieldCheck } from "@/components/svg";

export const Route = createFileRoute("/pro/signup")({
  head: () => ({ meta: [{ title: "Start free - HomesBrain for pros" }] }),
  component: ProSignup,
});

// Phone-verify UI is present but inert until A2P 10DLC (Twilio) is set up.
// Email + password + Supabase email verification is the real auth for v0.
type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ["Start", "Business", "Google", "Plan"];

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function ProSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [trade, setTrade] = useState<string>("water_treatment");
  const [area, setArea] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);

  const step1Valid =
    business.trim().length > 1 &&
    isValidEmail(email.trim()) &&
    password.length >= 8 &&
    password === confirmPw;

  async function finish() {
    setSubmitting(true);
    setErr(null);
    const ref = new URLSearchParams(window.location.search).get("ref");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: "pro",
          business: business.trim(),
          trade,
          service_area: area.trim(),
          phone: phone.trim() || null,
          google_place_id: googleConnected ? "demo_place_id" : null,
          google_rating: googleConnected ? "4.8" : null,
          ref: ref ?? null,
        },
      },
    });
    if (error) {
      setErr(error.message);
      setSubmitting(false);
      return;
    }
    if (data.user) {
      await logEvent(`pro:${data.user.id}`, "pro_signed_up", {
        trade,
        business,
        ...(ref ? { ref } : {}),
      });
    }
    setSentTo(email.trim());
    setSubmitting(false);
  }

  if (sentTo) {
    return (
      <div className="font-app min-h-dvh bg-soft">
        <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
          <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
            </Link>
            <Pill accent="indigo">Verify email</Pill>
          </div>
        </header>
        <div className="mx-auto max-w-md px-5 py-16">
          <Card className="text-center">
            <ShieldCheck size={40} className="mx-auto text-indigo" />
            <h1 className="mt-4 text-2xl tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-muted">
              We sent a verification link to <span className="font-semibold text-ink">{sentTo}</span>.
              Click it to finish setting up your account.
            </p>
            <div className="mt-6 text-xs text-muted">
              Wrong email?{" "}
              <button
                onClick={() => {
                  setSentTo(null);
                  setStep(1);
                }}
                className="font-semibold text-indigo hover:underline"
              >
                Start over
              </button>
            </div>
            <div className="mt-4">
              <Link to="/login" className="text-sm font-semibold text-indigo hover:underline">
                Already verified? Log in
              </Link>
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
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">For pros</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="anim-fade-up mb-8">
          <StepBar steps={STEP_LABELS} current={step - 1} accent="indigo" />
        </div>

        <div key={step} className="anim-fade-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl tracking-tight">
              {step === 1 && "Start free"}
              {step === 2 && "Your business"}
              {step === 3 && "Connect Google"}
              {step === 4 && "Pick a plan"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {step === 1 && "No credit card. Real email verification."}
              {step === 2 && "Just the basics."}
              {step === 3 && "Route reviews to your profile, show your rating."}
              {step === 4 && "Free is free, forever."}
            </p>
          </div>

          <Card>
            {step === 1 && (
              <div className="space-y-4">
                <Field label="Business name">
                  <Input
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                    placeholder="Aqua Works"
                    autoFocus
                  />
                </Field>
                <Field label="Email" hint="You'll use this to log in.">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Password" hint="At least 8 characters.">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8+ characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm password">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  {confirmPw && confirmPw !== password && (
                    <div className="mt-1 text-xs text-red">Passwords don't match.</div>
                  )}
                </Field>
                <Field label="Phone (optional)" hint="SMS verification coming soon.">
                  <div className="flex gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="555-555-1234"
                      autoComplete="tel"
                      className="flex-1"
                    />
                    <Btn variant="secondary" disabled title="SMS verification coming soon">
                      Verify phone
                    </Btn>
                  </div>
                </Field>
                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Btn>
                <div className="text-center text-xs text-muted">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-indigo hover:underline">
                    Log in
                  </Link>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-ink mb-2">Trade</div>
                  <div className="grid grid-cols-2 gap-2">
                    {TRADES.map((t, i) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTrade(t.id)}
                        aria-pressed={trade === t.id}
                        className={`pressable anim-fade-up text-left rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                          trade === t.id
                            ? "border-indigo bg-indigobg text-indigo shadow-sm"
                            : "border-line bg-paper text-ink hover:bg-soft hover:border-ink/20"
                        }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <TradeIcon
                          trade={t.id}
                          size={18}
                          className={trade === t.id ? "text-indigo" : "text-muted"}
                        />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Service area" hint="City or ZIP.">
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Austin, TX"
                  />
                </Field>
                <Field label="Logo">
                  <div className="flex items-center gap-3">
                    <Avatar name={business || "?"} accent="indigo" />
                    <div className="text-xs text-muted">
                      Using initials for now. You can upload later.
                    </div>
                  </div>
                </Field>
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Btn>
                  <Btn
                    variant="indigo"
                    size="lg"
                    className="flex-1"
                    disabled={!area}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </Btn>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-indigobg p-4">
                  <Pill accent="indigo">Recommended</Pill>
                  <div className="mt-2 text-sm text-ink">
                    Connect Google to route review asks to your profile and show your rating on
                    every record.
                  </div>
                </div>
                {googleConnected ? (
                  <div className="anim-scale-in rounded-xl border border-indigo/30 bg-indigobg/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={22} className="text-indigo" />
                      <div>
                        <div className="font-semibold text-ink">Google Business connected</div>
                        <div className="text-xs text-muted tnum">Rating 4.8 ★ · 42 reviews</div>
                      </div>
                    </div>
                    <Pill accent="indigo">Connected</Pill>
                  </div>
                ) : (
                  <Btn
                    variant="indigo"
                    size="lg"
                    className="w-full"
                    onClick={() => setGoogleConnected(true)}
                  >
                    Connect Google
                  </Btn>
                )}
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => setStep(2)}>
                    Back
                  </Btn>
                  <Btn
                    variant={googleConnected ? "indigo" : "secondary"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep(4)}
                  >
                    {googleConnected ? "Continue" : "Skip for now"}
                  </Btn>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="anim-fade-up rounded-xl border-2 border-indigo bg-indigobg p-4 liftable">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-indigo">Free</div>
                    <Pill accent="indigo">Selected</Pill>
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-ink font-display tnum">$0</div>
                  <div className="text-sm text-muted mt-1">
                    Unlimited records. No card required.
                  </div>
                </div>
                <div className="anim-fade-up d-1 rounded-xl border border-line bg-paper p-4 opacity-70">
                  <div className="font-extrabold text-ink">Pro</div>
                  <div className="mt-1 text-2xl font-semibold text-ink font-display">later</div>
                  <div className="text-sm text-muted mt-1">More on this once you're rolling.</div>
                </div>
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
                  loading={submitting}
                  onClick={finish}
                >
                  Create account
                </Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
