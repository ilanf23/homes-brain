import { useEffect, useRef, useState } from "react";
import { LogoMark, TradeIcon } from "@/components/svg";

/* CoreLoopScene: the HomesBrain story, played out.
   Full variant syncs to the hero's rotating step: a pro logs a job,
   the branded record travels to a phone, the homeowner claims it
   and the home's timeline grows — all in brand indigo. Compact variant
   is a static pose for small placements. */

export type LoopKey = "pro" | "record" | "owner";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const JOBS = [
  { trade: "plumbing", label: "Water heater flushed" },
  { trade: "hvac", label: "HVAC tuned up" },
  { trade: "water_treatment", label: "Softener serviced" },
  { trade: "appliance", label: "Filter replaced" },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function CoreLoopScene({
  step = null,
  variant = "full",
  pose = "owner",
  celebrate = false,
  className = "",
}: {
  step?: LoopKey | null;
  variant?: "full" | "compact";
  pose?: "pro" | "owner";
  celebrate?: boolean;
  className?: string;
}) {
  if (variant === "compact") {
    return <CompactScene pose={pose} celebrate={celebrate} className={className} />;
  }
  return <FullScene step={step} className={className} />;
}

function FullScene({ step, className }: { step: LoopKey | null; className: string }) {
  const reduced = useReducedMotion();
  const [logged, setLogged] = useState(1);
  const prev = useRef<LoopKey | null>(step);

  // Each time the loop reaches "owner", the home's history gains a row.
  useEffect(() => {
    if (step === "owner" && prev.current !== "owner") setLogged((n) => n + 1);
    prev.current = step;
  }, [step]);

  const effStep: LoopKey | null = reduced ? null : step;
  const count = Math.min(3, logged);
  const rows = Array.from({ length: count }, (_, i) => JOBS[(logged - count + i) % JOBS.length]);
  const showChip = reduced || effStep === "record";
  const showRecordCard = reduced || effStep === "record" || effStep === "owner";
  const showClaim = reduced || effStep === "owner";

  return (
    <div
      className={`cls-scene relative select-none ${className}`}
      style={{ aspectRatio: "460 / 360" }}
      data-step={effStep ?? ""}
      data-static={reduced ? "true" : undefined}
      role="img"
      aria-label="A pro logs a job, a branded service record is sent to the homeowner's phone, and the home's history grows"
    >
      <svg viewBox="0 0 460 360" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* ground */}
        <path d="M20 300h420" {...stroke} stroke="var(--line)" />
        {/* house */}
        <g style={{ color: "var(--ink)" }}>
          <path d="M60 300V164l90-70 90 70v136" {...stroke} strokeWidth={2.25} />
          <path d="M40 180l110-86 110 86" {...stroke} strokeWidth={2.25} />
          <path d="M132 300v-46a18 18 0 0 1 36 0v46" {...stroke} />
          <rect x="84" y="198" width="28" height="28" rx="6" {...stroke} />
          <rect x="188" y="198" width="28" height="28" rx="6" {...stroke} />
        </g>
        {/* dashed arc: house → phone */}
        <path
          d="M230 128C270 60 340 62 376 134"
          {...stroke}
          strokeWidth={1.5}
          strokeDasharray="4 7"
          className="cls-arc dash-flow"
          style={{ color: "var(--indigo)" }}
        />
        {/* phone */}
        <g style={{ color: "var(--ink)" }}>
          <rect x="332" y="140" width="102" height="158" rx="18" {...stroke} strokeWidth={2.25} />
          <path d="M370 154h26" {...stroke} stroke="var(--line)" />
        </g>
        {/* traveling record chip */}
        {showChip && (
          <g key={`chip-${logged}`} className="cls-chip" style={{ transformBox: "fill-box" }}>
            <g transform="translate(158, 112)">
              <rect width="76" height="30" rx="9" fill="var(--bg)" stroke="var(--line)" />
              <rect x="7" y="7" width="16" height="16" rx="5" fill="var(--indigo)" />
              <path d="M15 10.5l6 5h-12Z" fill="#fff" />
              <rect x="10.5" y="15.5" width="9" height="6" rx="1.5" fill="#fff" />
              <rect x="29" y="9" width="36" height="4.5" rx="2.25" fill="var(--ink)" opacity="0.75" />
              <rect x="29" y="17" width="26" height="4.5" rx="2.25" fill="var(--muted)" opacity="0.6" />
            </g>
          </g>
        )}
      </svg>

      {/* Job card — the pro phase */}
      <div
        key={`job-${effStep === "pro" ? logged : "idle"}`}
        className={`cls-job absolute ${effStep === "pro" ? "cls-job-enter" : ""}`}
        style={{ left: "0.5%", top: "46%", width: "40%" }}
      >
        <div className="rounded-2xl border border-line bg-white p-2.5 shadow-sm">
          <span className="inline-block rounded-full bg-indigobg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-indigodark">
            Job logged
          </span>
          <div className="mt-1.5 space-y-1">
            <div className={effStep === "pro" ? "cls-typein" : ""} style={{ animationDelay: "0.5s" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink">
                <TradeIcon trade="plumbing" size={11} className="shrink-0 text-indigo" />
                Water heater — annual flush
              </div>
            </div>
            <div className={effStep === "pro" ? "cls-typein" : ""} style={{ animationDelay: "0.9s" }}>
              <div className="text-[10px] text-muted">Next service · Jan 2027</div>
            </div>
          </div>
          <div className="cls-send mt-2 rounded-full bg-indigo py-1 text-center text-[10px] font-bold text-white">
            Send record →
          </div>
        </div>
      </div>

      {/* Phone screen — record arrives, homeowner claims */}
      <div
        className="absolute flex flex-col gap-1.5"
        style={{ left: "74.5%", top: "45.5%", width: "17.6%" }}
      >
        {showRecordCard ? (
          <div
            key={`rec-${effStep ?? "static"}-${logged}`}
            className={effStep === "record" ? "cls-drop" : ""}
            style={effStep === "record" ? { animationDelay: "2.7s" } : undefined}
          >
            <div className="rounded-lg border border-line bg-white p-1.5 shadow-sm">
              <div className="flex items-center gap-1">
                <LogoMark size={11} className="shrink-0" />
                <span className="text-[8px] font-extrabold leading-none text-ink">
                  Service record
                </span>
              </div>
              <div className="mt-1 text-[7.5px] leading-tight text-muted">
                128 Maple St · Recall check ✓
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 opacity-40">
            <div className="h-1.5 rounded-full bg-line" />
            <div className="h-1.5 w-3/4 rounded-full bg-line" />
          </div>
        )}
        {showClaim && (
          <div key={`claim-${logged}`} className="cls-drop relative" style={{ animationDelay: "0.15s" }}>
            <div className="rounded-full bg-indigo py-1 text-center text-[8px] font-bold text-white">
              Claim your home
            </div>
            <span className="cls-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-indigo" />
          </div>
        )}
      </div>

      {/* Timeline — the history writing itself */}
      <div
        className="absolute flex items-center gap-1"
        style={{ left: "3%", top: "86.5%", width: "64%" }}
      >
        {rows.map((r, i) => (
          <span
            key={`${r.label}-${logged - count + i}`}
            className={`flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-white py-0.5 pl-1.5 pr-2 text-[8.5px] font-semibold text-ink shadow-sm ${
              i === count - 1 && effStep === "owner" ? "cls-stamp" : ""
            }`}
            style={i === count - 1 && effStep === "owner" ? { animationDelay: "0.6s" } : undefined}
          >
            <TradeIcon trade={r.trade} size={10} className="shrink-0 text-indigo" />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Compact static pose: pure SVG so it stays crisp and legible at 7–12rem. */
function CompactScene({
  pose,
  celebrate,
  className,
}: {
  pose: "pro" | "owner";
  celebrate: boolean;
  className: string;
}) {
  return (
    <svg
      viewBox="0 0 300 250"
      className={className}
      role="img"
      aria-label={
        pose === "pro"
          ? "A house with a freshly logged job card"
          : "A claimed home with its service history"
      }
    >
      {/* ground */}
      <path d="M20 210h260" {...stroke} stroke="var(--line)" />
      {/* house */}
      <g style={{ color: "var(--ink)" }}>
        <path d="M85 210v-92l65-50 65 50v92" {...stroke} strokeWidth={2.25} />
        <path d="M70 130l80-62 80 62" {...stroke} strokeWidth={2.25} />
        <path d="M132 210v-32a13 13 0 0 1 26 0v32" {...stroke} />
        <rect x="103" y="146" width="22" height="22" rx="5" {...stroke} />
        <rect x="165" y="146" width="22" height="22" rx="5" {...stroke} />
      </g>

      {pose === "pro" && (
        /* mini job card beside the house */
        <g transform="translate(8, 52)">
          <rect width="82" height="56" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <rect x="8" y="8" width="34" height="10" rx="5" fill="var(--indigobg)" />
          <rect x="13" y="11.5" width="24" height="3" rx="1.5" fill="var(--indigo)" />
          <rect x="8" y="24" width="60" height="4" rx="2" fill="var(--ink)" opacity="0.7" />
          <rect x="8" y="32" width="44" height="4" rx="2" fill="var(--muted)" opacity="0.55" />
          <rect x="8" y="42" width="66" height="9" rx="4.5" fill="var(--indigo)" />
        </g>
      )}

      {pose === "owner" && (
        <>
          {/* claimed check */}
          <g>
            <circle cx="218" cy="88" r="20" fill="var(--indigobg)" />
            <path
              key={celebrate ? "drawn" : "static"}
              d="M209 88l6 6 13-13"
              {...stroke}
              strokeWidth={2.5}
              stroke="var(--indigo)"
              className={celebrate ? "draw-on" : ""}
              strokeDasharray={celebrate ? 28 : undefined}
              strokeDashoffset={celebrate ? 28 : undefined}
            />
          </g>
          {/* two timeline rows under the ground line */}
          <g>
            <rect x="70" y="220" width="160" height="13" rx="6.5" fill="var(--bg)" stroke="var(--line)" />
            <circle cx="80" cy="226.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="224.5" width="90" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
            <rect x="70" y="237" width="128" height="13" rx="6.5" fill="var(--bg)" stroke="var(--line)" />
            <circle cx="80" cy="243.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="241.5" width="66" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
          </g>
        </>
      )}
    </svg>
  );
}
