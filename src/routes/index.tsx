import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Btn, Eyebrow, SectionHead } from "@/lib/ui";
import {
  CountUp,
  DocumentIcon,
  LinkIcon,
  Scribble,
  ShieldCheck,
  TradeIcon,
} from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
import { ForgettingScene } from "@/components/forgetting-scene";
import { MarketingShell, marketingHead, Phone, PhoneRow } from "@/components/marketing";

export const Route = createFileRoute("/")({
  head: () =>
    marketingHead({
      title: "HomesBrain: The living record for every home.",
      description:
        "Every repair, appliance, and warranty in one place. Built by the pros who fix your home. Owned by you for life.",
      path: "/",
    }),
  component: Landing,
});

/* ---- Motion helper (same pattern as the audience pages) ---- */

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

/* ---- How-it-works choreography helpers ---- */

/* Inline delay for the .seq sequenced reveal (styles.css). */
const seq = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* Dashed indigo arrow that joins the how-it-works sequence: points right
   between the phones on desktop, down between the stacked steps on mobile. */
function FlowArrow({
  delay,
  direction = "right",
}: {
  delay: number;
  direction?: "right" | "down";
}) {
  return (
    <div className="seq text-indigo" style={seq(delay)} aria-hidden="true">
      {direction === "right" ? (
        <svg viewBox="0 0 96 34" fill="none" className="w-full">
          <path
            d="M4 26C28 8 58 6 82 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 7"
            className="dash-flow"
          />
          <path
            d="M74 7l12 9-14 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 34 52" fill="none" className="h-12 w-auto">
          <path
            d="M17 4c-7 11 9 22 3 36"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 7"
            className="dash-flow"
          />
          <path
            d="M11 36l8 10 7-12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}


/* Ledger-style stat cell: animated count-up + indigo underline that draw on scroll-in. */
function StatFigure({
  tag,
  prefix,
  value,
  suffix,
  caption,
}: {
  tag: string;
  prefix: string;
  value: number;
  suffix: string;
  caption: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative px-6 py-12 text-center sm:py-14">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigobg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo">
        <span className="h-1 w-1 rounded-full bg-indigo" aria-hidden="true" />
        {tag}
      </span>
      <div className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-tight text-ink tnum leading-none">
        {prefix}
        {visible ? <CountUp value={value} duration={1400} /> : <span className="tnum">0</span>}
        <span className="text-indigo">{suffix}</span>
      </div>
      <div className="relative mt-4 h-[3px] w-full">
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[3px] -translate-x-1/2 rounded-full bg-indigo/70 transition-[width] duration-[900ms] ease-out"
          style={{ width: visible ? "3.5rem" : "0rem" }}
        />
      </div>
      <div className="mt-3 text-sm font-semibold text-muted">{caption}</div>
    </div>
  );
}

/* ---- Page data ---- */

const PROBLEM_PANELS = [
  {
    accent: "indigo" as const,
    eyebrow: "Homeowners",
    title: "You start from zero.",
    body: "The softener dies and you have no model, no install date, no warranty. You pay a diagnostic just to learn what you already own.",
    img: "/images/landing/problem-homeowner.jpg",
    imgAlt: "A couple at their kitchen table puzzling over a repair bill they can't explain",
    imgPos: "object-[50%_32%]",
    chip: "Warranty? · no record found",
  },
  {
    accent: "indigo" as const,
    eyebrow: "Pros",
    title: "The pro gets forgotten.",
    body: "Great work, then gone. Two years later you Google a stranger instead of calling the pro who already knows your home.",
    img: "/images/landing/problem-pro.jpg",
    imgAlt: "An electrician doing careful work on a home's wiring",
    imgPos: "object-[50%_38%]",
    chip: "Last visit · 2 years ago",
  },
];

const PROBLEM_STATS = [
  { tag: "Cost", prefix: "~$", value: 15, suffix: "B", caption: "lost every year" },
  { tag: "Reach", prefix: "", value: 85, suffix: "M", caption: "US homes" },
  { tag: "Force", prefix: "", value: 700, suffix: "K", caption: "small pros" },
];

/* The three pillars, shown as verified rows inside the record card. */
const RECORD_PILLARS = [
  {
    icon: "shield" as const,
    title: "Verified at the source",
    body: "written by the pro who did the work.",
  },
  {
    icon: "document" as const,
    title: "Owned by you",
    body: "across every pro, yours for life.",
  },
  {
    icon: "link" as const,
    title: "Follows the home",
    body: "switch pros, keep the history.",
  },
];

/* What an invoice actually captures - and doesn't. */
const INVOICE_LINES = [
  { k: "Labor", v: "$85.00" },
  { k: "Parts", v: "$40.00" },
  { k: "Total", v: "$125.00", strong: true },
];

const INVOICE_BLANKS = [
  { k: "Model", v: "not listed" },
  { k: "Serial", v: "not listed" },
  { k: "Warranty", v: "not listed" },
];

const RECORD_ROWS = [
  { k: "Equipment", v: "Softener · WS-48" },
  { k: "Serial", v: "WS48-30291" },
  { k: "Installed", v: "Mar 2024" },
  { k: "Warranty", v: "Until Mar 2031" },
];

const TRUST_ITEMS = [
  "Free for homeowners, forever",
  "Verified by the pros",
  "Owned for life",
  "No data entry",
];

const FAQ = [
  {
    q: "Is it really free for homeowners?",
    a: "Yes. Free forever, owned for life.",
  },
  {
    q: "Do I have to enter anything?",
    a: "No. It fills itself when a pro does the work.",
  },
  {
    q: "What if I change pros?",
    a: "The record stays with your home, not the contractor.",
  },
  {
    q: "Is my data mine?",
    a: "Always. Yours to keep, export, and share.",
  },
];

/* The circled arrow between the invoice and the record in the why-different section. */
function ComparisonArrow({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid h-11 w-11 place-items-center rounded-full border border-line bg-paper text-indigo shadow-[0_8px_20px_-12px_rgba(22,22,15,0.4)] ${className}`}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 12h14m-5-5 5 5-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* Colored step numeral used in the how-it-works section. */
function StepBadge({ n, accent }: { n: number; accent: "indigo" | "coral" }) {
  const bg = { indigo: "bg-indigo", coral: "bg-coral" }[accent];
  return (
    <span
      className={`relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full ${bg} text-white text-sm font-extrabold ring-4 ring-background`}
    >
      {n}
    </span>
  );
}

/* ---- Page ---- */

function Landing() {
  const [heroStep, setHeroStep] = useState(0);

  // Slow cycle of the house scene's accent so the hero visual stays alive.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(() => setHeroStep((s) => (s + 1) % 3), 3500);
    return () => clearInterval(t);
  }, []);

  const heroKey = (["pro", "record", "owner"] as const)[heroStep];

  return (
    <MarketingShell mobileCta={{ label: "Start free", to: "/start", variant: "indigo" }}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="text-center lg:text-left">
          <div className="anim-fade-up">
            <Eyebrow accent="indigo">A Carfax for homes that writes itself</Eyebrow>
          </div>
          <h1 className="anim-fade-up d-1 mt-4 text-5xl sm:text-6xl tracking-tight text-ink leading-[1.04]">
            The living record for{" "}
            <span className="relative inline-block">
              every home.
              <Scribble className="absolute -bottom-2 left-0 w-full h-3" />
            </span>
          </h1>
          <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0">
            Every repair, appliance, and warranty in one place. Built by the pros who fix your home.
            Owned by you for life.
          </p>
          <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <Link to="/login">
              <Btn variant="indigo" size="lg">
                I own a home
              </Btn>
            </Link>
            <Link to="/for-pros">
              <Btn variant="indigo" size="lg">
                I am a pro
              </Btn>
            </Link>
          </div>
          <div className="anim-fade-up d-4 mt-8 flex items-center justify-center lg:justify-start gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo" animate={false} /> Recall checks
              included
            </span>
            <span>·</span>
            <span>No credit card</span>
            <span>·</span>
            <span>Free for homeowners, forever</span>
          </div>
        </div>
        <div className="anim-scale-in d-2 hidden sm:block">
          <CoreLoopScene step={heroKey} className="w-full max-w-md mx-auto" />
        </div>
      </section>

      {/* 1 · The problem - the forgetting tax */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="The problem"
              title="Your home forgets. So does the pro who fixed it."
              sub="Every year, homeowners and the pros who serve them lose track of each other, and it costs both sides billions. We call it the forgetting tax."
            />
          </div>
          <div className="reveal rd-1">
            <ForgettingScene className="mt-12 mx-auto max-w-4xl" />
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {PROBLEM_PANELS.map((p, i) => (
              <div key={p.title} className={`reveal rd-${i + 1} h-full`}>
                <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-paper shadow-[0_18px_36px_-28px_rgba(22,22,15,0.4)]">
                  <div className="flex-1 p-7 sm:p-8">
                    <span className="inline-flex items-center gap-2 rounded-full bg-soft px-3.5 py-1.5 text-xs font-bold text-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
                      {p.chip}
                    </span>
                    <div className="mt-5">
                      <Eyebrow accent={p.accent}>{p.eyebrow}</Eyebrow>
                    </div>
                    <h3 className="mt-3 text-2xl tracking-tight text-ink">{p.title}</h3>
                    <p className="mt-3 text-[15px] text-muted">{p.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* The stakes, rendered as a quiet ledger card - indigo accents, dashed rules, animated counts */}
          <div className="reveal rd-3 mt-10 overflow-hidden rounded-[22px] border border-line bg-paper shadow-[0_18px_36px_-28px_rgba(22,22,15,0.35)]">
            <div className="grid divide-y divide-dashed divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROBLEM_STATS.map((s) => (
                <StatFigure
                  key={s.tag}
                  tag={s.tag}
                  prefix={s.prefix}
                  value={s.value}
                  suffix={s.suffix}
                  caption={s.caption}
                />
              ))}
            </div>
          </div>
          <p className="reveal rd-4 mt-4 text-center text-xs text-muted">
            Illustrative estimates of the US home-services forgetting tax.
          </p>
        </InView>
      </section>

      {/* 2 · How it works */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <InView>
            <div className="reveal">
              <SectionHead
                accent="indigo"
                eyebrow="How it works"
                title="The job creates the record. The record keeps you connected."
              />
            </div>
          </InView>
          {/* The loop plays out left to right: each phone fills in one box at a
              time, and a dashed arrow hands off to the next step. Delays walk a
              single global timeline. The grid gets its own InView so the
              sequence starts when the phones are on screen, not the header. */}
          <InView threshold={0.25}>
            <div className="relative mt-16 grid md:grid-cols-3 gap-8 md:gap-6">
              {/* Desktop hand-off arrows between the phones */}
              <div className="pointer-events-none absolute left-1/3 top-[45%] z-10 hidden w-16 -translate-x-1/2 md:block lg:w-24">
                <FlowArrow delay={1.85} />
              </div>
              <div className="pointer-events-none absolute left-2/3 top-[45%] z-10 hidden w-16 -translate-x-1/2 md:block lg:w-24">
                <FlowArrow delay={3.65} />
              </div>

              {/* Step 1 - a pro does the work */}
              <div className="reveal rd-1 text-center">
                <StepBadge n={1} accent="indigo" />
                <h3 className="mt-3 text-xl tracking-tight">A pro does the work</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  They snap a photo or sync the job. 30 seconds, no forms.
                </p>
                <div className="mt-7">
                  <Phone title="Log this job">
                    <div className="seq" style={seq(0.5)}>
                      <div className="rounded-2xl border-2 border-dashed border-indigo/40 bg-indigobg/60 px-3 py-4 text-center">
                        <div className="text-xl leading-none" aria-hidden="true">
                          📷
                        </div>
                        <div className="mt-2 text-xs font-bold text-indigodark">
                          Snap the nameplate
                        </div>
                      </div>
                    </div>
                    <div className="seq" style={seq(0.8)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Make</span>}
                        right={
                          <span className="text-sm font-semibold text-ink">Bradford White</span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(1.1)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Warranty</span>}
                        right={<span className="text-sm font-semibold text-ink">to 2031</span>}
                      />
                    </div>
                    <div className="seq" style={seq(1.4)}>
                      <div className="rounded-xl bg-indigo px-3.5 py-2.5 text-center text-[13px] font-bold text-white">
                        Done in 30 sec
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>

              {/* Mobile hand-off arrow 1 → 2 */}
              <div className="-my-1 flex justify-center md:hidden">
                <FlowArrow delay={1.85} direction="down" />
              </div>

              {/* Step 2 - the home updates itself */}
              <div className="reveal rd-2 text-center">
                <StepBadge n={2} accent="indigo" />
                <h3 className="mt-3 text-xl tracking-tight">Your home updates itself</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  Equipment, warranty, and service history land in your record, verified.
                </p>
                <div className="mt-7">
                  <Phone title="Your home" floatDelay="-1.6s">
                    <div className="seq" style={seq(2.3)}>
                      <PhoneRow
                        left={
                          <span className="block text-left">
                            <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                              Water softener
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-indigo pulse-dot"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="block text-xs text-muted">Serviced today</span>
                          </span>
                        }
                        right={
                          <TradeIcon trade="water_treatment" size={17} className="text-muted" />
                        }
                      />
                    </div>
                    <div className="seq" style={seq(2.6)}>
                      <PhoneRow
                        left={
                          <span className="block text-left">
                            <span className="block text-sm font-bold text-ink">Furnace</span>
                            <span className="block text-xs text-muted">Service due Nov</span>
                          </span>
                        }
                        right={<TradeIcon trade="hvac" size={17} className="text-muted" />}
                      />
                    </div>
                    <div className="seq" style={seq(2.9)}>
                      <PhoneRow
                        left={
                          <span className="block text-left">
                            <span className="block text-sm font-bold text-ink">Water heater</span>
                            <span className="block text-xs text-muted">Under warranty</span>
                          </span>
                        }
                        right={<TradeIcon trade="electrical" size={17} className="text-muted" />}
                      />
                    </div>
                    <div className="seq" style={seq(3.2)}>
                      <div className="rounded-xl bg-indigobg text-indigodark px-3.5 py-2.5 text-sm font-semibold text-left flex items-center gap-2">
                        <ShieldCheck size={17} animate={false} className="shrink-0" />
                        Verified service history
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>

              {/* Mobile hand-off arrow 2 → 3 */}
              <div className="-my-1 flex justify-center md:hidden">
                <FlowArrow delay={3.65} direction="down" />
              </div>

              {/* Step 3 - it pays off for years */}
              <div className="reveal rd-3 text-center">
                <StepBadge n={3} accent="coral" />
                <h3 className="mt-3 text-xl tracking-tight">It pays off for years</h3>
                <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                  Reminders, one-tap rebooking, and one link that sells your home faster.
                </p>
                <div className="mt-7">
                  <Phone title="This month" floatDelay="-3.2s">
                    <div className="seq" style={seq(4.1)}>
                      <PhoneRow
                        left={
                          <span className="block text-left">
                            <span className="block text-sm font-bold text-ink">
                              Softener service
                            </span>
                            <span className="block text-xs text-muted">Due this week</span>
                          </span>
                        }
                        right={
                          <span className="shrink-0 rounded-full bg-coral text-white text-xs font-bold px-3 py-1.5">
                            Rebook
                          </span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(4.4)}>
                      <div className="rounded-xl bg-indigobg px-3.5 py-4 text-center">
                        <LinkIcon size={18} className="mx-auto text-indigodark" />
                        <div className="mt-1.5 text-sm font-bold text-indigodark">
                          Full history, one link
                        </div>
                      </div>
                    </div>
                    <div className="seq" style={seq(4.7)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Service records</span>}
                        right={
                          <span className="text-sm font-semibold text-ink tnum">28 verified</span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(5.0)}>
                      <div className="rounded-xl bg-coral px-3.5 py-2.5 text-center text-[13px] font-bold text-white">
                        Share with buyer
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>
            </div>
          </InView>
        </div>
      </section>

      {/* 3 · Why it's different - the invoice vs. the record */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="Why it's different"
              title="An invoice is not a record."
            />
          </div>

          <div className="relative mt-14 mx-auto max-w-4xl grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* The invoice - dead paper, deliberately outside the brand system */}
            <div className="reveal rd-1">
              <div className="relative mx-auto max-w-[330px] -rotate-[1.5deg] rounded-lg border border-line bg-paper p-6 font-mono text-sm text-muted shadow-[0_10px_24px_-18px_rgba(22,22,15,0.3)]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.14em]">Invoice</span>
                  <span className="text-xs">#4821</span>
                </div>
                <div className="mt-1 text-xs">AquaPure Water Co. · Mar 12, 2024</div>
                <div className="mt-4 space-y-1.5 border-t border-dashed border-line pt-4">
                  {INVOICE_LINES.map((l) => (
                    <div
                      key={l.k}
                      className={`flex justify-between ${l.strong ? "font-bold text-ink" : ""}`}
                    >
                      <span>{l.k}</span>
                      <span className="tnum">{l.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-dashed border-line pt-4 text-xs">
                  {INVOICE_BLANKS.map((l) => (
                    <div key={l.k} className="flex justify-between">
                      <span>{l.k}</span>
                      <span>{l.v}</span>
                    </div>
                  ))}
                </div>
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[10deg] rounded border-2 border-muted/25 px-3 py-1 text-lg font-bold uppercase tracking-[0.2em] text-muted/25"
                  aria-hidden="true"
                >
                  Paid
                </span>
              </div>
              <p className="mt-5 text-center text-sm text-muted">
                Filed in a drawer. Gone in a year.
              </p>
            </div>

            {/* Arrow - stacked flow on mobile, floating between columns on desktop */}
            <div className="md:hidden -my-2 flex justify-center" aria-hidden="true">
              <ComparisonArrow className="rotate-90" />
            </div>
            <div
              className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <ComparisonArrow />
            </div>

            {/* The record - the same job, kept for life */}
            <div className="reveal rd-2">
              <div className="mx-auto max-w-[360px] rounded-[22px] border border-line bg-paper p-5 shadow-[0_18px_36px_-24px_rgba(22,22,15,0.35)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigobg text-indigodark">
                    <TradeIcon trade="water_treatment" size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink">AquaPure Water Co.</div>
                    <div className="text-xs text-muted">Softener install · Mar 2024</div>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-indigobg px-2.5 py-1 text-[11px] font-bold text-indigodark">
                    Verified
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-line divide-y divide-line text-sm">
                  {RECORD_ROWS.map((r) => (
                    <div key={r.k} className="flex items-center justify-between gap-3 px-3.5 py-2">
                      <span className="text-muted">{r.k}</span>
                      <span className="font-semibold text-ink tnum">{r.v}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2">
                    <span className="text-muted">Next service</span>
                    <span className="rounded-full bg-amberbg px-2.5 py-0.5 text-xs font-bold text-amberdark">
                      Oct 2026 · due
                    </span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {RECORD_PILLARS.map((p) => (
                    <li key={p.title} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigobg text-indigodark">
                        {p.icon === "shield" && <ShieldCheck size={14} animate={false} />}
                        {p.icon === "document" && <DocumentIcon size={14} />}
                        {p.icon === "link" && <LinkIcon size={14} />}
                      </span>
                      <span className="text-muted">
                        <span className="font-bold text-ink">{p.title}.</span> {p.body}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-5 text-center text-sm text-muted">
                Claimed free. Kept for the life of the home.
              </p>
            </div>
          </div>

          <p className="reveal rd-3 mt-12 text-center text-[15px] text-muted max-w-2xl mx-auto">
            Field-service tools lock the record to one vendor. Home apps sit empty because they ask
            you to fill them.{" "}
            <span className="font-semibold text-ink">
              HomesBrain is built by the pros, filled by the work, and owned by you.
            </span>
          </p>
        </InView>
      </section>

      {/* 4 · Trust strip */}
      <section className="border-y border-line bg-soft">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold text-ink">
            {TRUST_ITEMS.map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-indigo/50" aria-hidden="true" />}
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-muted">
            Starting with the trades of St. Johns County, Florida.
          </p>
        </div>
      </section>

      {/* 5 · Two paths - the router lives on */}
      <section className="py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="reveal rd-1">
              <div className="h-full rounded-[26px] bg-indigobg p-7 sm:p-8 flex flex-col items-start">
                <Eyebrow accent="indigo">Homeowners</Eyebrow>
                <h3 className="mt-3 text-2xl sm:text-[27px] leading-tight tracking-tight text-ink">
                  A home that remembers itself.
                </h3>
                <p className="mt-2.5 text-[15px] text-indigodark">Free forever. No data entry.</p>
                <div className="mt-auto pt-6">
                  <Link to="/for-homeowners">
                    <Btn variant="indigo" size="lg">
                      See homeowners
                    </Btn>
                  </Link>
                </div>
              </div>
            </div>
            <div className="reveal rd-2">
              <div className="h-full rounded-[26px] bg-indigobg p-7 sm:p-8 flex flex-col items-start">
                <Eyebrow accent="indigo">Pros</Eyebrow>
                <h3 className="mt-3 text-2xl sm:text-[27px] leading-tight tracking-tight text-ink">
                  Never lose a<br className="hidden md:inline" /> customer again.
                </h3>
                <p className="mt-2.5 text-[15px] text-indigodark">
                  Log a job in 30 seconds. Win the rebook.
                </p>
                <div className="mt-auto pt-6">
                  <Link to="/for-pros">
                    <Btn variant="indigo" size="lg">
                      See pros
                    </Btn>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* 6 · FAQ */}
      <section className="bg-soft border-t border-line py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead accent="indigo" eyebrow="FAQ" title="Short answers, straight." />
          </div>
          <dl className="mt-12 space-y-3">
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                className={`reveal rd-${i + 1} liftable rounded-2xl border border-line bg-white px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8`}
              >
                <dt className="flex items-center gap-3 font-bold text-ink sm:w-2/5 sm:shrink-0">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigobg text-sm font-extrabold text-indigodark"
                  >
                    ?
                  </span>
                  {f.q}
                </dt>
                <dd className="mt-2 pl-10 text-[15px] leading-relaxed text-muted sm:mt-0 sm:flex-1 sm:pl-0">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </InView>
      </section>

      {/* 7 · Final CTA */}
      <section className="py-24">
        <InView className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="reveal text-3xl sm:text-5xl tracking-tight text-ink">
            Every home deserves a memory.
          </h2>
          <div className="reveal rd-2 mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Btn variant="indigo" size="lg">
                I own a home
              </Btn>
            </Link>
            <Link to="/for-pros">
              <Btn variant="indigo" size="lg">
                I am a pro
              </Btn>
            </Link>
          </div>
        </InView>
      </section>
    </MarketingShell>
  );
}
