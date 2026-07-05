import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Btn, Eyebrow, SectionHead } from "@/lib/ui";
import { MarketingShell, marketingHead, Phone, PhoneRow } from "@/components/marketing";
import {
  BellIcon,
  CameraIcon,
  CountUp,
  DocumentIcon,
  LinkIcon,
  LogoMark,
  MailIcon,
  PaperclipIcon,
  ShieldCheck,
  TradeIcon,
  UserPlusIcon,
} from "@/components/svg";

export const Route = createFileRoute("/for-homeowners")({
  head: () =>
    marketingHead({
      title: "HomesBrain for homeowners: your home, finally remembered.",
      description:
        "Every repair, appliance, and warranty in one place. It fills itself when a pro does the work, so you never start from zero again. Free for homeowners.",
      path: "/for-homeowners",
    }),
  component: ForHomeowners,
});

/* ---- Page data ---- */

const GETS = [
  {
    icon: <TradeIcon trade="appliance" size={20} />,
    title: "Every appliance",
    body: "Make, model, serial, and warranty for everything in your home, captured by the pros.",
  },
  {
    icon: <DocumentIcon size={20} />,
    title: "Full service history",
    body: "What was done, when, and by whom. Verified, not from memory.",
  },
  {
    icon: <BellIcon size={20} />,
    title: "Timely reminders",
    body: "Know when service is due and rebook the pro who already knows your home.",
  },
];

const SELL_POINTS = [
  "Every system documented and trusted",
  "Warranties and upgrades in one view",
  "Sells faster, trusted more, no shoebox of receipts",
];

const EVERYTHING = [
  { title: "Auto filled appliance inventory", sub: "Make, model, serial, captured by the pros." },
  { title: "Verified service history", sub: "What was done, when, and by whom." },
  { title: "Warranty tracking and alerts", sub: "Know what is covered before you pay." },
  { title: "Recall alerts", sub: "Get told if your equipment is recalled." },
  { title: "Maintenance reminders", sub: "Stay ahead of the next breakdown." },
  { title: "Your trusted pros, saved", sub: "Rebook the people who know your home." },
  { title: "One secure link to share", sub: "For a sale, an insurer, or family." },
  { title: "Nothing to maintain", sub: "It fills itself when a pro does the work." },
  { title: "Free, and owned for life", sub: "Your record, yours to keep, always." },
];

const MY_PROS = [
  { initials: "ABC", name: "ABC Water", verified: true, sub: "Softener · today", bg: "bg-indigo" },
  {
    initials: "LE",
    name: "Lakeside Electric",
    verified: true,
    sub: "Panel · 2024",
    bg: "bg-indigo",
  },
  {
    initials: "JA",
    name: "Joe's Appliance",
    verified: false,
    sub: "Dishwasher · 2023",
    bg: "bg-indigo",
  },
];

/* The home, in numbers - counted up when the reader reaches them. */
const HOME_STATS = [
  { value: 28, label: "verified records" },
  { value: 11, label: "systems on file" },
  { value: 6, label: "active warranties" },
  { value: 5, label: "trusted pros saved" },
];

/* ---- Motion helpers (same patterns as the other marketing pages) ---- */

/* True once the element has scrolled into the viewport. Fires once. */
function useInView(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* Adds .in-view once the wrapper scrolls into the viewport, which triggers
   the CSS .reveal / .draw-path / .seq / .tilt-* children. */
function InView({
  children,
  className = "",
  threshold = 0.18,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const { ref, inView } = useInView(threshold);
  return (
    <div ref={ref} className={`${className} ${inView ? "in-view" : ""}`}>
      {children}
    </div>
  );
}

/* Inline delay for the .seq sequenced reveal (styles.css). */
const seq = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* Pointer-tracked 3D tilt (mouse only), same as how-it-works. */
function TiltLive({
  children,
  className = "",
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * max * 2).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * max * 2).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`tilt-live ${className}`}
    >
      {children}
    </div>
  );
}

