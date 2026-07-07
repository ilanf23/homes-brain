import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/svg";

/* Split-screen shell for the auth pages (/login, /reset-password).
   Left: logo top-left, form column vertically centered, muted footer line.
   Right (lg and up): warm indigo panel with a ledger timeline, so the
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
        className="hidden lg:flex flex-col items-center justify-center gap-10 border-l border-line bg-gradient-to-b from-indigobg via-indigobg to-soft px-10 py-16"
      >
        <LedgerTimeline />
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

/* Static mock of a home's service ledger filling in: two verified visits
   and the next one due, on a connected timeline. */
function LedgerTimeline() {
  return (
    <div className="w-full max-w-sm">
      <div className="eyebrow text-indigo">128 Alder Lane</div>
      <div className="mt-1 text-sm text-muted">The ledger so far</div>
      <div className="relative mt-5">
        <div className="absolute bottom-6 left-[5px] top-2 w-px bg-indigo/25" />
        <ul className="space-y-4">
          <LedgerEntry title="HVAC tune-up" by="Cool Air Mechanical" date="Mar 14, 2026" done />
          <LedgerEntry
            title="Whole-home filter replacement"
            by="AquaPure Water Co."
            date="Jun 2, 2026"
            done
          />
          <LedgerEntry title="Water softener service" by="Next visit" date="Oct 12, 2026" />
        </ul>
      </div>
    </div>
  );
}

function LedgerEntry({
  title,
  by,
  date,
  done = false,
}: {
  title: string;
  by: string;
  date: string;
  done?: boolean;
}) {
  return (
    <li className="relative pl-7">
      <span
        className={`absolute left-0 top-4 h-[11px] w-[11px] rounded-full border-2 ${
          done ? "border-indigo bg-indigo" : "border-indigo/40 bg-paper"
        }`}
      />
      <div className="rounded-2xl border border-line bg-paper px-4 py-3 shadow-[0_12px_28px_-20px_rgba(42,36,112,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm font-bold text-ink">{title}</div>
          {done ? (
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0 text-indigo">
              <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
              <path
                d="m4.8 8.3 2.1 2.1 4.3-4.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-indigodark">
              Upcoming
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted">
          <span className="truncate">{by}</span>
          <span className="tnum shrink-0">{date}</span>
        </div>
      </div>
    </li>
  );
}
