import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X, Check } from "lucide-react";
import { Btn, Field, Input, PageLoader, PhoneInput, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, TRADES, isGoogleUrl, proTrades } from "@/lib/hb";
import { Logo, TradeIcon } from "@/components/svg";
import { GoogleConnect } from "@/components/google-connect";
import { startStripeOnboarding } from "@/lib/stripe-connect";
import type { ProRow } from "@/components/pro-shell";

const STEP_KEYS = ["business", "trade", "service_area", "phone", "payments", "google"] as const;
type StepKey = (typeof STEP_KEYS)[number];

type SetupSearch = { step?: StepKey };

export const Route = createFileRoute("/pro/setup")({
  head: () => ({ meta: [{ title: "Set up your business - HomesBrain" }] }),
  validateSearch: (raw: Record<string, unknown>): SetupSearch => {
    const s = raw.step;
    return { step: STEP_KEYS.includes(s as StepKey) ? (s as StepKey) : undefined };
  },
  component: ProSetupWizard,
});

function ProSetupWizard() {
  const navigate = useNavigate();
  const { step: initialStep } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [pro, setPro] = useState<ProRow | null>(null);

  const [business, setBusiness] = useState("");
  const [trade, setTrade] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [stripeConnecting, setStripeConnecting] = useState(false);

  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: p } = await supabase
        .from("pros")
        .select(
          "id,business,owner_first_name,trade,service_area,logo,google_place_id,google_rating,plan,phone,stripe_charges_enabled",
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!p) {
        navigate({ to: "/pro/signup" });
        return;
      }
      setProId(p.id);
      setPro(p as unknown as ProRow);
      setBusiness((p.business ?? "").trim());
      setTrade((p.trade ?? "").trim());
      setArea((p.service_area ?? "").trim());
      setPhone(((p as { phone?: string | null }).phone ?? "").trim());

      // Pick first incomplete step, or the requested step.
      const done: Record<StepKey, boolean> = {
        business: !!p.business?.trim(),
        trade: !!p.trade?.trim(),
        service_area: !!p.service_area?.trim(),
        phone: !!(p as { phone?: string | null }).phone?.trim(),
        payments: !!(p as { stripe_charges_enabled?: boolean }).stripe_charges_enabled,
        google: isGoogleUrl(p.google_place_id),
      };
      let idx = 0;
      if (initialStep) {
        idx = STEP_KEYS.indexOf(initialStep);
      } else {
        const firstIncomplete = STEP_KEYS.findIndex((k) => !done[k]);
        idx = firstIncomplete === -1 ? 0 : firstIncomplete;
      }
      setStepIdx(Math.max(0, idx));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, initialStep]);

  const step = STEP_KEYS[stepIdx];
  const isLast = stepIdx === STEP_KEYS.length - 1;

  const canAdvance = useMemo(() => {
    switch (step) {
      case "business":
        return business.trim().length > 1;
      case "trade":
        return trade.length > 0;
      case "service_area":
        return area.trim().length > 0;
      case "phone":
        return phone.trim().length >= 7;
      case "payments":
      case "google":
        return true; // skippable
      default:
        return true;
    }
  }, [step, business, trade, area, phone]);

  async function persistCurrent(): Promise<boolean> {
    if (!proId) return false;
    setSaving(true);
    setErr(null);
    let error: { message: string } | null = null;
    switch (step) {
      case "business": {
        ({ error } = await supabase
          .from("pros")
          .update({ business: business.trim() })
          .eq("id", proId));
        break;
      }
      case "trade": {
        ({ error } = await supabase.from("pros").update({ trade }).eq("id", proId));
        break;
      }
      case "service_area": {
        ({ error } = await supabase
          .from("pros")
          .update({ service_area: area.trim() })
          .eq("id", proId));
        break;
      }
      case "phone": {
        ({ error } = await supabase
          .from("pros")
          .update({ phone: phone.trim() })
          .eq("id", proId));
        break;
      }
      default:
        break;
    }
    setSaving(false);
    if (error) {
      setErr(error.message);
      return false;
    }
    return true;
  }

  async function goNext() {
    if (!canAdvance) return;
    const ok = await persistCurrent();
    if (!ok) return;
    if (isLast) {
      await logEvent(`pro:${proId}`, "pro_setup_completed", {});
      navigate({ to: "/pro" });
      return;
    }
    setStepIdx((i) => Math.min(STEP_KEYS.length - 1, i + 1));
  }

  function goBack() {
    setStepIdx((i) => Math.max(0, i - 1));
  }

  function skip() {
    if (isLast) {
      navigate({ to: "/pro" });
    } else {
      setStepIdx((i) => Math.min(STEP_KEYS.length - 1, i + 1));
    }
  }

  async function connectStripe() {
    if (!proId) return;
    setStripeConnecting(true);
    setErr(null);
    try {
      const { url } = await startStripeOnboarding(proId);
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start Stripe.");
      setStripeConnecting(false);
    }
  }

  if (loading || !pro) return <PageLoader label="Loading your account" />;

  return (
    <div className="font-app min-h-dvh bg-soft flex flex-col">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="indigo">
              Step {stepIdx + 1} of {STEP_KEYS.length}
            </Pill>
            <button
              type="button"
              onClick={() => navigate({ to: "/pro" })}
              className="pressable p-2 rounded-full text-muted hover:text-ink hover:bg-paper"
              aria-label="Close setup"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Dots */}
        <div className="mx-auto max-w-3xl px-5 pb-3 flex items-center gap-1.5">
          {STEP_KEYS.map((k, i) => (
            <div
              key={k}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIdx ? "bg-indigo" : "bg-line"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-5 py-10 sm:py-16">
        <StepView
          step={step}
          business={business}
          setBusiness={setBusiness}
          trade={trade}
          setTrade={setTrade}
          area={area}
          setArea={setArea}
          phone={phone}
          setPhone={setPhone}
          proId={proId!}
          pro={pro}
          onProUpdated={(patch) => setPro((p) => (p ? { ...p, ...patch } : p))}
          stripeConnecting={stripeConnecting}
          connectStripe={connectStripe}
        />

        {err && (
          <div role="alert" className="mt-4 text-sm text-red bg-redbg rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        {(step === "payments" || step === "google") && !isLast && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={skip}
              className="text-sm font-semibold text-muted hover:text-ink underline underline-offset-2"
            >
              Skip for now →
            </button>
          </div>
        )}
        {(step === "payments" || step === "google") && isLast && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={skip}
              className="text-sm font-semibold text-muted hover:text-ink underline underline-offset-2"
            >
              Skip and finish →
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

function StepView(props: {
  step: StepKey;
  business: string;
  setBusiness: (v: string) => void;
  trade: string;
  setTrade: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  proId: string;
  pro: ProRow;
  onProUpdated: (patch: Partial<ProRow>) => void;
  stripeConnecting: boolean;
  connectStripe: () => void;
}) {
  const {
    step,
    business,
    setBusiness,
    trade,
    setTrade,
    area,
    setArea,
    phone,
    setPhone,
    proId,
    pro,
    onProUpdated,
    stripeConnecting,
    connectStripe,
  } = props;

  if (step === "business") {
    return (
      <StepFrame
        title="What's your business called?"
        sub="This is how you'll appear on every service record you send."
      >
        <Field label="Business name">
          <Input
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Aqua Works"
            className="!text-xl !py-4"
            autoFocus
          />
        </Field>
      </StepFrame>
    );
  }

  if (step === "trade") {
    return (
      <StepFrame title="What do you do?" sub="Pick your trade so we tailor forms and reminders.">
        <div className="grid grid-cols-2 gap-3">
          {TRADES.map((t) => {
            const selected = trade === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrade(t.id)}
                aria-pressed={selected}
                className={`pressable text-left rounded-2xl border px-4 py-5 text-base font-semibold transition-all duration-200 flex items-center gap-3 ${
                  selected
                    ? "border-indigo bg-indigobg text-indigo shadow-sm"
                    : "border-line bg-white text-ink hover:bg-soft hover:border-ink/20"
                }`}
              >
                <TradeIcon
                  trade={t.id}
                  size={24}
                  className={selected ? "text-indigo" : "text-muted"}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </StepFrame>
    );
  }

  if (step === "service_area") {
    return (
      <StepFrame title="Where do you work?" sub="City or ZIP is fine.">
        <Field label="Service area">
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Austin, TX"
            className="!text-xl !py-4"
            autoFocus
          />
        </Field>
      </StepFrame>
    );
  }

  if (step === "phone") {
    return (
      <StepFrame title="Your contact number" sub="Homeowners can reach you back on this.">
        <Field label="Contact phone">
          <PhoneInput
            value={phone}
            onChange={(v) => setPhone(v)}
            className="!text-xl !py-4"
            autoFocus
          />
        </Field>
      </StepFrame>
    );
  }

  if (step === "payments") {
    const connected = !!(pro as unknown as { stripe_charges_enabled?: boolean })
      .stripe_charges_enabled;
    return (
      <StepFrame title="Get paid" sub="Get paid through HomesBrain, powered by Stripe.">
        {connected ? (
          <div className="rounded-2xl border border-line bg-white p-5 text-center">
            <div className="inline-flex items-center gap-2 text-indigo font-semibold">
              <Check size={18} /> Payments connected
            </div>
          </div>
        ) : (
          <Btn
            variant="indigo"
            size="lg"
            className="w-full h-14 text-base"
            loading={stripeConnecting}
            onClick={connectStripe}
          >
            Connect Stripe
          </Btn>
        )}
      </StepFrame>
    );
  }

  if (step === "google") {
    return (
      <StepFrame
        title="Connect Google Business"
        sub="Route review asks to your Google page."
      >
        <div className="rounded-2xl border border-line bg-white p-4">
          <GoogleConnect proId={proId} pro={pro} onUpdated={onProUpdated} />
        </div>
      </StepFrame>
    );
  }

  return null;
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