/* Count-up that waits for its own viewport entry. */
function StatNumber({ value }: { value: number }) {
  const { ref, inView } = useInView(0.4);
  return <span ref={ref}>{inView ? <CountUp value={value} /> : 0}</span>;
}

/* ---- Decorative curved-line SVGs (all aria-hidden, pointer-events-none) ---- */

/* Ambient hero backdrop: two long curves drifting behind the headline. */
function HeroWaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        viewBox="0 0 1440 560"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        fill="none"
      >
        <g className="anim-sway" style={{ color: "var(--indigo)" }}>
          <path
            d="M-60 430 C 240 330, 520 500, 800 410 S 1280 300, 1520 380"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="3 10"
            opacity="0.35"
            className="dash-flow"
            style={{ animationDuration: "2.6s" }}
          />
          <path
            d="M-60 480 C 300 400, 560 560, 860 470 S 1300 380, 1520 440"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.14"
          />
        </g>
        <g className="anim-sway" style={{ color: "var(--indigo)", animationDelay: "-4s" }}>
          <path
            d="M-60 130 C 280 210, 620 60, 940 140 S 1340 220, 1520 150"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="3 10"
            opacity="0.22"
            className="dash-flow"
            style={{ animationDuration: "3.4s" }}
          />
        </g>
        <circle cx="180" cy="180" r="4" fill="var(--indigo)" opacity="0.5" className="pulse-dot" />
        <circle
          cx="1240"
          cy="420"
          r="4"
          fill="var(--indigo)"
          opacity="0.4"
          className="pulse-dot"
          style={{ animationDelay: "-1.1s" }}
        />
        <circle
          cx="1100"
          cy="120"
          r="3"
          fill="var(--indigo)"
          opacity="0.45"
          className="pulse-dot"
          style={{ animationDelay: "-0.6s" }}
        />
      </svg>
    </div>
  );
}

/* Hand-drawn indigo underline that draws itself under the hero keyword. */
function HeroUnderline() {
  return (
    <svg
      viewBox="0 0 220 14"
      className="absolute -bottom-[0.12em] left-0 w-full h-[0.16em]"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M4 9c40-6 84-7 118-4 30 2.6 62 2 94-2"
        fill="none"
        stroke="var(--indigo)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={230}
        strokeDashoffset={230}
        className="draw-on"
        style={{ animationDelay: "500ms", animationDuration: "0.8s" }}
      />
    </svg>
  );
}

/* The scroll-scrubbed record thread below gates on this: reduced-motion
   readers get the thread fully drawn instead of scrubbing it. Starts false
   so the pre-mount render is simply undrawn (no motion either way). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* The record thread behind the zig-zag "what you get" cards. Acts out the
   section's claim: one line threads the three cards into a single record.
   A faint dashed guide is always there; the indigo line draws itself along
   it in step with the reader's scroll, and each node dot on the line is
   revealed the moment the line's tip reaches it. Desktop only.
   Node dots are zero-length round-capped strokes with non-scaling-stroke,
   so the stretched viewBox never squashes them into ellipses. */
const THREAD_PATH =
  "M100 0 C 100 35, 40 55, 40 95 C 40 160, 160 230, 160 300 C 160 370, 40 440, 40 505 C 40 545, 100 565, 100 600";
/* Where the thread passes each card, as [x, y] in viewBox units. */
const THREAD_STOPS: [number, number][] = [
  [40, 95],
  [160, 300],
  [40, 505],
];

