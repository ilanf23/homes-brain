import { useEffect, useRef, useState } from "react";
import { LogoMark, TradeIcon } from "@/components/svg";

/* CoreLoopScene: the HomesBrain story, played out.
   Full variant syncs to the hero's rotating step: a pro logs a job,
   the branded record travels to a phone, the homeowner claims it
   and the home's timeline grows - all in brand indigo. Compact variant
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
        {/* house: warm cottage; solid ink roof + arched indigo door echo the logo mark */}
        <g style={{ color: "var(--ink)" }}>
          {/* chimney + smoke */}
          <path
            d="M108 92c-5-6 5-11 0-18"
            {...stroke}
            strokeWidth={1.75}
            stroke="var(--muted)"
            opacity="0.75"
          />
          <path d="M98 136V104h20v15Z" {...stroke} strokeWidth={2.25} fill="var(--bg)" />
          <path d="M94 104h28" {...stroke} strokeWidth={2.25} />
          {/* body */}
          <path
            d="M64 300V172L150 100l86 72v128"
            {...stroke}
            strokeWidth={2.25}
            fill="var(--soft)"
          />
          {/* roof band */}
          <path
            d="M42 184L150 94l108 90"
            fill="none"
            stroke="currentColor"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* round gable window */}
          <circle cx="150" cy="140" r="11" {...stroke} strokeWidth={2.25} fill="var(--bg)" />
          <path d="M150 129v22M139 140h22" {...stroke} strokeWidth={1.5} />
          {/* paned windows + sills */}
          <rect
            x="82"
            y="204"
            width="32"
            height="34"
            rx="7"
            {...stroke}
            strokeWidth={2.25}
            fill="var(--bg)"
          />
          <path d="M98 204v34M82 221h32" {...stroke} strokeWidth={1.5} />
          <path d="M77 241h42" {...stroke} strokeWidth={2.25} />
          <rect
            x="186"
            y="204"
            width="32"
            height="34"
            rx="7"
            {...stroke}
            strokeWidth={2.25}
            fill="var(--bg)"
          />
          <path d="M202 204v34M186 221h32" {...stroke} strokeWidth={1.5} />
          <path d="M181 241h42" {...stroke} strokeWidth={2.25} />
          {/* arched indigo door */}
          <path d="M131 300v-40a19 19 0 0 1 38 0v40Z" fill="var(--indigo)" />
          <circle cx="161" cy="272" r="2" fill="#fff" opacity="0.9" />
          {/* shrubs */}
          <path d="M30 300a12 12 0 0 1 24 0" {...stroke} strokeWidth={2.25} fill="var(--bg)" />
          <path d="M48 300a8 8 0 0 1 16 0" {...stroke} strokeWidth={2.25} fill="var(--bg)" />
          <path d="M244 300a9 9 0 0 1 18 0" {...stroke} strokeWidth={2.25} fill="var(--bg)" />
        </g>
        {/* dashed arc: house → phone */}
        <path
          d="M230 128C270 54 342 56 378 116"
          {...stroke}
          strokeWidth={1.5}
          strokeDasharray="4 7"
          className="cls-arc dash-flow"
          style={{ color: "var(--indigo)" }}
        />
        {/* phone - real-handset proportions, island + home indicator */}
        <g style={{ color: "var(--ink)" }}>
          <rect x="341" y="122" width="84" height="176" rx="19" {...stroke} strokeWidth={2.25} />
          <rect x="372" y="131" width="22" height="7" rx="3.5" fill="var(--line)" />
          <path d="M371 289h24" {...stroke} stroke="var(--line)" />
        </g>
        {/* traveling record chip */}
        {showChip && (
          <g key={`chip-${logged}`} className="cls-chip" style={{ transformBox: "fill-box" }}>
            <g transform="translate(158, 112)">
              <rect width="76" height="30" rx="9" fill="var(--bg)" stroke="var(--line)" />
              <rect x="7" y="7" width="16" height="16" rx="5" fill="var(--indigo)" />
              <path d="M15 10.5l6 5h-12Z" fill="#fff" />
              <rect x="10.5" y="15.5" width="9" height="6" rx="1.5" fill="#fff" />
              <rect
                x="29"
                y="9"
                width="36"
                height="4.5"
                rx="2.25"
                fill="var(--ink)"
                opacity="0.75"
              />
              <rect
                x="29"
                y="17"
                width="26"
                height="4.5"
                rx="2.25"
                fill="var(--muted)"
                opacity="0.6"
              />
            </g>
          </g>
        )}
      </svg>

      {/* Job card - the pro phase */}
      <div
        key={`job-${effStep === "pro" ? logged : "idle"}`}
        className={`cls-job absolute ${effStep === "pro" ? "cls-job-enter" : ""}`}
        style={{ left: "0.5%", top: "46%", width: "40%" }}
      >
        <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_18px_38px_-22px_rgba(22,22,15,0.35)]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block rounded-full bg-indigobg px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-indigodark">
              ✓ Job logged
            </span>
            <span className="text-[8.5px] font-semibold text-muted">30 sec</span>
          </div>
          <div
            className={`mt-2.5 flex items-center gap-2 ${effStep === "pro" ? "cls-typein" : ""}`}
            style={{ animationDelay: "0.5s" }}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigobg">
              <TradeIcon trade="plumbing" size={14} className="text-indigo" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[10.5px] font-bold leading-snug text-ink">
                Water heater flush
              </div>
              <div
                className={`text-[9px] leading-snug text-muted ${effStep === "pro" ? "cls-typein" : ""}`}
                style={{ animationDelay: "0.9s" }}
              >
                Next service · Jan 2027
              </div>
            </div>
          </div>
          <div className="cls-send mt-2.5 rounded-full bg-indigo py-1.5 text-center text-[10px] font-bold text-white shadow-[0_10px_18px_-10px_rgba(71,63,176,0.65)]">
            Send record →
          </div>
        </div>
      </div>

      {/* Phone screen - record arrives, homeowner claims */}
      <div
        className="absolute flex flex-col gap-1.5"
        style={{ left: "75.4%", top: "45.5%", width: "15.7%" }}
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
          <div
            key={`claim-${logged}`}
            className="cls-drop relative"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="rounded-full bg-indigo py-1 text-center text-[8px] font-bold text-white">
              Claim your home
            </div>
            <span className="cls-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-indigo" />
          </div>
        )}
      </div>

      {/* Timeline - the history writing itself */}
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
      {/* house: same cottage as the full scene, scaled for small placements */}
      <g style={{ color: "var(--ink)" }}>
        {/* chimney */}
        <path d="M108 100V78h16v8.5Z" {...stroke} strokeWidth={2} fill="var(--bg)" />
        <path d="M104 78h24" {...stroke} strokeWidth={2} />
        {/* body */}
        <path d="M88 210V118L150 66l62 52v92" {...stroke} strokeWidth={2.25} fill="var(--soft)" />
        {/* roof band */}
        <path
          d="M72 127L150 62l78 65"
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* round gable window */}
        <circle cx="150" cy="96" r="8" {...stroke} strokeWidth={2} fill="var(--bg)" />
        <path d="M150 88v16M142 96h16" {...stroke} strokeWidth={1.25} />
        {/* paned windows + sills */}
        <rect
          x="100"
          y="142"
          width="24"
          height="25"
          rx="5"
          {...stroke}
          strokeWidth={2}
          fill="var(--bg)"
        />
        <path d="M112 142v25M100 154.5h24" {...stroke} strokeWidth={1.25} />
        <path d="M96 169.5h32" {...stroke} strokeWidth={2} />
        <rect
          x="176"
          y="142"
          width="24"
          height="25"
          rx="5"
          {...stroke}
          strokeWidth={2}
          fill="var(--bg)"
        />
        <path d="M188 142v25M176 154.5h24" {...stroke} strokeWidth={1.25} />
        <path d="M172 169.5h32" {...stroke} strokeWidth={2} />
        {/* arched indigo door */}
        <path d="M136 210v-28a14 14 0 0 1 28 0v28Z" fill="var(--indigo)" />
        <circle cx="158" cy="190" r="1.6" fill="#fff" opacity="0.9" />
        {/* shrubs */}
        <path d="M62 210a9 9 0 0 1 18 0" {...stroke} strokeWidth={2} fill="var(--bg)" />
        <path d="M75 210a6 6 0 0 1 12 0" {...stroke} strokeWidth={2} fill="var(--bg)" />
        <path d="M218 210a7 7 0 0 1 14 0" {...stroke} strokeWidth={2} fill="var(--bg)" />
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
            <rect
              x="70"
              y="220"
              width="160"
              height="13"
              rx="6.5"
              fill="var(--bg)"
              stroke="var(--line)"
            />
            <circle cx="80" cy="226.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="224.5" width="90" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
            <rect
              x="70"
              y="237"
              width="128"
              height="13"
              rx="6.5"
              fill="var(--bg)"
              stroke="var(--line)"
            />
            <circle cx="80" cy="243.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="241.5" width="66" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
          </g>
        </>
      )}
    </svg>
  );
}
