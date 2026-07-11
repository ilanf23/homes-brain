import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Btn, Card, Eyebrow, Field, Input, KV, Pill, SectionHead, Select } from "@/lib/ui";
import {
  CtaBand,
  MarketingShell,
  marketingHead,
  Phone,
  PhoneKV,
  PhoneRow,
} from "@/components/marketing";
import { CheckBurst, CountUp, LogoMark, Scribble, ShieldCheck } from "@/components/svg";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/partners")({
  head: () =>
    marketingHead({
      title: "HomesBrain partners: the record follows the home.",
      description:
        "Builders, realtors, inspectors, insurers, and home-watch firms: start the record at closing, inspection, or handover, and stay part of the home's story.",
      path: "/partners",
    }),
  component: Partners,
});

/* ---- Motion helper (same pattern as the other marketing pages) ---- */

/* Adds .in-view once the wrapper scrolls into the viewport, which triggers
   the CSS .reveal / .draw-path / .seq children. Fires once. */
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

/* Inline delay for the .seq sequenced reveal (styles.css). */
const seq = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* Floating UI chip laid over a photo. Same pattern as for-homeowners. */
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

/* Count-up gated on viewport entry, same pattern as the audience pages. */
function StatNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
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
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref}>{inView ? <CountUp value={value} /> : 0}</span>;
}

/* Colored step numeral, same as the landing how-it-works. */
function StepBadge({ n, accent }: { n: number; accent: "indigo" | "coral" }) {
  const bg = { indigo: "bg-amber", coral: "bg-coral" }[accent];
  return (
    <span
      className={`relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full ${bg} text-white text-sm font-extrabold ring-4 ring-background`}
    >
      {n}
    </span>
  );
}

