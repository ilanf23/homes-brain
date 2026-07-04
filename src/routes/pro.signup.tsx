import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Input, Pill, Avatar, StepBar } from "@/lib/ui";
import { TRADES, logEvent } from "@/lib/hb";
import { supabase } from "@/integrations/supabase/client";
import { setSession } from "@/lib/session";
import { Logo, TradeIcon, ShieldCheck } from "@/components/svg";

export const Route = createFileRoute("/pro/signup")({
  head: () => ({ meta: [{ title: "Start free — HomesBrain for pros" }] }),
  component: ProSignup,
});

// "Verify" step parked until real OTP ships — see OtpBoxes note in @/lib/ui.
type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ["Start", "Business", "Google", "Plan"];

function ProSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [business, setBusiness] = useState("");
  const [contact, setContact] = useState("");
  const [trade, setTrade] = useState<string>("water_treatment");
  const [area, setArea] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);

  async function finish() {
    setSubmitting(true);
    setErr(null);
    const isEmail = contact.includes("@");
    const { data, error } = await supabase
      .from("pros")
      .insert({
        business,
        trade,
        service_area: area,
        email: isEmail ? contact : null,
        phone: isEmail ? null : contact,
        google_place_id: googleConnected ? "demo_place_id" : null,
        google_rating: googleConnected ? 4.8 : null,
        plan: "free",
      })
      .select("id")
      .single();
    if (error || !data) {
      setErr(error?.message ?? "Could not create account");
      setSubmitting(false);
      return;
    }
    setSession({ role: "pro", proId: data.id });
    // Referral attribution: /pro/signup?ref=<proId> tags the signup for the referrer.
    const ref = new URLSearchParams(window.location.search).get("ref");
    await logEvent(`pro:${data.id}`, "pro_signed_up", {
      trade,
      business,
      ...(ref ? { ref } : {}),
    });
    navigate({ to: "/pro" });
  }

  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="teal">For pros</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="anim-fade-up mb-8">
          <StepBar steps={STEP_LABELS} current={step - 1} accent="teal" />
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
              {step === 1 && "No credit card. 60 seconds."}
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
                <Field label="Email or phone" hint="You'll use this to log in.">
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="you@business.com or 555-555-1234"
                  />
                </Field>
                <Btn
                  variant="teal"
                  size="lg"
                  className="w-full"
                  disabled={!business || !contact}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Btn>
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
                            ? "border-teal bg-tealbg text-teal shadow-sm"
                            : "border-line bg-paper text-ink hover:bg-soft hover:border-ink/20"
                        }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <TradeIcon
                          trade={t.id}
                          size={18}
                          className={trade === t.id ? "text-teal" : "text-muted"}
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
                    <Avatar name={business || "?"} accent="teal" />
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
                    variant="teal"
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
                  <div className="anim-scale-in rounded-xl border border-teal/30 bg-tealbg/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={22} className="text-teal" />
                      <div>
                        <div className="font-semibold text-ink">Google Business connected</div>
                        <div className="text-xs text-muted tnum">Rating 4.8 ★ · 42 reviews</div>
                      </div>
                    </div>
                    <Pill accent="teal">Connected</Pill>
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
                    variant={googleConnected ? "teal" : "secondary"}
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
                <div className="anim-fade-up rounded-xl border-2 border-teal bg-tealbg p-4 liftable">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-teal">Free</div>
                    <Pill accent="teal">Selected</Pill>
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
                  variant="teal"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                  onClick={finish}
                >
                  {submitting ? "Creating…" : "Create account"}
                </Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
