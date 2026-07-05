import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Btn, Eyebrow, SectionHead } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";
import {
  BellIcon,
  CameraIcon,
  DocumentIcon,
  LinkIcon,
  MailIcon,
  PaperclipIcon,
  ShieldCheck,
  TradeIcon,
  UserPlusIcon,
} from "@/components/svg";

export const Route = createFileRoute("/for-homeowners")({
  head: () =>
    marketingHead({
      title: "HomesBrain for homeowners — your home, finally remembered.",
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
  { initials: "ABC", name: "ABC Water", verified: true, sub: "Softener · today", bg: "bg-teal" },
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
    bg: "bg-coral",
  },
];

/* ---- Motion helpers ---- */

/* Adds .in-view once the wrapper scrolls into the viewport, which triggers
   the CSS .reveal / .draw-path children. Fires once. */
function InView({
  children,
  className = "",
  threshold = 0.18,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
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
  return (
    <div ref={ref} className={`${className} ${inView ? "in-view" : ""}`}>
      {children}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true); // conservative until mounted
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ---- Hero record card ----
   The product itself, assembling in front of you: header, "new record" banner,
   verified rows staggering in with self-drawing checks, dark trust footer. */

/* Solid teal circle whose white check draws itself on after `delay` ms. */
function RecordCheck({ delay = 0, size = 22 }: { delay?: number; size?: number }) {
  return (
    <span
      className="inline-flex rounded-full bg-teal items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 12 12">
        <path
          d="m2.5 6.5 2.5 2.5 4.5-5.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={14}
          strokeDashoffset={14}
          className="draw-on"
          style={{ animationDelay: `${delay}ms`, animationDuration: "0.45s" }}
        />
      </svg>
    </span>
  );
}

function WarrantyTag({ year }: { year: string }) {
  return (
    <span className="rounded-md border border-line bg-soft px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] text-muted uppercase tnum whitespace-nowrap">
      Warranty {year}
    </span>
  );
}

const RECORD_ROWS = [
  {
    icon: <TradeIcon trade="water_treatment" size={20} />,
    title: "Water heater",
    sub: "Flushed today · Tind Plumbing",
    year: "'28",
    delay: 4,
    check: 850,
  },
  {
    icon: <TradeIcon trade="hvac" size={20} />,
    title: "HVAC system",
    sub: "Serviced Apr 2026 · Coastal Air",
    year: "'35",
    delay: 5,
    check: 1000,
  },
  {
    icon: <RoofIcon size={20} />,
    title: "Roof",
    sub: "Replaced 2023 · Marsh Roofing",
    year: "'31",
    delay: 6,
    check: 1150,
  },
];

function HeroRecordCard() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      {/* sheet peeking out behind the card */}
      <div
        className="absolute inset-x-6 -bottom-3.5 h-10 rounded-3xl bg-paper border border-line"
        aria-hidden="true"
      />
      <div
        className="anim-float relative rounded-[26px] bg-paper border border-line overflow-hidden shadow-[0_32px_64px_-30px_rgba(22,22,15,0.3)]"
        style={{ animationDelay: "-2.5s" }}
      >
        <div className="h-1.5 bg-coral" aria-hidden="true" />
        <div className="p-5 sm:p-6">
          {/* Address header */}
          <div className="anim-fade-up d-2 flex items-center gap-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-coralbg text-coraldark border border-line flex items-center justify-center">
              <RoofIcon size={22} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[17px] font-extrabold text-ink leading-tight">
                42 Marsh Lane
              </span>
              <span className="mt-0.5 block text-[10px] font-bold tracking-[0.16em] text-muted uppercase">
                Your home record
              </span>
            </span>
            <span className="anim-scale-in d-3 inline-flex items-center gap-1.5 rounded-full bg-tealbg text-tealdark text-xs font-bold px-2.5 py-1">
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="m2.5 6.5 2.5 2.5 4.5-5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Received
            </span>
          </div>

          {/* New-record banner */}
          <div className="anim-fade-up d-3 mt-4 rounded-xl bg-tealbg px-3.5 py-2.5 flex items-center gap-2.5">
            <RecordCheck size={20} delay={650} />
            <span className="text-[13px] font-bold text-tealdark text-left">
              New record added · Water-heater flush
            </span>
          </div>

          {/* Verified equipment rows */}
          <div className="mt-2">
            {RECORD_ROWS.map((r) => (
              <div
                key={r.title}
                className={`anim-fade-up d-${r.delay} flex items-center gap-3 py-3.5 border-b border-line last:border-b-0`}
              >
                <span className="w-11 h-11 shrink-0 rounded-xl bg-soft border border-line flex items-center justify-center text-muted">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-extrabold text-ink leading-tight">
                    {r.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{r.sub}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5 shrink-0">
                  <WarrantyTag year={r.year} />
                  <RecordCheck size={20} delay={r.check} />
                </span>
              </div>
            ))}
          </div>

          {/* Trust footer */}
          <div className="anim-fade-up d-6 mt-3 rounded-2xl bg-ink pl-3.5 pr-3 py-3 flex items-center gap-2.5">
            <RecordCheck size={22} delay={1350} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-white leading-tight">
                Verified home history
              </span>
              <span className="mt-0.5 block text-[11px] text-white/60 whitespace-nowrap">
                Owned by you · ready when you sell
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white text-ink text-xs font-bold px-3 py-1.5">
              Share <span aria-hidden="true">↗</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Decorative curved-line SVGs (all aria-hidden, pointer-events-none) ---- */

/* Hand-drawn coral underline that draws itself under the hero keyword. */
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
        stroke="var(--coral)"
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

/* The record's journey: a curve threading through the three step badges,
   drawn on scroll, with a coral dot travelling along it. Desktop only. */
const JOURNEY_PATH = "M30 78 C 190 10, 390 6, 500 52 S 810 112, 970 30";

function JourneyCurve() {
  const reduced = usePrefersReducedMotion();
  return (
    <svg
      viewBox="0 0 1000 120"
      fill="none"
      className="hidden md:block absolute -top-4 left-0 right-0 w-full h-28 pointer-events-none"
      aria-hidden="true"
    >
      <path
        d={JOURNEY_PATH}
        stroke="var(--line)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <path
        d={JOURNEY_PATH}
        stroke="var(--coral)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
        strokeDasharray={1400}
        strokeDashoffset={1400}
        className="draw-path"
        style={{ transitionDuration: "1.8s" }}
      />
      {!reduced && (
        <circle r="5" fill="var(--coral)">
          <animateMotion dur="7s" repeatCount="indefinite" path={JOURNEY_PATH} rotate="0" />
        </circle>
      )}
    </svg>
  );
}

/* Vertical wavy connector running behind the zig-zag "what you get" cards. */
function ZigzagConnector() {
  return (
    <svg
      viewBox="0 0 100 600"
      preserveAspectRatio="none"
      fill="none"
      className="hidden md:block absolute left-1/2 -translate-x-1/2 top-6 bottom-6 h-[calc(100%-3rem)] w-24 pointer-events-none"
      aria-hidden="true"
    >
      <path
        d="M50 0 C 110 100, -10 200, 50 300 S 110 500, 50 600"
        stroke="var(--coral)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 10"
        opacity="0.4"
        vectorEffect="non-scaling-stroke"
        className="dash-flow"
        style={{ animationDuration: "2.8s" }}
      />
    </svg>
  );
}

/* A pen-stroke that writes itself along the "It fills itself" card. */
function SelfWritingLine() {
  return (
    <svg viewBox="0 0 600 44" fill="none" className="w-full h-8 mt-6" aria-hidden="true">
      <path
        d="M8 32 C 120 10, 210 38, 310 24 S 500 6, 592 26"
        stroke="var(--coral)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
        strokeDasharray={640}
        strokeDashoffset={640}
        className="draw-path"
        style={{ transitionDuration: "1.6s" }}
      />
      <circle cx="592" cy="26" r="4" fill="var(--coral)" className="pulse-dot" />
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
        stroke="var(--coral)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 9"
        opacity="0.5"
        className="dash-flow"
        style={{ animationDuration: "2.4s" }}
      />
      <path
        d="M356 106 C 300 84, 250 92, 220 102"
        stroke="var(--coral)"
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
      <circle cx="180" cy="86" r="3.5" fill="var(--coral)" className="pulse-dot" />
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
function DrawnCheck({ color = "var(--coral)", delay = 0 }: { color?: string; delay?: number }) {
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

/* ---- Mockup primitives ---- */

/* Chunky-bezel phone frame — the brand's signature product visual. */
function Phone({
  title,
  children,
  floatDelay,
}: {
  title?: string;
  children: ReactNode;
  floatDelay?: string;
}) {
  return (
    <div
      className="anim-float w-full max-w-[270px] mx-auto rounded-[2.2rem] bg-ink p-[3px] shadow-[0_24px_48px_-24px_rgba(22,22,15,0.38)]"
      style={floatDelay ? { animationDelay: floatDelay } : undefined}
    >
      <div className="rounded-[2rem] bg-[#f5f4ef] p-3">
        {title && <div className="px-1 pt-1 pb-2 text-sm font-extrabold text-ink">{title}</div>}
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function PhoneRow({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-paper px-3.5 py-2.5 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">{left}</div>
      {right}
    </div>
  );
}

/* ---- Page ---- */

function ForHomeowners() {
  return (
    <MarketingShell mobileCta={{ label: "Claim your home", to: "/how-it-works", variant: "coral" }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
          <div className="text-center lg:text-left">
            <div className="anim-fade-up">
              <Eyebrow accent="coral">For homeowners</Eyebrow>
            </div>
            <h1 className="anim-fade-up d-1 mt-4 text-[2.6rem] leading-[1.04] sm:text-5xl xl:text-6xl text-ink">
              Your home, finally{" "}
              <span className="relative inline-block">
                remembered.
                <HeroUnderline />
              </span>
            </h1>
            <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0">
              Every repair, appliance, and warranty in one place. It fills itself when a pro does
              the work, so you never start from zero again. Free for homeowners.
            </p>
            <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link to="/how-it-works">
                <Btn variant="coral" size="lg">
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
              <span className="w-1 h-1 rounded-full bg-coral/60" aria-hidden="true" />
              <span>No typing</span>
              <span className="w-1 h-1 rounded-full bg-coral/60" aria-hidden="true" />
              <span>Yours for life</span>
            </div>
          </div>
          <div className="anim-fade-up d-2">
            <HeroRecordCard />
          </div>
        </div>
      </section>

      {/* What you get — zig-zag cards threaded by a wavy connector */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead
              accent="coral"
              eyebrow="What you get"
              title="One place for everything your home is made of."
            />
          </div>
          <div className="relative mt-14">
            <ZigzagConnector />
            <div className="relative space-y-6 md:space-y-10">
              {GETS.map((g, i) => (
                <div
                  key={g.title}
                  className={`reveal rd-${i + 1} md:max-w-[420px] ${
                    i % 2 === 1 ? "md:ml-auto" : ""
                  }`}
                >
                  <div className="liftable rounded-[22px] border border-line bg-paper p-7 sm:p-8">
                    <span className="inline-flex w-11 h-11 rounded-2xl bg-coralbg text-coraldark items-center justify-center">
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

      {/* How it works — the journey curve */}
      <section id="how-it-works" className="py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal">
            <SectionHead
              accent="coral"
              eyebrow="How it works"
              title="Three steps, and most of them happen without you."
            />
          </div>
          <div className="relative mt-16">
            <JourneyCurve />
            <div className="relative grid md:grid-cols-3 gap-12 md:gap-6">
              {/* Step 1 — your record arrives */}
              <div className="reveal rd-1 text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-coral text-white text-sm font-extrabold ring-4 ring-background">
                  1
                </span>
                <h3 className="mt-3 text-xl tracking-tight">Your record arrives</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  After a pro does the work, your home shows up, already filled in. Claim it.
                </p>
                <div className="mt-7">
                  <Phone>
                    <div className="rounded-xl bg-teal text-white px-3.5 py-3 flex items-center gap-2.5 text-left">
                      <span className="w-9 h-9 shrink-0 rounded-lg bg-white/15 flex items-center justify-center text-[10px] font-extrabold">
                        ABC
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold leading-tight">
                          ABC Water Treatment
                        </span>
                        <span className="block text-[11px] text-white/75">added to your home</span>
                      </span>
                    </div>
                    <div className="px-1 pt-1 text-sm font-extrabold text-ink text-left">
                      Your water softener
                    </div>
                    <PhoneRow
                      left={<span className="text-sm text-muted">Bradford White</span>}
                      right={<span className="text-sm font-semibold text-ink">since 2021</span>}
                    />
                    <div className="rounded-xl bg-tealbg text-tealdark px-3.5 py-2.5 text-sm font-semibold text-left flex items-center gap-2">
                      <ShieldCheck size={17} animate={false} className="shrink-0" />
                      Warranty to 2031
                    </div>
                    <Btn variant="coral" className="w-full">
                      Claim your home
                    </Btn>
                  </Phone>
                </div>
              </div>

              {/* Step 2 — your home fills itself */}
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
                    <PhoneRow
                      left={
                        <span className="block text-left">
                          <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                            Water softener
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="block text-xs text-muted">Serviced today</span>
                        </span>
                      }
                      right={<TradeIcon trade="water_treatment" size={17} className="text-muted" />}
                    />
                    <PhoneRow
                      left={
                        <span className="block text-left">
                          <span className="block text-sm font-bold text-ink">Furnace</span>
                          <span className="block text-xs text-muted">Service due Nov</span>
                        </span>
                      }
                      right={<TradeIcon trade="hvac" size={17} className="text-muted" />}
                    />
                    <PhoneRow
                      left={
                        <span className="block text-left">
                          <span className="block text-sm font-bold text-ink">Water heater</span>
                          <span className="block text-xs text-muted">Under warranty</span>
                        </span>
                      }
                      right={<TradeIcon trade="electrical" size={17} className="text-muted" />}
                    />
                    <PhoneRow
                      left={
                        <span className="block text-left">
                          <span className="block text-sm font-bold text-ink">Roof</span>
                          <span className="block text-xs text-muted">Inspected 2024</span>
                        </span>
                      }
                      right={<RoofIcon size={17} className="text-muted" />}
                    />
                  </Phone>
                </div>
              </div>

              {/* Step 3 — use it for years */}
              <div className="reveal rd-3 text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-teal text-white text-sm font-extrabold ring-4 ring-background">
                  3
                </span>
                <h3 className="mt-3 text-xl tracking-tight">Use it for years</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  Rebook your trusted pros, and hand a buyer the full history when you sell.
                </p>
                <div className="mt-7">
                  <Phone title="Selling your home" floatDelay="-3.2s">
                    <div className="rounded-xl bg-indigobg px-3.5 py-4 text-center">
                      <LinkIcon size={18} className="mx-auto text-indigodark" />
                      <div className="mt-1.5 text-sm font-bold text-indigodark">
                        Full history, one link
                      </div>
                    </div>
                    <PhoneRow
                      left={<span className="text-sm text-muted">Service records</span>}
                      right={
                        <span className="text-sm font-semibold text-ink tnum">28 verified</span>
                      }
                    />
                    <PhoneRow
                      left={<span className="text-sm text-muted">Warranties</span>}
                      right={<span className="text-sm font-semibold text-ink tnum">6 active</span>}
                    />
                    <Btn variant="coral" className="w-full">
                      Share with buyer
                    </Btn>
                  </Phone>
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* Your pros */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead
              accent="coral"
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
                  <div className="rounded-xl bg-coralbg px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm font-bold text-coraldark">
                      <UserPlusIcon size={17} className="shrink-0" /> Invite a pro to add it
                    </span>
                    <span className="text-coraldark">›</span>
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
                        <span className="flex items-center gap-2.5 text-left">
                          <span
                            className={`w-9 h-9 shrink-0 rounded-lg ${p.bg} text-white flex items-center justify-center text-[10px] font-extrabold`}
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
                        <span className="shrink-0 rounded-full bg-coral text-white text-xs font-bold px-3 py-1.5">
                          Rebook
                        </span>
                      }
                    />
                  ))}
                  <div className="rounded-xl bg-coralbg px-3.5 py-2.5 text-center text-sm font-bold text-coraldark">
                    + Add a pro
                  </div>
                </Phone>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* Zero effort + when you sell */}
      <section className="py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal rounded-[26px] bg-coralbg p-8 sm:p-12 overflow-hidden">
            <Eyebrow accent="coral">Zero effort</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">It fills itself.</h2>
            <p className="mt-4 text-coraldark max-w-2xl">
              No spreadsheets, no scanning manuals, no chore that you quit in a week. When a pro
              does the work, your record updates on its own.
            </p>
            <SelfWritingLine />
          </div>

          <div className="mt-16 grid md:grid-cols-[1.15fr_1fr] gap-10 items-center">
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
            <div className="reveal rd-2 liftable rounded-[22px] border border-line bg-paper p-6">
              <div className="rounded-xl bg-indigobg px-4 py-5 text-center">
                <LinkIcon size={20} className="mx-auto text-indigodark" />
                <div className="mt-1.5 text-sm font-bold text-indigodark">
                  homesbrain.com/r/maple-st-142
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <PhoneRow
                  left={<span className="text-sm text-muted">Owner since</span>}
                  right={<span className="text-sm font-semibold text-ink tnum">2019</span>}
                />
                <PhoneRow
                  left={<span className="text-sm text-muted">Systems documented</span>}
                  right={<span className="text-sm font-semibold text-ink tnum">11 of 11</span>}
                />
                <PhoneRow
                  left={<span className="text-sm text-muted">Last service</span>}
                  right={<span className="text-sm font-semibold text-ink">Today</span>}
                />
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
              accent="coral"
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
              <Btn variant="coral" size="lg">
                Claim your home
              </Btn>
            </Link>
          </div>
        </InView>
      </section>
    </MarketingShell>
  );
}