/* Animated check used by the become-a-partner list. */
function DrawnCheck({ color = "var(--amber)", delay = 0 }: { color?: string; delay?: number }) {
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

/* ---- Page data ---- */

const PARTNER_TYPES = ["Builders", "Realtors", "Inspectors", "Insurers", "Home-watch firms"];

const FAQ_ITEMS = [
  {
    q: "Does it cost anything?",
    a: "Free to start. We win when the record proves useful.",
  },
  {
    q: "Who owns the record?",
    a: "The homeowner, always. Partners contribute to it and stay visible on it.",
  },
  {
    q: "What do we get out of it?",
    a: "Your name on a living record, in front of the owner for years, plus a professional handover artifact.",
  },
  {
    q: "Do you sell homeowner data?",
    a: "Never. The record belongs to the homeowner.",
  },
  {
    q: "Where do you operate?",
    a: "Starting with St. Johns County, Florida. Tell us where you are anyway.",
  },
];

const STEPS: { title: string; body: string; accent: "indigo" | "coral" }[] = [
  {
    title: "Tell us where you fit",
    body: "A short note through the form below. We reply within a couple of days.",
    accent: "indigo",
  },
  {
    title: "We wire it into your workflow",
    body: "Closing, inspection, or handover: the record starts where you already work.",
    accent: "indigo",
  },
  {
    title: "Every home remembers you",
    body: "Your name stays on the record, in front of the owner for years.",
    accent: "coral",
  },
];

const PROBLEM_STATS = [
  { value: "~$15B", caption: "the forgetting tax, every year" },
  { value: "~6M", caption: "homes change hands a year" },
  { value: "almost none", caption: "service records survive the sale" },
];

/* ---- Hero visual: the record card outliving three owners of the same home ---- */

function HandoffScene({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="mx-auto max-w-md rounded-[26px] border border-line bg-soft p-6 sm:p-7">
        {/* three ownerships, handed off left to right */}
        <div className="flex items-center justify-between gap-1.5">
          {(["Built · 2021", "Sold · 2024", "Sold · 2029"] as const).map((label, i) => (
            <div key={label} className="flex min-w-0 items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1.5 text-[11px] font-extrabold text-ink shadow-sm">
                {label}
              </span>
              {i < 2 && (
                <svg viewBox="0 0 34 12" className="w-7 shrink-0 text-amber" aria-hidden="true">
                  <path
                    d="M2 6h24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="3 5"
                    className="dash-flow"
                  />
                  <path
                    d="M24 2l6 4-6 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
        {/* the record card that persists through every sale */}
        <div className="anim-float mt-6 rounded-[22px] border border-line bg-paper p-5 shadow-[0_24px_48px_-28px_rgba(22,22,15,0.4)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LogoMark size={18} />
              <span className="text-sm font-extrabold text-ink">14 Palm Row</span>
            </div>
            <Pill accent="amber">Verified</Pill>
          </div>
          <div className="mt-4 space-y-2">
            <PhoneKV k="HVAC" v="Trane XR14 · 2021" />
            <PhoneKV k="Inspection" v="Clear · 2024" accentV />
            <PhoneKV k="Water heater" v="Serviced · 2029" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amberdark">
            <span className="pulse-dot h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            The record stays with the home
          </div>
        </div>
      </div>
    </div>
  );
}

/* The problem visual: paper records die at every sale; the HomesBrain line
   runs through the same closings unbroken. Draws when scrolled into view. */
function HandoffTimeline({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      {/* min-width keeps the in-SVG labels legible on phones; the card scrolls instead */}
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 720 208"
          className="w-full min-w-[560px]"
          role="img"
          aria-label="Timeline of a home sold twice: paper records fade out at each sale while the HomesBrain record continues unbroken."
        >
          {/* closing markers */}
          {[
            { x: 150, label: "Built 2021" },
            { x: 380, label: "Sold 2024" },
            { x: 610, label: "Sold 2029" },
          ].map((m) => (
            <g key={m.x}>
              <line
                x1={m.x}
                y1={34}
                x2={m.x}
                y2={168}
                stroke="var(--line)"
                strokeWidth={2}
                strokeDasharray="2 6"
              />
              <text
                x={m.x}
                y={22}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--muted)"
              >
                {m.label}
              </text>
            </g>
          ))}
          {/* lane 1: binders and PDFs, dying at each closing */}
          <text x={24} y={66} fontSize={12} fontWeight={700} fill="var(--muted)">
            Binders and PDFs
          </text>
          <path
            d="M24 88 H136"
            stroke="var(--muted)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.75}
          />
          <path
            d="M164 88 H366"
            stroke="var(--muted)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="8 6"
            opacity={0.45}
          />
          <path
            d="M394 88 H480"
            stroke="var(--muted)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="3 9"
            opacity={0.25}
          />
          {[380, 610].map((x) => (
            <g key={x} stroke="var(--muted)" strokeWidth={2.5} strokeLinecap="round" opacity={0.6}>
              <path d={`M${x - 7} 81 l14 14`} />
              <path d={`M${x + 7} 81 l-14 14`} />
            </g>
          ))}
          <text x={394} y={70} fontSize={11.5} fontWeight={600} fill="var(--muted)" opacity={0.7}>
            gone by the second sale
          </text>
          {/* lane 2: the HomesBrain record, unbroken */}
          <text x={24} y={132} fontSize={12} fontWeight={700} fill="var(--amber)">
            The HomesBrain record
          </text>
          <path
            d="M24 154 H696"
            stroke="var(--amber)"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={672}
            strokeDashoffset={672}
            className="draw-path"
            style={{ transitionDuration: "1.4s" }}
          />
          {[150, 380, 610].map((x) => (
            <circle key={x} cx={x} cy={154} r={5.5} fill="var(--amber)" />
          ))}
        </svg>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Two sales in, the binder is gone. The record is not.
      </p>
    </div>
  );
}

/* ---- Page ---- */

function Partners() {
  const [form, setForm] = useState({ name: "", company: "", type: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await logEvent(null, "partner_lead", { ...form });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingShell mobileCta={null}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="text-center lg:text-left">
          <div className="anim-fade-up">
            <Eyebrow accent="amber">For everyone who touches the home</Eyebrow>
          </div>
          <h1 className="anim-fade-up d-1 mt-4 text-5xl sm:text-6xl tracking-tight text-ink leading-[1.04]">
            Every home you touch{" "}
            <span className="relative inline-block">
              keeps a memory.
              <Scribble className="absolute -bottom-2 left-0 w-full h-3" />
            </span>
          </h1>
          <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0">
            If your business touches the home, you can start its record and stay part of its story
            for as long as the home stands.
          </p>
          <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <a href="#become-a-partner">
              <Btn variant="amber" size="lg">
                Become a partner
              </Btn>
            </a>
            <a href="#how-it-works">
              <Btn variant="secondary" size="lg">
                See how it works
              </Btn>
            </a>
          </div>
          <div className="anim-fade-up d-4 mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-amber" animate={false} /> Free to start
            </span>
            <span>·</span>
            <span>The homeowner owns the record</span>
            <span>·</span>
            <span>Verified at the source</span>
          </div>
        </div>
        <HandoffScene className="anim-scale-in d-2 hidden sm:block" />
      </section>

      {/* 1 · The handoff problem */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="amber"
              eyebrow="The handoff problem"
              title="Every closing wipes the home's memory."
              sub="The builder's binder gets lost in a garage. The inspection PDF dies in a download folder. The insurer underwrites blind. The new owner starts from zero."
            />
          </div>
          <div className="reveal rd-1 mt-12 rounded-[22px] border border-line bg-paper p-5 sm:p-8">
            <HandoffTimeline />
          </div>
          <div className="reveal rd-2 relative mt-10 overflow-hidden rounded-[22px]">
            <img
              src="/images/landing/problem-homes.jpg"
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-ink/60" aria-hidden="true" />
            <div className="relative grid divide-y divide-white/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROBLEM_STATS.map((s) => (
                <div key={s.value} className="px-6 py-10 sm:py-14 text-center">
                  <div className="text-4xl sm:text-[44px] font-extrabold tracking-tight text-white tnum [text-shadow:0_2px_16px_rgba(22,22,15,0.5)]">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-white/90 [text-shadow:0_1px_10px_rgba(22,22,15,0.6)]">
                    {s.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="reveal rd-3 mt-4 text-center text-xs text-muted">
            Illustrative estimates of the US home-services forgetting tax.
          </p>
        </InView>
      </section>

      {/* 2 · Who we work with */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <InView>
            <div className="reveal">
              <SectionHead
                accent="amber"
                eyebrow="Who we work with"
                title="Five doors into the same record."
                sub="Wherever you meet the home, the record starts there, and your name goes on it."
              />
            </div>
          </InView>

          <div className="mt-16 space-y-20">
            {/* Builders */}
            <InView>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="reveal">
                  <Pill accent="amber">Builders</Pill>
                  <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight text-ink">
                    Hand over the keys and the memory.
                  </h3>
                  <p className="mt-3 text-[15px] text-muted max-w-md">
                    Every new home leaves your hands with its record already alive: equipment,
                    serials, and warranties from day one. No binder to lose, nothing for the buyer
                    to type.
                  </p>
                </div>
                <div className="reveal rd-2">
                  <Phone title="Day one record" titleRight="New build">
                    <div className="seq" style={seq(0.3)}>
                      <PhoneKV k="HVAC" v="Trane XR14" />
                    </div>
                    <div className="seq" style={seq(0.6)}>
                      <PhoneKV k="Water heater" v="Bradford White 50g" />
                    </div>
                    <div className="seq" style={seq(0.9)}>
                      <PhoneKV k="Serial" v="BW50-77812" />
                    </div>
                    <div className="seq" style={seq(1.2)}>
                      <PhoneKV k="Warranty" v="to 2032" accentV />
                    </div>
                    <div className="seq" style={seq(1.5)}>
                      <div className="rounded-xl bg-amberbg px-3.5 py-2.5 text-center text-xs font-bold text-amberdark">
                        Handed over with the keys
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>
            </InView>

            {/* Realtors */}
            <InView>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="reveal md:order-2">
                  <Pill accent="amber">Realtors</Pill>
                  <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight text-ink">
                    List the home with its history attached.
                  </h3>
                  <p className="mt-3 text-[15px] text-muted max-w-md">
                    A verified service record answers the buyer's questions before they're asked. A
                    documented home is an easier close on both sides of the table.
                  </p>
                </div>
                <div className="reveal rd-2 md:order-1">
                  <div className="relative">
                    <img
                      src="/images/homeowners/sold-home.jpg"
                      alt="A sold sign in front of a well-kept home"
                      loading="lazy"
                      className="aspect-[4/3.2] w-full rounded-[22px] object-cover shadow-[0_28px_56px_-32px_rgba(22,22,15,0.45)]"
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-28 rounded-b-[22px] bg-gradient-to-t from-ink/50 to-transparent"
                      aria-hidden="true"
                    />
                    <PhotoChip className="left-4 top-4" float>
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber">
                        <ShieldCheck size={15} animate={false} /> Verified record
                      </div>
                    </PhotoChip>
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-paper/95 px-3 py-1 text-[11px] font-extrabold text-ink shadow-sm">
                        42 jobs · 6 yrs on file
                      </span>
                      <span className="rounded-full bg-coralbg px-3 py-1 text-[11px] font-extrabold text-coraldark shadow-sm">
                        Closes faster
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </InView>

            {/* Inspectors */}
            <InView>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="reveal">
                  <Pill accent="amber">Inspectors</Pill>
                  <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight text-ink">
                    Your inspection outlives the PDF.
                  </h3>
                  <p className="mt-3 text-[15px] text-muted max-w-md">
                    Findings become the seed of a living record instead of a report that dies in a
                    download folder. The buyer keeps your work in front of them for years.
                  </p>
                </div>
                <div className="reveal rd-2">
                  <Phone title="Inspection day" titleRight="4-point">
                    <div className="seq" style={seq(0.3)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Roof</span>}
                        right={<span className="text-sm font-semibold text-ink">2019 · good</span>}
                      />
                    </div>
                    <div className="seq" style={seq(0.6)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Electrical panel</span>}
                        right={<span className="text-sm font-semibold text-ink">200A · clear</span>}
                      />
                    </div>
                    <div className="seq" style={seq(0.9)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">HVAC</span>}
                        right={<span className="text-sm font-semibold text-ink">2021 · clear</span>}
                      />
                    </div>
                    <div className="seq" style={seq(1.2)}>
                      <div className="rounded-xl bg-amberbg px-3.5 py-2.5 text-center text-xs font-bold text-amberdark">
                        34 findings became record rows
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>
            </InView>

            {/* Insurers */}
            <InView>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="reveal md:order-2">
                  <Pill accent="amber">Insurers</Pill>
                  <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight text-ink">
                    Underwrite the home you can actually see.
                  </h3>
                  <p className="mt-3 text-[15px] text-muted max-w-md">
                    Maintained homes are lower-risk homes. Verified service history, straight from
                    the pros who did the work, is a signal you can price.
                  </p>
                </div>
                <div className="reveal rd-2 md:order-1">
                  <Card className="max-w-md mx-auto w-full">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-ink">14 Palm Row</span>
                      <Pill accent="amber">Verified history</Pill>
                    </div>
                    <div className="mt-3">
                      <KV k="Last service" v="Apr 2026" />
                      <KV k="Water heater age" v="3 yrs" />
                      <KV k="Roof" v="2019 · shingle" />
                      <KV k="Maintenance cadence" v="On schedule" mono={false} />
                    </div>
                  </Card>
                </div>
              </div>
            </InView>

            {/* Home-watch firms */}
            <InView>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="reveal">
                  <Pill accent="amber">Home-watch firms</Pill>
                  <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight text-ink">
                    Every visit, on the record.
                  </h3>
                  <p className="mt-3 text-[15px] text-muted max-w-md">
                    Log every walk-through of the homes you watch. Owners see the proof from
                    anywhere, and you keep the contract at renewal time.
                  </p>
                </div>
                <div className="reveal rd-2">
                  <Phone title="Visit log" titleRight="Weekly">
                    <div className="seq" style={seq(0.3)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Tue, Jun 30</span>}
                        right={<span className="text-sm font-semibold text-ink">All clear ✓</span>}
                      />
                    </div>
                    <div className="seq" style={seq(0.6)}>
                      <PhoneRow
                        left={<span className="text-sm text-muted">Fri, Jul 3</span>}
                        right={<span className="text-sm font-semibold text-ink">All clear ✓</span>}
                      />
                    </div>
                    <div className="seq" style={seq(0.9)}>
                      <div className="rounded-xl bg-amberbg px-3.5 py-2.5 text-xs font-bold text-amberdark">
                        Leak flagged · photo attached
                      </div>
                    </div>
                    <div className="seq" style={seq(1.2)}>
                      <div className="rounded-xl bg-amberbg px-3.5 py-2.5 text-center text-xs font-bold text-amberdark">
                        Owner sees every visit
                      </div>
                    </div>
                  </Phone>
                </div>
              </div>
            </InView>
          </div>

          {/* Someone else */}
          <InView>
            <p className="reveal mt-16 text-center text-[15px] text-muted">
              Property managers, warranty companies, utilities: if you touch the home, we want to
              talk.{" "}
              <a
                href="#become-a-partner"
                className="font-semibold text-amber underline underline-offset-4 hover:text-amberdark"
              >
                Tell us who you are below.
              </a>
            </p>
          </InView>
        </div>
      </section>

      {/* 3 · The partner math */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="amber"
              eyebrow="The partner math"
              title="Almost nothing to give. Years to get."
            />
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="reveal rd-1 rounded-2xl border border-line bg-white px-5 py-8 text-center">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber tnum">
                <StatNumber value={30} /> sec
              </div>
              <div className="mt-1.5 text-sm text-muted">for a pro to log a job</div>
            </div>
            <div className="reveal rd-2 rounded-2xl border border-line bg-white px-5 py-8 text-center">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber tnum">
                <StatNumber value={1} /> link
              </div>
              <div className="mt-1.5 text-sm text-muted">handed over at closing</div>
            </div>
            <div className="reveal rd-3 rounded-2xl border border-line bg-white px-5 py-8 text-center">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber">
                Life of the home
              </div>
              <div className="mt-1.5 text-sm text-muted">
                how long your name stays on the record
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* 4 · How partnering works */}
      <section id="how-it-works" className="py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal">
            <SectionHead
              accent="amber"
              eyebrow="How it works"
              title="Three steps, and the record starts working for you."
            />
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`reveal rd-${i + 1} text-center`}>
                <StepBadge n={i + 1} accent={s.accent} />
                <h3 className="mt-3 text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted max-w-[280px] mx-auto">{s.body}</p>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* 5 · FAQ */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal">
            <SectionHead accent="amber" eyebrow="FAQ" title="Short answers, straight." />
          </div>
          <dl className="mt-12 space-y-3">
            {FAQ_ITEMS.map((f, i) => (
              <div
                key={f.q}
                className={`reveal rd-${Math.min(i + 1, 6)} liftable rounded-2xl border border-line bg-white px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8`}
              >
                <dt className="flex items-center gap-3 font-bold text-ink sm:w-2/5 sm:shrink-0">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amberbg text-sm font-extrabold text-amberdark"
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

      {/* 6 · Become a partner */}
      <section id="become-a-partner" className="py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-start">
            <div className="reveal">
              <SectionHead
                center={false}
                accent="amber"
                eyebrow="Become a partner"
                title="Tell us where you fit"
                sub="A short note is all it takes."
              />
              <ul className="mt-8 space-y-4">
                {[
                  "A reply within a couple of days",
                  "No contracts to start",
                  "You keep your workflow. We wire the record into it",
                ].map((t, i) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-ink">
                    <DrawnCheck delay={i * 200} /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="reveal rd-2">
              {done ? (
                <div className="anim-scale-in text-center py-8">
                  <CheckBurst size={64} className="mx-auto text-amber" />
                  <h3 className="mt-4 text-xl font-semibold tracking-tight font-display">
                    Thanks, we'll be in touch.
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Your note is in. Expect a reply at {form.email || "your email"} shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <Field label="Your name">
                    <Input
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jordan Rivera"
                    />
                  </Field>
                  <Field label="Company">
                    <Input
                      required
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Rivera Homes"
                    />
                  </Field>
                  <Field label="What kind of partner are you?">
                    <Select
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="" disabled>
                        Choose one…
                      </option>
                      {PARTNER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="Other">Someone else</option>
                    </Select>
                  </Field>
                  <Field label="Work email">
                    <Input
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jordan@riverahomes.com"
                    />
                  </Field>
                  {error && (
                    <p role="alert" className="text-sm font-semibold text-red">
                      {error}
                    </p>
                  )}
                  <Btn
                    type="submit"
                    variant="amber"
                    size="lg"
                    loading={submitting}
                    className="w-full"
                  >
                    Become a partner
                  </Btn>
                </form>
              )}
            </Card>
          </div>
        </InView>
      </section>

      <CtaBand
        eyebrow="Partners"
        title="Give every home a memory from day one."
        sub="If your business touches the home, you can start its record and stay part of its story."
      >
        <a href="#become-a-partner">
          <Btn variant="amber" size="lg">
            Become a partner
          </Btn>
        </a>
      </CtaBand>
    </MarketingShell>
  );
}