function RecordThread() {
  const reduced = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(0);
  /* Path length plus each stop's fraction along it, measured once on mount.
     The fallback values keep SSR/first paint sane until measurement runs. */
  const [geo, setGeo] = useState({ length: 800, stops: [0.18, 0.5, 0.83] });

  useEffect(() => {
    const path = pathRef.current;
    if (!path || typeof path.getTotalLength !== "function") return;
    const length = path.getTotalLength();
    const stops = THREAD_STOPS.map(([x, y]) => {
      let at = 0;
      let best = Infinity;
      const steps = 240;
      for (let i = 0; i <= steps; i++) {
        const l = (length * i) / steps;
        const pt = path.getPointAtLength(l);
        const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
        if (d < best) {
          best = d;
          at = l;
        }
      }
      return at / length;
    });
    setGeo({ length, stops });
  }, []);

  /* Scrub the draw with scroll: the tip of the line tracks the reader down
     the section, from nothing at the top to fully threaded at the bottom. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = svg.getBoundingClientRect();
      if (r.height === 0) return;
      const tipLine = window.innerHeight * 0.8;
      setProgress(Math.min(1, Math.max(0, (tipLine - r.top) / r.height)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const p = reduced ? 1 : progress;
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 600"
      preserveAspectRatio="none"
      fill="none"
      className="hidden md:block absolute left-1/2 -translate-x-1/2 top-6 bottom-6 h-[calc(100%-3rem)] w-24 pointer-events-none"
      aria-hidden="true"
    >
      {/* Guide: the path the record will take. */}
      <path
        d={THREAD_PATH}
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 10"
        opacity="0.3"
        vectorEffect="non-scaling-stroke"
        className="dash-flow"
        style={{ animationDuration: "2.8s" }}
      />
      {/* The record writes itself along the guide in step with the scroll. */}
      <path
        ref={pathRef}
        d={THREAD_PATH}
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
        strokeDasharray={geo.length}
        strokeDashoffset={geo.length * (1 - p)}
        style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
      />
      {/* Each node dot is revealed the moment the line reaches it. */}
      {THREAD_STOPS.map(([x, y], i) => (
        <g
          key={`${x}-${y}`}
          style={{
            opacity: p >= geo.stops[i] ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          <path
            d={`M${x} ${y} l0.01 0`}
            stroke="var(--bg)"
            strokeWidth="16"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M${x} ${y} l0.01 0`}
            stroke="var(--indigo)"
            strokeWidth="8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}

/* A pen-stroke that writes itself along the "It fills itself" card. */
function SelfWritingLine() {
  return (
    <svg viewBox="0 0 600 44" fill="none" className="w-full h-8 mt-6" aria-hidden="true">
      <path
        d="M8 32 C 120 10, 210 38, 310 24 S 500 6, 592 26"
        stroke="var(--indigo)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
        strokeDasharray={640}
        strokeDashoffset={640}
        className="draw-path"
        style={{ transitionDuration: "1.6s" }}
      />
      <circle cx="592" cy="26" r="4" fill="var(--indigo)" className="pulse-dot" />
    </svg>
  );
}

/* Closing mark: a house outline that draws itself, flanked by curved swooshes. */
function ClosingHouse() {
  return (
    <svg
      viewBox="0 0 360 130"
      fill="none"
      className="mx-auto w-64 sm:w-80 h-auto"
      aria-hidden="true"
    >
      <path
        d="M4 106 C 60 84, 110 92, 140 102"
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 9"
        opacity="0.5"
        className="dash-flow"
        style={{ animationDuration: "2.4s" }}
      />
      <path
        d="M356 106 C 300 84, 250 92, 220 102"
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 9"
        opacity="0.5"
        className="dash-flow"
        style={{ animationDuration: "2.4s", animationDelay: "-1.2s" }}
      />
      <g stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M148 108 V64 L180 36 L212 64 V108 Z"
          strokeDasharray={260}
          strokeDashoffset={260}
          className="draw-path"
          style={{ transitionDuration: "1.4s" }}
        />
        <path
          d="M172 108 V90 a8 8 0 0 1 16 0 v18"
          strokeDasharray={60}
          strokeDashoffset={60}
          className="draw-path"
          style={{ transitionDuration: "0.9s", transitionDelay: "1s" }}
        />
        <path
          d="M138 68 L180 30 L222 68"
          strokeDasharray={130}
          strokeDashoffset={130}
          className="draw-path"
          style={{ transitionDuration: "1s", transitionDelay: "0.4s" }}
        />
      </g>
      <circle cx="180" cy="86" r="3.5" fill="var(--indigo)" className="pulse-dot" />
    </svg>
  );
}

/* Small house glyph for the phone-mock "Roof" row. */
function RoofIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 11.5 12 5l7 6.5M6.5 10.5V19h11v-8.5M10.5 19v-4a1.5 1.5 0 0 1 3 0v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Animated check used by the sell list and the everything list. */
function DrawnCheck({ color = "var(--indigo)", delay = 0 }: { color?: string; delay?: number }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 mt-1">
      <path
        d="m3 9.5 4 4 8-9"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={20}
        strokeDashoffset={20}
        className="draw-path"
        style={{ transitionDuration: "0.5s", transitionDelay: `${delay}ms` }}
      />
    </svg>
  );
}

/* Floating UI chip laid over a photo - the product writing itself onto the
   real world. */
function PhotoChip({
  className = "",
  float = false,
  floatDelay,
  children,
}: {
  className?: string;
  float?: boolean;
  floatDelay?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute ${float ? "anim-float" : ""} ${className}`}
      style={floatDelay ? { animationDelay: floatDelay } : undefined}
    >
      <div className="rounded-2xl border border-line bg-paper/95 px-3.5 py-2.5 shadow-[0_16px_32px_-18px_rgba(22,22,15,0.45)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

/* ---- Page ---- */

function ForHomeowners() {
  return (
    <MarketingShell
      mobileCta={{ label: "Claim your home", to: "/how-it-works", variant: "indigo" }}
    >
      {/* Hero - copy beside the home itself, with the record floating on top */}
      <section className="relative overflow-hidden">
        <HeroWaves />
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 lg:pt-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="anim-fade-up">
              <Eyebrow accent="indigo">For homeowners</Eyebrow>
            </div>
            <h1 className="anim-fade-up d-1 mt-4 text-[2.6rem] leading-[1.04] sm:text-6xl text-ink">
              Your home, finally{" "}
              <span className="relative inline-block">
                remembered.
                <HeroUnderline />
              </span>
            </h1>
            <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-2xl mx-auto lg:mx-0">
              Every repair, appliance, and warranty in one place. It fills itself when a pro does
              the work, so you never start from zero again. Free for homeowners.
            </p>
            <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link to="/how-it-works">
                <Btn variant="indigo" size="lg">
                  Claim your home
                </Btn>
              </Link>
              <a href="#how-it-works">
                <Btn variant="secondary" size="lg">
                  See how it works
                </Btn>
              </a>
            </div>
            <div className="anim-fade-up d-4 mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-[13px] font-semibold text-muted">
              <span>Free forever</span>
              <span className="w-1 h-1 rounded-full bg-indigo/60" aria-hidden="true" />
              <span>No typing</span>
              <span className="w-1 h-1 rounded-full bg-indigo/60" aria-hidden="true" />
              <span>Yours for life</span>
            </div>
          </div>

          {/* The home, with its record writing itself on top */}
          <div className="anim-scale-in d-2 persp">
            <TiltLive>
              <div className="relative">
                <img
                  src="/images/homeowners/hero-home.jpg"
                  alt="A shingled family home with a wraparound porch"
                  className="aspect-[4/3.2] w-full rounded-[26px] object-cover shadow-[0_36px_64px_-36px_rgba(22,22,15,0.5)]"
                />
                {/* soft ink fade keeps the floating chips legible */}
                <div
                  className="absolute inset-x-0 bottom-0 h-28 rounded-b-[26px] bg-gradient-to-t from-ink/45 to-transparent"
                  aria-hidden="true"
                />
                <PhotoChip className="left-4 top-4" float>
                  <div className="flex items-center gap-2">
                    <LogoMark size={16} className="shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold leading-tight text-ink">
                        Softener serviced ✓
                      </div>
                      <div className="text-[10.5px] leading-tight text-muted">
                        ABC Water · today · wrote itself
                      </div>
                    </div>
                  </div>
                </PhotoChip>
                <PhotoChip className="right-4 top-[38%]" float floatDelay="-2.4s">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo">
                    <ShieldCheck size={15} animate={false} /> No known recalls
                  </div>
                </PhotoChip>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                    11 systems on file
                  </span>
                  <span className="rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                    Warranty to 2031
                  </span>
                  <span className="ml-auto rounded-full bg-indigo px-3 py-1 text-[11px] font-extrabold text-white shadow-sm">
                    128 Maple St
                  </span>
                </div>
              </div>
            </TiltLive>
          </div>
        </div>
      </section>

      {/* What you get - zig-zag cards threaded by the record thread, which
          draws itself through all three in step with the reader's scroll. */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="What you get"
              title="One place for everything your home is made of."
            />
          </div>
          <div className="relative mt-14">
            <RecordThread />
            <div className="relative space-y-6 md:space-y-10">
              {GETS.map((g, i) => (
                <div
                  key={g.title}
                  className={`reveal rd-${i + 1} md:max-w-[380px] ${
                    i % 2 === 1 ? "md:ml-auto" : ""
                  }`}
                >
                  <div className="liftable rounded-[22px] border border-line bg-paper p-7 sm:p-8">
                    <span className="inline-flex w-11 h-11 rounded-2xl bg-indigobg text-indigodark items-center justify-center">
                      {g.icon}
                    </span>
                    <h3 className="mt-4 text-lg tracking-tight">{g.title}</h3>
                    <p className="mt-2 text-[15px] text-muted">{g.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </InView>
      </section>

      {/* How it works - the journey curve, phones filling in row by row */}
      <section id="how-it-works" className="py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="How it works"
              title="Three steps, and most of them happen without you."
            />
          </div>
          <div className="relative mt-16">
            <div className="relative grid md:grid-cols-3 gap-12 md:gap-6">
              {/* Step 1 - your record arrives */}
              <div className="reveal rd-1 text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo text-white text-sm font-extrabold ring-4 ring-background">
                  1
                </span>
                <h3 className="mt-3 text-xl tracking-tight">Your record arrives</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  After a pro does the work, your home shows up, already filled in. Claim it.
                </p>
                <div className="mt-7">
                  <Phone>
                    <div className="seq" style={seq(0.2)}>
                      <div className="rounded-xl bg-indigo text-white px-3.5 py-3 flex items-center gap-2.5 text-left">
                        <span className="w-9 h-9 shrink-0 rounded-lg bg-white/15 flex items-center justify-center text-[10px] font-extrabold">
                          ABC
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold leading-tight">
                            ABC Water Treatment
                          </span>
                          <span className="block text-[11px] text-white/75">
                            added to your home
                          </span>
                        </span>
                      </div>
                    </div>
                    <div
                      className="seq px-1 pt-1 text-sm font-extrabold text-ink text-left"
                      style={seq(0.55)}
                    >
                      Your water softener
                    </div>
                    <div className="seq" style={seq(0.85)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Bradford White</span>}
                        right={<span className="text-sm font-semibold text-ink">since 2021</span>}
                      />
                    </div>
                    <div className="seq" style={seq(1.15)}>
                      <div className="rounded-xl bg-indigobg text-indigodark px-3.5 py-2.5 text-sm font-semibold text-left flex items-center gap-2">
                        <ShieldCheck size={17} animate={false} className="shrink-0" />
                        Warranty to 2031
                      </div>
                    </div>
                    <div className="seq" style={seq(1.5)}>
                      <Btn variant="indigo" className="w-full">
                        Claim your home
                      </Btn>
                    </div>
                  </Phone>
                </div>
              </div>

              {/* Step 2 - your home fills itself */}
              <div className="reveal rd-2 text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo text-white text-sm font-extrabold ring-4 ring-background">
                  2
                </span>
                <h3 className="mt-3 text-xl tracking-tight">Your home fills itself</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  Every pro who works on the house adds to it. You never type a thing.
                </p>
                <div className="mt-7">
                  <Phone title="Your home" floatDelay="-1.6s">
                    {[
                      {
                        name: "Water softener",
                        sub: "Serviced today",
                        icon: (
                          <TradeIcon trade="water_treatment" size={17} className="text-muted" />
                        ),
                        live: true,
                      },
                      {
                        name: "Furnace",
                        sub: "Service due Nov",
                        icon: <TradeIcon trade="hvac" size={17} className="text-muted" />,
                      },
                      {
                        name: "Water heater",
                        sub: "Under warranty",
                        icon: <TradeIcon trade="electrical" size={17} className="text-muted" />,
                      },
                      {
                        name: "Roof",
                        sub: "Inspected 2024",
                        icon: <RoofIcon size={17} className="text-muted" />,
                      },
                    ].map((row, i) => (
                      <div key={row.name} className="seq" style={seq(1.9 + i * 0.3)}>
                        <PhoneRow
                          left={
                            <span className="block text-left">
                              <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                                {row.name}
                                {row.live && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-indigo pulse-dot"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                              <span className="block text-xs text-muted">{row.sub}</span>
                            </span>
                          }
                          right={row.icon}
                        />
                      </div>
                    ))}
                  </Phone>
                </div>
              </div>

              {/* Step 3 - use it for years */}
              <div className="reveal rd-3 text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-coral text-white text-sm font-extrabold ring-4 ring-background">
                  3
                </span>
                <h3 className="mt-3 text-xl tracking-tight">Use it for years</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  Rebook your trusted pros, and hand a buyer the full history when you sell.
                </p>
                <div className="mt-7">
                  <Phone title="Selling your home" floatDelay="-3.2s">
                    <div className="seq" style={seq(3.2)}>
                      <div className="rounded-xl bg-indigobg px-3.5 py-4 text-center">
                        <LinkIcon size={18} className="mx-auto text-indigodark" />
                        <div className="mt-1.5 text-sm font-bold text-indigodark">
                          Full history, one link
                        </div>
                      </div>
                    </div>
                    <div className="seq" style={seq(3.5)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Service records</span>}
                        right={
                          <span className="text-sm font-semibold text-ink tnum">28 verified</span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(3.8)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Warranties</span>}
                        right={
                          <span className="text-sm font-semibold text-ink tnum">6 active</span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(4.1)}>
                      <Btn variant="indigo" className="w-full">
                        Share with buyer
                      </Btn>
                    </div>
                  </Phone>
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* What your home remembers - the record over the real rooms */}
      <section className="bg-soft border-y border-line py-24 overflow-hidden">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="What your home remembers"
              title="The record sits on top of the real thing"
              sub="Every room, every system, every serial number - captured where it lives, by the people who work on it."
            />
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-5">
            <div className="persp">
              <div className="tilt-l relative overflow-hidden rounded-[22px] shadow-[0_28px_56px_-32px_rgba(22,22,15,0.45)]">
                <img
                  src="/images/homeowners/kitchen.jpg"
                  alt="A bright kitchen with built-in oven and microwave"
                  loading="lazy"
                  className="h-72 sm:h-80 w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/55 to-transparent"
                  aria-hidden="true"
                />
                <PhotoChip className="left-4 top-4" float>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <TradeIcon trade="appliance" size={15} className="text-indigo shrink-0" />
                    Wall oven · serial on file
                  </div>
                </PhotoChip>
                <span className="absolute bottom-4 left-4 rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                  6 appliances captured in this kitchen
                </span>
              </div>
            </div>
            <div className="persp">
              <div className="tilt-r relative overflow-hidden rounded-[22px] shadow-[0_28px_56px_-32px_rgba(22,22,15,0.45)]">
                <img
                  src="/images/homeowners/living-room.jpg"
                  alt="A bright open living room with large windows"
                  loading="lazy"
                  className="h-72 sm:h-80 w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/55 to-transparent"
                  aria-hidden="true"
                />
                <PhotoChip className="right-4 top-4" float floatDelay="-2s">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <BellIcon size={15} className="text-indigo shrink-0" />
                    HVAC filter due in 3 weeks
                  </div>
                </PhotoChip>
                <span className="absolute bottom-4 left-4 rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                  Windows, HVAC, and fireplace on record
                </span>
              </div>
            </div>
          </div>
          {/* the home, in numbers */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {HOME_STATS.map((s, i) => (
              <div
                key={s.label}
                className={`reveal rd-${i + 1} rounded-2xl border border-line bg-white px-5 py-6 text-center`}
              >
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-indigo tnum">
                  <StatNumber value={s.value} />
                </div>
                <div className="mt-1.5 text-sm font-semibold text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* Your pros */}
      <section className="py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="Your pros"
              title="Add records your way, and keep your pros in one place."
            />
          </div>
          <div className="mt-14 grid md:grid-cols-2 gap-14 md:gap-8">
            <div className="reveal rd-1 text-center">
              <h3 className="text-xl tracking-tight">Add anything, never type</h3>
              <p className="mt-2 text-sm text-muted max-w-[280px] mx-auto">
                Snap a photo, forward an email, attach a file, or invite the pro to add it.
              </p>
              <div className="mt-7">
                <Phone title="Add to your home">
                  <PhoneRow
                    left={
                      <span className="flex items-center gap-2.5 text-sm font-bold text-ink">
                        <CameraIcon size={17} className="text-muted shrink-0" /> Snap a photo
                      </span>
                    }
                    right={<span className="text-muted">›</span>}
                  />
                  <PhoneRow
                    left={
                      <span className="block text-left">
                        <span className="flex items-center gap-2.5 text-sm font-bold text-ink">
                          <MailIcon size={17} className="text-muted shrink-0" /> Forward an email
                        </span>
                        <span className="block pl-[26px] text-xs text-muted">
                          dana@my.homesbrain.com
                        </span>
                      </span>
                    }
                    right={<span className="text-muted">›</span>}
                  />
                  <PhoneRow
                    left={
                      <span className="flex items-center gap-2.5 text-sm font-bold text-ink">
                        <PaperclipIcon size={17} className="text-muted shrink-0" /> Add a file
                      </span>
                    }
                    right={<span className="text-muted">›</span>}
                  />
                  <div className="rounded-xl bg-indigobg px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm font-bold text-indigodark">
                      <UserPlusIcon size={17} className="shrink-0" /> Invite a pro to add it
                    </span>
                    <span className="text-indigodark">›</span>
                  </div>
                </Phone>
              </div>
            </div>

            <div className="reveal rd-2 text-center">
              <h3 className="text-xl tracking-tight">My pros, with full history</h3>
              <p className="mt-2 text-sm text-muted max-w-[280px] mx-auto">
                Everyone who works on your home, verified, with every job and one tap rebook.
              </p>
              <div className="mt-7">
                <Phone title="My pros" floatDelay="-2.4s">
                  {MY_PROS.map((p) => (
                    <PhoneRow
                      key={p.name}
                      left={
                        <span className="flex items-center gap-2 text-left">
                          <span
                            className={`w-8 h-8 shrink-0 rounded-lg ${p.bg} text-white flex items-center justify-center text-[10px] font-extrabold`}
                          >
                            {p.initials}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-sm font-bold text-ink leading-tight">
                              {p.name}
                              {p.verified && (
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 14 14"
                                  aria-label="verified"
                                  className="shrink-0 text-indigo"
                                >
                                  <path
                                    d="m3 7.5 2.6 2.6L11 4.6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className="block text-xs text-muted text-left">{p.sub}</span>
                          </span>
                        </span>
                      }
                      right={
                        <span className="shrink-0 rounded-full bg-coral text-white text-[11px] font-bold px-2.5 py-1">
                          Rebook
                        </span>
                      }
                    />
                  ))}
                  <div className="rounded-xl bg-indigobg px-3.5 py-2.5 text-center text-sm font-bold text-indigodark">
                    + Add a pro
                  </div>
                </Phone>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* Zero effort - a pro at work, the record writing itself */}
      <section className="bg-soft border-y border-line py-24 overflow-hidden">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 items-stretch">
            <div className="persp">
              <div className="tilt-l relative h-full min-h-[320px] overflow-hidden rounded-[26px] shadow-[0_28px_56px_-32px_rgba(22,22,15,0.45)]">
                <img
                  src="/images/homeowners/pro-work.jpg"
                  alt="An electrician in a hard hat working on a home's panel"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/60 to-transparent"
                  aria-hidden="true"
                />
                <PhotoChip className="left-4 bottom-4 right-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigobg">
                      <TradeIcon trade="electrical" size={16} className="text-indigo" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-extrabold text-ink">
                        Panel inspected · Lakeside Electric
                      </div>
                      <div className="text-[10.5px] text-muted">
                        Logged in 30 seconds → your record updated
                      </div>
                    </div>
                  </div>
                </PhotoChip>
              </div>
            </div>
            <div className="reveal rd-1 rounded-[26px] bg-indigobg p-8 sm:p-12 overflow-hidden">
              <Eyebrow accent="indigo">Zero effort</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">
                It fills itself.
              </h2>
              <p className="mt-4 text-indigodark max-w-2xl">
                No spreadsheets, no scanning manuals, no chore that you quit in a week. When a pro
                does the work, your record updates on its own.
              </p>
              <SelfWritingLine />
            </div>
          </div>
        </InView>
      </section>

      {/* When you sell */}
      <section className="py-24 overflow-hidden">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div className="reveal rd-1">
              <h2 className="text-3xl sm:text-4xl tracking-tight text-ink">
                And when you sell, it pays off.
              </h2>
              <p className="mt-4 text-muted">
                Hand a buyer one secure link with the full verified history of the home.
              </p>
              <ul className="mt-7 space-y-3.5">
                {SELL_POINTS.map((t, i) => (
                  <li key={t} className="flex items-start gap-3 text-ink">
                    <DrawnCheck delay={200 + i * 160} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="persp">
              <div className="tilt-r relative overflow-hidden rounded-[22px] shadow-[0_28px_56px_-32px_rgba(22,22,15,0.45)]">
                <img
                  src="/images/homeowners/sold-home.jpg"
                  alt="House keys beside a small model home on a table"
                  loading="lazy"
                  className="h-80 w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/60 to-transparent"
                  aria-hidden="true"
                />
                <PhotoChip className="left-4 top-4" float>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo">
                    <LinkIcon size={14} className="shrink-0" />
                    homesbrain.com/r/maple-st-142
                  </div>
                </PhotoChip>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm tnum">
                    28 verified records
                  </span>
                  <span className="rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                    Moves with the house
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted text-center">
                What the buyer sees. Verified, complete, no shoebox.
              </p>
            </div>
          </div>
        </InView>
      </section>

      {/* Everything homeowners get */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="Everything homeowners get"
              title="Your whole home, remembered for you."
            />
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-x-12">
            {EVERYTHING.map((f, i) => (
              <div
                key={f.title}
                className={`reveal rd-${Math.min(Math.floor(i / 2) + 1, 6)} flex items-start gap-3 py-4 border-b border-line`}
              >
                <DrawnCheck color="var(--ink)" delay={150 + i * 70} />
                <div>
                  <div className="font-bold text-ink">{f.title}</div>
                  <div className="mt-0.5 text-sm text-muted">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* Closing CTA */}
      <section className="py-24">
        <InView className="mx-auto max-w-3xl px-5 text-center">
          <ClosingHouse />
          <h2 className="reveal mt-8 text-3xl sm:text-5xl tracking-tight text-ink">
            Free for homeowners. Owned for life.
          </h2>
          <div className="reveal rd-2 mt-9">
            <Link to="/how-it-works">
              <Btn variant="indigo" size="lg">
                Claim your home
              </Btn>
            </Link>
          </div>
        </InView>
      </section>
    </MarketingShell>
  );
}
