import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo, TradeIcon } from "@/components/svg";
import type { TradeIconName } from "@/components/svg";

/* Split-screen shell for the auth pages (/login, /reset-password).
   Left: logo top-left, form column vertically centered, muted footer line.
   Right (lg and up): warm indigo panel with a headline and a home's ledger
   filling in, so the auth pages read as the product's front door, not an
   app screen. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="font-app min-h-dvh bg-soft text-ink lg:grid lg:grid-cols-[1fr_minmax(0,46%)]">
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
        className="hidden lg:flex flex-col justify-center border-l border-line px-12 py-16 xl:px-16"
        style={{
          background:
            "radial-gradient(90% 65% at 15% 0%, rgba(255,255,255,0.85), transparent 60%), radial-gradient(90% 70% at 100% 100%, rgba(71,63,176,0.16), transparent 65%), var(--indigobg)",
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="eyebrow text-indigo">The home ledger</div>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-tight text-ink">
            A home that
            <br />
            remembers itself.
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            Every visit from your pros becomes a verified record your home keeps for good.
          </p>
          <LedgerStack />
        </div>
      </aside>
    </div>
  );
}

/* Static mock of a home's service ledger filling in: two verified visits
   and the next one due. Decorative only (the aside is aria-hidden). */
function LedgerStack() {
  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-indigodark">
          128 Alder Lane
        </span>
        <span className="text-xs text-muted">3 records</span>
      </div>
      <ul className="space-y-3">
        <LedgerEntry
          trade="hvac"
          title="HVAC tune-up"
          by="Cool Air Mechanical"
          date="Mar 14, 2026"
          done
        />
        <LedgerEntry
          trade="water_treatment"
          title="Whole-home filter replacement"
          by="AquaPure Water Co."
          date="Jun 2, 2026"
          done
        />
        <LedgerEntry
          trade="water_treatment"
          title="Water softener service"
          by="Next visit"
          date="Oct 12, 2026"
        />
      </ul>
    </div>
  );
}

function LedgerEntry({
  trade,
  title,
  by,
  date,
  done = false,
}: {
  trade: TradeIconName;
  title: string;
  by: string;
  date: string;
  done?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${
        done
          ? "bg-paper shadow-[0_1px_2px_rgba(22,22,15,0.05),0_16px_32px_-18px_rgba(42,36,112,0.35)]"
          : "border border-dashed border-indigo/35 bg-paper/55"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          done ? "bg-indigobg text-indigo" : "bg-transparent text-indigo/70"
        }`}
      >
        <TradeIcon trade={trade} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[15px] font-bold text-ink">{title}</span>
          {done ? (
            <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0 text-indigo">
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
        <div className="mt-0.5 flex items-center justify-between gap-3 text-[13px] text-muted">
          <span className="truncate">{by}</span>
          <span className="tnum shrink-0">{date}</span>
        </div>
      </div>
    </li>
  );
}
