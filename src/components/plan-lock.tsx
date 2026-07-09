import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { DEMO_SHORT } from "@/lib/plan";

/** Small inline demo notice — repeat wherever price/upgrade appears. */
export function DemoNotice({ className = "" }: { className?: string }) {
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
