import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/svg";
import { Card, KV, Pill } from "@/lib/ui";

/* Split-screen shell for the auth pages (/login, /reset-password).
   Left: logo top-left, form column vertically centered, muted footer line.
   Right (lg and up): warm indigo panel with a mini record card, so the
   auth pages read as the product's front door, not an app screen. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="font-app min-h-dvh bg-soft text-ink lg:grid lg:grid-cols-[1fr_minmax(0,44%)]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="group inline-flex w-fit items-center gap-2.5">
          <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="text-center text-xs text-muted">
          {footer ?? <span>Free for homeowners. Records stay yours for life.</span>}
        </div>
      </div>
      <aside
        aria-hidden="true"
        className="hidden lg:flex flex-col items-center justify-center gap-8 border-l border-line bg-gradient-to-b from-indigobg via-indigobg to-soft px-10 py-16"
      >
        <MiniRecordCard />
        <div className="max-w-xs text-center">
          <div className="text-xl font-extrabold tracking-tight text-ink">
            A home that remembers itself.
          </div>
          <p className="mt-2 text-sm text-muted">
            Every visit from your pros becomes a verified record your home keeps for good.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* Static mock of a service record, floating slightly tilted on the panel. */
function MiniRecordCard() {
  return (
    <Card className="w-full max-w-xs -rotate-2 shadow-[0_24px_48px_-24px_rgba(42,36,112,0.35)]">
      <Pill accent="indigo">Verified record</Pill>
      <div className="mt-3 text-lg font-extrabold tracking-tight">AquaPure Water Co.</div>
      <div className="mt-0.5 text-sm text-muted">Whole-home filter replacement</div>
      <div className="mt-3">
        <KV k="Next service" v="Oct 12, 2026" />
        <KV k="Serial" v="AP-2231-884" />
      </div>
    </Card>
  );
}
