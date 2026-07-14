import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { ALL_FEATURES_FREE, DEMO_SHORT } from "@/lib/plan";

/** Small inline demo notice — repeat wherever price/upgrade appears. */
export function DemoNotice({ className = "" }: { className?: string }) {
  if (ALL_FEATURES_FREE) return null;
  return (
    <div
      className={`rounded-xl border border-indigo/20 bg-indigobg text-indigo px-3 py-2 text-xs font-semibold flex items-center gap-2 ${className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo" />
      Demo — you won't be charged. No card required. Payments come later.
    </div>
  );
}

/** Locked-feature upsell card. Use to wrap Pro-only pages/sections. */
export function PlanLock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  if (ALL_FEATURES_FREE) return null;
  return (
    <Card className="max-w-lg mx-auto text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigobg text-indigo mb-4">
        <Lock size={22} />
      </div>
      <Eyebrow accent="indigo">Pro feature</Eyebrow>
      <h2 className="mt-2 text-2xl font-extrabold text-ink tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {children}
      <div className="mt-5 flex flex-col gap-3">
        <Link to="/pro/plan">
          <Btn variant="primary" size="lg" className="w-full">
            Upgrade to Pro — $19/mo ({DEMO_SHORT})
          </Btn>
        </Link>
        <Pill accent="indigo">Demo — no charge. No card required.</Pill>
      </div>
    </Card>
  );
}

/** Compact locked upsell for gating a single widget inline on a dashboard. */
export function PlanLockCompact({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={`anim-fade-up ${className}`}>
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigobg text-indigo">
          <Lock size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Eyebrow accent="indigo">Pro feature</Eyebrow>
            <Pill accent="indigo">Demo — not charged</Pill>
          </div>
          <div className="mt-1 font-semibold text-ink">{title}</div>
          <p className="text-sm text-muted mt-0.5">{description}</p>
          <p className="text-xs text-muted mt-1">
            Demo — you won't be charged. No card required.
          </p>
        </div>
        <Link to="/pro/plan" className="shrink-0">
          <Btn variant="primary" size="sm">
            Upgrade to Pro — $19/mo ({DEMO_SHORT})
          </Btn>
        </Link>
      </div>
    </Card>
  );
}

