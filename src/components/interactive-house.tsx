import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getGuide } from "@/lib/make-it-last";

type Hotspot = {
  slug: string;
  aria: string;
  /* Percent position over the SVG viewBox, 0-100. */
  x: number;
  y: number;
  /* Where the tiny label bubble sits relative to the dot. */
  labelSide?: "top" | "bottom" | "left" | "right";
};

/* Hotspots map to real guides in src/lib/make-it-last.ts. */
const HOTSPOTS: Hotspot[] = [
  { slug: "roof", aria: "Roof", x: 34, y: 18, labelSide: "top" },
  { slug: "windows", aria: "Windows", x: 26, y: 55, labelSide: "left" },
  { slug: "dishwasher", aria: "Dishwasher (kitchen)", x: 40, y: 58, labelSide: "top" },
  { slug: "dryer", aria: "Dryer (laundry)", x: 52, y: 58, labelSide: "top" },
  { slug: "garage-door", aria: "Garage door", x: 62, y: 70, labelSide: "top" },
  { slug: "central-ac", aria: "Central AC outdoor unit", x: 74, y: 78, labelSide: "top" },
  { slug: "water-heater", aria: "Water heater", x: 46, y: 46, labelSide: "right" },
  { slug: "pool-equipment", aria: "Pool equipment", x: 89, y: 76, labelSide: "top" },
];

