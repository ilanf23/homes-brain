import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Eyebrow, Field, Input, Pill, Avatar } from "@/lib/ui";
import { TRADES, logEvent } from "@/lib/hb";
import { supabase } from "@/integrations/supabase/client";
import { setSession } from "@/lib/session";

export const Route = createFileRoute("/pro/signup")({
  head: () => ({ meta: [{ title: "Start free — HomesBrain for pros" }] }),
  component: ProSignup,
});

type Step = 1 | 2 | 3 | 4 | 5;

function ProSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [business, setBusiness] = useState("");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
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
    await logEvent(`pro:${data.id}`, "pro_signed_up", { trade });
    navigate({ to: "/pro" });
  }

  return (
    <div className="min-h-screen bg-soft">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-indigo" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <Pill accent="teal">For pros</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="text-center mb-8">
          <Eyebrow accent="teal">Step {step} of 5</Eyebrow>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            {step === 1 && "Start free"}
            {step === 2 && "Verify"}
            {step === 3 && "Your business"}
            {step === 4 && "Connect Google"}
            {step === 5 && "Pick a plan"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {step === 1 && "No credit card. 60 seconds."}
            {step === 2 && `We sent a 4-digit code to ${contact || "you"}.`}
            {step === 3 && "Just the basics."}
            {step === 4 && "Route reviews to your profile, show your rating."}
            {step === 5 && "Free is free, forever."}
          </p>
        </div>

        <Card>
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Business name">
                <Input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Aqua Works" />
              </Field>
              <Field label="Email or phone" hint="We'll text or email a 4-digit code.">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@business.com or 555-555-1234" />
              </Field>
              <Btn variant="teal" size="lg" className="w-full" disabled={!business || !contact} onClick={() => setStep(2)}>
                Send code
              </Btn>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="4-digit code" hint="Demo mode — any 4 digits will work.">
                <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" inputMode="numeric" />
              </Field>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                <Btn variant="teal" size="lg" className="flex-1" disabled={otp.length !== 4} onClick={() => setStep(3)}>
                  Verify
                </Btn>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-ink mb-2">Trade</div>
                <div className="grid grid-cols-2 gap-2">
                  {TRADES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTrade(t.id)}
                      className={`text-left rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        trade === t.id ? "border-teal bg-tealbg text-teal" : "border-line bg-white text-ink hover:bg-soft"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Service area" hint="City or ZIP.">
                <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Austin, TX" />
              </Field>
              <Field label="Logo">
                <div className="flex items-center gap-3">
                  <Avatar name={business || "?"} accent="teal" />
                  <div className="text-xs text-muted">Using initials for now. You can upload later.</div>
                </div>
              </Field>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setStep(2)}>Back</Btn>
                <Btn variant="teal" size="lg" className="flex-1" disabled={!area} onClick={() => setStep(4)}>
                  Continue
                </Btn>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-indigobg p-4">
                <Pill accent="indigo">Recommended</Pill>
                <div className="mt-2 text-sm text-ink">
                  Connect Google to route review asks to your profile and show your rating on every record.
                </div>
              </div>
              {googleConnected ? (
                <div className="rounded-xl border border-line bg-white p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink">Google Business connected</div>
                    <div className="text-xs text-muted">Rating 4.8 ★ · 42 reviews</div>
                  </div>
                  <Pill accent="teal">Connected</Pill>
                </div>
              ) : (
                <Btn variant="indigo" size="lg" className="w-full" onClick={() => setGoogleConnected(true)}>
                  Connect Google
                </Btn>
              )}
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setStep(3)}>Back</Btn>
                <Btn variant={googleConnected ? "teal" : "secondary"} size="lg" className="flex-1" onClick={() => setStep(5)}>
                  {googleConnected ? "Continue" : "Skip for now"}
                </Btn>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-teal bg-tealbg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-teal">Free</div>
                  <Pill accent="teal">Selected</Pill>
                </div>
                <div className="mt-1 text-2xl font-extrabold text-ink">$0</div>
                <div className="text-sm text-muted mt-1">Unlimited records. No card required.</div>
              </div>
              <div className="rounded-xl border border-line bg-white p-4 opacity-70">
                <div className="font-extrabold text-ink">Pro</div>
                <div className="mt-1 text-2xl font-extrabold text-ink">later</div>
                <div className="text-sm text-muted mt-1">More on this once you're rolling.</div>
              </div>
              {err && <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>}
              <Btn variant="teal" size="lg" className="w-full" disabled={submitting} onClick={finish}>
                {submitting ? "Creating…" : "Create account"}
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
