import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Btn, Card, Eyebrow, Pill, Toast, Skeleton } from "@/lib/ui";
import { ProShell, useProGuard, ProPageHead } from "@/components/pro-shell";
import { DemoNotice } from "@/components/plan-lock";
import {
  fetchPlans,
  fetchPlanFeatures,
  mockSetPlan,
  useCurrentPlan,
  DEMO_NOTICE,
  DEMO_SHORT,
  type Plan,
  type PlanFeature,
} from "@/lib/plan";

export const Route = createFileRoute("/pro/plan")({
  head: () => ({
    meta: [{ title: "Plan — HomesBrain" }],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { pro, setPro } = useProGuard();
  const navigate = useNavigate();
  const { plan, isPro, reload } = useCurrentPlan();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [features, setFeatures] = useState<PlanFeature[] | null>(null);
  const [busy, setBusy] = useState<"pro" | "free" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, f] = await Promise.all([fetchPlans(), fetchPlanFeatures()]);
      setPlans(p);
      setFeatures(f);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function switchTo(target: "pro" | "free") {
    setBusy(target);
    try {
      await mockSetPlan(target);
      await reload();
      if (pro) setPro({ ...pro, plan: target });
      setToast(
        target === "pro"
          ? "You're on Pro (demo). No payment was taken — you won't be charged."
          : "Switched back to Free (demo). No payment involved.",
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't update plan.");
    } finally {
      setBusy(null);
    }
  }

  const freePlan = plans?.find((p) => p.id === "free");
  const proPlan = plans?.find((p) => p.id === "pro");
  const freeFeatures = features?.filter((f) => f.tier === "free") ?? [];
  const proFeatures = features?.filter((f) => f.tier === "pro") ?? [];

  return (
    <ProShell pro={pro} active="settings">
      <button
        onClick={() => navigate({ to: "/pro/settings" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to settings
      </button>

      <ProPageHead
        eyebrow="Plan"
        title="Choose your plan"
        sub="Free forever, or unlock the money features with Pro."
      />

      {/* Big demo banner */}
      <div className="mt-2 mb-6 rounded-2xl border border-indigo/25 bg-indigobg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Pill accent="indigo">Demo mode</Pill>
          <div className="text-sm text-ink">
            <div className="font-semibold">This is a demo — no payment is collected.</div>
            <div className="text-muted mt-0.5">{DEMO_NOTICE}</div>
          </div>
        </div>
      </div>

      {!plans || !features ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            plan={freePlan!}
            features={freeFeatures}
            currentPlan={plan}
            highlight={false}
            action={
              plan === "free" ? (
                <Pill accent="indigo">Your plan</Pill>
              ) : (
                <Btn
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  loading={busy === "free"}
                  onClick={() => switchTo("free")}
                >
                  Switch back to Free
                </Btn>
              )
            }
          />

          <PlanCard
            plan={proPlan!}
            features={[...freeFeatures, ...proFeatures]}
            currentPlan={plan}
            highlight
            action={
              isPro ? (
                <div className="space-y-2">
                  <Pill accent="indigo">Your plan — demo (not billed)</Pill>
                </div>
              ) : (
                <Btn
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={busy === "pro"}
                  onClick={() => switchTo("pro")}
                >
                  Upgrade to Pro — ${proPlan?.price_monthly}/mo ({DEMO_SHORT})
                </Btn>
              )
            }
          />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        {DEMO_NOTICE} No Stripe subscription is created; this is a UI switch only.
      </p>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}

function PlanCard({
  plan,
  features,
  currentPlan,
  highlight,
  action,
}: {
  plan: Plan;
  features: PlanFeature[];
  currentPlan: string | null;
  highlight: boolean;
  action: React.ReactNode;
}) {
  const isCurrent = currentPlan === plan.id;
  return (
    <Card
      className={
        highlight
          ? "border-indigo/40 ring-2 ring-indigo/15"
          : ""
      }
    >
      <div className="flex items-center justify-between">
        <Eyebrow accent={highlight ? "indigo" : "ink"}>{plan.name}</Eyebrow>
        {isCurrent && <Pill accent="indigo">Current</Pill>}
      </div>
      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-extrabold tracking-tight text-ink tnum">
          ${plan.price_monthly}
        </span>
        <span className="text-sm text-muted">/mo</span>
        {plan.id === "pro" && (
          <span className="text-sm text-muted line-through tnum">$59</span>
        )}
        {plan.price_monthly > 0 && (
          <Pill accent="indigo">{DEMO_SHORT}</Pill>
        )}
      </div>
      {plan.id === "pro" && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-coralbg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-coral-dark">
          Founding · locked for life
        </div>
      )}
      {plan.tagline && (
        <p className="mt-2 text-sm text-muted">{plan.tagline}</p>
      )}
      {plan.id === "pro" && (
        <p className="mt-1 text-xs text-muted">
          Founding price for the first 1,000 pros. $59/mo after. Reviews are always free.
        </p>
      )}
      <ul className="mt-4 space-y-2.5">
        {features.map((f) => (
          <li key={f.id} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigobg text-indigo">
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <div className="font-semibold text-ink">{f.label}</div>
              {f.description && (
                <div className="text-xs text-muted">{f.description}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
      {plan.price_monthly > 0 && (
        <div className="mt-3 text-center text-xs text-muted">
          {DEMO_NOTICE}
        </div>
      )}
    </Card>
  );
}