function useCountUp(target: number, key: string, ms = 500) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export function InteractiveHouse() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto rotate until the user interacts.
  useEffect(() => {
    if (userInteracted) return;
    const id = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % HOTSPOTS.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [userInteracted]);

  const stopAuto = () => {
    if (!userInteracted) setUserInteracted(true);
  };

  const active = HOTSPOTS[activeIdx];
  const guide = getGuide(active.slug);

  // Fallbacks in case a slug is missing.
  const label = guide?.label ?? active.aria;
  const neglected = guide?.neglected ?? 0;
  const maintained = guide?.maintained ?? 0;
  const gap = Math.max(0, maintained - neglected);
  const maxYears = 30; // consistent scale across hotspots
  const neglectedPct = Math.min(100, (neglected / maxYears) * 100);
  const maintainedPct = Math.min(100, (maintained / maxYears) * 100);

  const animatedGap = useCountUp(gap, active.slug);

  return (
    <div
      ref={containerRef}
      className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-center"
    >
      {/* SVG house with hotspots */}
      <div
        className="relative w-full mx-auto max-w-[640px]"
        onMouseLeave={() => {
          /* Do not resume auto-rotation once user has engaged. */
        }}
      >
        <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
          <svg
            viewBox="0 0 800 500"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {/* Ground */}
            <line x1="0" y1="440" x2="800" y2="440" stroke="var(--line)" strokeWidth="2" />

            {/* Trees / shrub accents */}
            <circle cx="60" cy="410" r="22" fill="var(--indigobg)" />
            <circle cx="60" cy="410" r="22" fill="none" stroke="var(--indigo)" strokeWidth="2" />
            <line x1="60" y1="432" x2="60" y2="440" stroke="var(--indigo)" strokeWidth="2" />

            {/* Main house body */}
            <rect x="150" y="220" width="340" height="220" fill="var(--soft)" stroke="var(--indigo)" strokeWidth="3" />
            {/* Roof */}
            <polygon points="140,220 320,90 500,220" fill="var(--indigobg)" stroke="var(--indigo)" strokeWidth="3" strokeLinejoin="round" />
            {/* Chimney */}
            <rect x="410" y="130" width="24" height="60" fill="var(--soft)" stroke="var(--indigo)" strokeWidth="3" />

            {/* Windows */}
            <rect x="185" y="270" width="70" height="70" fill="white" stroke="var(--indigo)" strokeWidth="3" />
            <line x1="220" y1="270" x2="220" y2="340" stroke="var(--indigo)" strokeWidth="2" />
            <line x1="185" y1="305" x2="255" y2="305" stroke="var(--indigo)" strokeWidth="2" />

            <rect x="290" y="270" width="70" height="70" fill="white" stroke="var(--indigo)" strokeWidth="3" />
            <line x1="325" y1="270" x2="325" y2="340" stroke="var(--indigo)" strokeWidth="2" />
            <line x1="290" y1="305" x2="360" y2="305" stroke="var(--indigo)" strokeWidth="2" />

            {/* Door */}
            <rect x="395" y="310" width="70" height="130" fill="white" stroke="var(--indigo)" strokeWidth="3" />
            <circle cx="452" cy="378" r="3" fill="var(--coral)" />

            {/* Garage attached to right */}
            <rect x="500" y="290" width="180" height="150" fill="var(--soft)" stroke="var(--indigo)" strokeWidth="3" />
            {/* Garage roof slope */}
            <polygon points="500,290 590,220 680,290" fill="var(--indigobg)" stroke="var(--indigo)" strokeWidth="3" strokeLinejoin="round" />
            {/* Garage door */}
            <rect x="520" y="320" width="140" height="120" fill="white" stroke="var(--indigo)" strokeWidth="3" />
            <line x1="520" y1="350" x2="660" y2="350" stroke="var(--indigo)" strokeWidth="2" />
            <line x1="520" y1="380" x2="660" y2="380" stroke="var(--indigo)" strokeWidth="2" />
            <line x1="520" y1="410" x2="660" y2="410" stroke="var(--indigo)" strokeWidth="2" />

            {/* Outdoor AC condenser next to garage */}
            <rect x="680" y="400" width="40" height="40" fill="white" stroke="var(--indigo)" strokeWidth="2.5" />
            <line x1="686" y1="410" x2="714" y2="410" stroke="var(--indigo)" strokeWidth="1.5" />
            <line x1="686" y1="420" x2="714" y2="420" stroke="var(--indigo)" strokeWidth="1.5" />
            <line x1="686" y1="430" x2="714" y2="430" stroke="var(--indigo)" strokeWidth="1.5" />

            {/* Pool on the right */}
            <ellipse cx="740" cy="440" rx="60" ry="12" fill="var(--coralbg)" stroke="var(--coral)" strokeWidth="2.5" />
            <path d="M 690 438 Q 705 434 720 438 T 750 438 T 780 438" fill="none" stroke="var(--coral)" strokeWidth="1.5" />
          </svg>

          {/* Hotspots layered above the SVG */}
          {HOTSPOTS.map((h, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={h.slug}
                type="button"
                aria-label={h.aria}
                aria-pressed={isActive}
                onClick={() => {
                  stopAuto();
                  setActiveIdx(i);
                }}
                onMouseEnter={() => {
                  stopAuto();
                  setActiveIdx(i);
                }}
                onFocus={() => {
                  stopAuto();
                  setActiveIdx(i);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 rounded-full"
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
              >
                <span className="relative flex items-center justify-center">
                  {/* Pulse ring, only when not the active one (subtle life). */}
                  {!isActive && (
                    <span
                      className="absolute inline-flex h-6 w-6 rounded-full bg-coral opacity-40 animate-ping"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 ${
                      isActive
                        ? "h-6 w-6 bg-coral ring-4 ring-coral/25"
                        : "h-4 w-4 bg-coral/90 hover:h-5 hover:w-5"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                  </span>
                  {/* Active label chip */}
                  {isActive && (
                    <span
                      className="absolute whitespace-nowrap rounded-full bg-ink text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm pointer-events-none"
                      style={{
                        [h.labelSide === "top"
                          ? "bottom"
                          : h.labelSide === "bottom"
                          ? "top"
                          : h.labelSide === "left"
                          ? "right"
                          : "left"]: "calc(100% + 10px)",
                      }}
                    >
                      {label}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Helper caption */}
        <p className="mt-3 text-center text-xs text-muted">
          Tap any dot on the house to see the years you could add.
        </p>
      </div>

      {/* Result card */}
      <div
        aria-live="polite"
        className="rounded-3xl border border-line bg-paper p-6 sm:p-7 shadow-sm w-full max-w-[520px] mx-auto"
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">
          Selected
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tight text-ink">{label}</h3>
        </div>

        <div className="mt-5 flex items-end gap-4">
          <div className="tnum text-6xl font-bold text-coral leading-none">
            +{animatedGap}
          </div>
          <div className="pb-1 text-sm font-semibold text-ink">
            years
            <div className="text-xs font-normal text-muted">with real maintenance</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted">Left alone</span>
              <span className="tnum font-semibold text-ink">{neglected} yrs</span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-line transition-[width] duration-500 ease-out"
                style={{ width: `${neglectedPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-coraldark">Maintained</span>
              <span className="tnum font-semibold text-coraldark">{maintained} yrs</span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-coralbg overflow-hidden">
              <div
                className="h-full rounded-full bg-coral transition-[width] duration-500 ease-out"
                style={{ width: `${maintainedPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/make-it-last/$slug"
            params={{ slug: active.slug }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-coraldark hover:text-coral transition-colors"
          >
            Open the {label.toLowerCase()} guide
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
