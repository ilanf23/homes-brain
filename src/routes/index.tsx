import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Btn, Eyebrow, SectionHead } from "@/lib/ui";
import { LinkIcon, Scribble, ShieldCheck, TradeIcon } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
import { ForgettingScene } from "@/components/forgetting-scene";
import { MarketingShell, marketingHead } from "@/components/marketing";

export const Route = createFileRoute("/")({
  head: () =>
    marketingHead({
      title: "HomesBrain — The living record for every home.",
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

/* ---- Phone mockup primitives (shared visual language with the audience pages) ---- */

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
        {title && (
          <div className="px-1 pt-1 pb-2 text-sm font-extrabold text-ink text-left">{title}</div>
        )}
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

/* ---- Page data ---- */

const PROBLEM_PANELS = [
  {
    accent: "indigo" as const,
    eyebrow: "Homeowners",
    title: "You start from zero.",
    body: "The softener dies and you have no model, no install date, no warranty. You pay a diagnostic just to learn what you already own.",
  },
  {
    accent: "indigo" as const,
    eyebrow: "Pros",
    title: "The pro gets forgotten.",
    body: "Great work, then gone. Two years later you Google a stranger instead of calling the pro who already knows your home.",
  },
];

const PROBLEM_STATS = [
  { value: "~$15B", caption: "lost every year" },
  { value: "85M", caption: "homes" },
  { value: "700K", caption: "small pros" },
];

const DIFFERENT_CARDS = [
  {
    title: "Verified at the source",
    body: "Written by the pro who did the work, not typed from memory.",
  },
  {
    title: "Owned by you",
    body: "Your record, across every pro, yours to keep for life.",
  },
  {
    title: "Portable",
    body: "It follows the home, not the contractor. Switch pros, keep the history.",
  },
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
    a: "Always — yours to keep, export, and share.",
  },
];

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
    <MarketingShell
      mobileCta={{ label: "Start free — for pros", to: "/pro/signup", variant: "indigo" }}
    >
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
            Every repair, appliance, and warranty in one place. Built by the pros who fix your
            home. Owned by you for life.
          </p>
          <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <Link to="/for-homeowners">
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
              <ShieldCheck size={16} className="text-indigo" animate={false} /> Recall checks included
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

      {/* 1 · The problem — the forgetting tax */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="The problem"
              title="Your home forgets. So does the pro who fixed it."
              sub="Every year, homeowners and the pros who serve them lose track of each other — and it costs both sides billions. We call it the forgetting tax."
            />
          </div>
          <div className="reveal rd-1">
            <ForgettingScene className="mt-12 mx-auto max-w-4xl" />
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {PROBLEM_PANELS.map((p, i) => (
              <div key={p.title} className={`reveal rd-${i + 1}`}>
                <div
                  className="h-full rounded-[22px] p-7 sm:p-8 bg-indigobg"
                >
                  <Eyebrow accent={p.accent}>{p.eyebrow}</Eyebrow>
                  <h3 className="mt-3 text-2xl tracking-tight text-ink">{p.title}</h3>
                  <p
                    className="mt-3 text-[15px] text-indigodark"
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="reveal rd-3 mt-10 rounded-[22px] border border-line bg-paper divide-y divide-line sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-3">
            {PROBLEM_STATS.map((s) => (
              <div key={s.value} className="px-6 py-8 text-center">
                <div className="text-4xl font-extrabold tracking-tight text-ink tnum">
                  {s.value}
                </div>
                <div className="mt-1.5 text-sm text-muted">{s.caption}</div>
              </div>
            ))}
          </div>
          <p className="reveal rd-4 mt-4 text-center text-xs text-muted">
            Illustrative estimates of the US home-services forgetting tax.
          </p>
        </InView>
      </section>

      {/* 2 · How it works */}
      <section id="how" className="py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="How it works"
              title="The job creates the record. The record keeps you connected."
            />
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-12 md:gap-6">
            {/* Step 1 — a pro does the work */}
            <div className="reveal rd-1 text-center">
              <StepBadge n={1} accent="indigo" />
              <h3 className="mt-3 text-xl tracking-tight">A pro does the work</h3>
              <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                They snap a photo or sync the job. 30 seconds, no forms.
              </p>
              <div className="mt-7">
                <Phone title="Log this job">
                  <div className="rounded-2xl border-2 border-dashed border-indigo/40 bg-indigobg/60 px-3 py-4 text-center">
                    <div className="text-xl leading-none" aria-hidden="true">
                      📷
                    </div>
                    <div className="mt-2 text-xs font-bold text-indigodark">Snap the nameplate</div>
                  </div>
                  <PhoneRow
                    left={<span className="text-sm text-muted">Make</span>}
                    right={<span className="text-sm font-semibold text-ink">Bradford White</span>}
                  />
                  <PhoneRow
                    left={<span className="text-sm text-muted">Warranty</span>}
                    right={<span className="text-sm font-semibold text-ink">to 2031</span>}
                  />
                  <div className="rounded-xl bg-indigo px-3.5 py-2.5 text-center text-[13px] font-bold text-white">
                    Done in 30 sec
                  </div>
                </Phone>
              </div>
            </div>

            {/* Step 2 — the home updates itself */}
            <div className="reveal rd-2 text-center">
              <StepBadge n={2} accent="indigo" />
              <h3 className="mt-3 text-xl tracking-tight">Your home updates itself</h3>
              <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                Equipment, warranty, and service history land in your record, verified.
              </p>
              <div className="mt-7">
                <Phone title="Your home" floatDelay="-1.6s">
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
                  <div className="rounded-xl bg-indigobg text-indigodark px-3.5 py-2.5 text-sm font-semibold text-left flex items-center gap-2">
                    <ShieldCheck size={17} animate={false} className="shrink-0" />
                    Verified service history
                  </div>
                </Phone>
              </div>
            </div>

            {/* Step 3 — it pays off for years */}
            <div className="reveal rd-3 text-center">
              <StepBadge n={3} accent="coral" />
              <h3 className="mt-3 text-xl tracking-tight">It pays off for years</h3>
              <p className="mt-2 text-sm text-muted max-w-[260px] mx-auto">
                Reminders, one-tap rebooking, and one link that sells your home faster.
              </p>
              <div className="mt-7">
                <Phone title="This month" floatDelay="-3.2s">
                  <PhoneRow
                    left={
                      <span className="block text-left">
                        <span className="block text-sm font-bold text-ink">Softener service</span>
                        <span className="block text-xs text-muted">Due this week</span>
                      </span>
                    }
                    right={
                      <span className="shrink-0 rounded-full bg-coral text-white text-xs font-bold px-3 py-1.5">
                        Rebook
                      </span>
                    }
                  />
                  <div className="rounded-xl bg-indigobg px-3.5 py-4 text-center">
                    <LinkIcon size={18} className="mx-auto text-indigodark" />
                    <div className="mt-1.5 text-sm font-bold text-indigodark">
                      Full history, one link
                    </div>
                  </div>
                  <PhoneRow
                    left={<span className="text-sm text-muted">Service records</span>}
                    right={<span className="text-sm font-semibold text-ink tnum">28 verified</span>}
                  />
                  <div className="rounded-xl bg-coral px-3.5 py-2.5 text-center text-[13px] font-bold text-white">
                    Share with buyer
                  </div>
                </Phone>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* 3 · Why it's different — the open quadrant */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="Why it's different"
              title="An invoice is not a record."
            />
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {DIFFERENT_CARDS.map((c, i) => (
              <div key={c.title} className={`reveal rd-${i + 1}`}>
                <div className="liftable h-full rounded-[22px] border border-line bg-paper p-7">
                  <span className="inline-flex w-11 h-11 rounded-2xl bg-indigobg text-indigodark items-center justify-center">
                    <ShieldCheck size={20} animate={false} />
                  </span>
                  <h3 className="mt-4 text-lg tracking-tight">{c.title}</h3>
                  <p className="mt-2 text-[15px] text-muted">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="reveal rd-4 mt-10 text-center text-[15px] text-muted max-w-2xl mx-auto">
            Field-service tools lock the record to one vendor. Home apps sit empty because they ask
            you to fill them. HomesBrain is the only record the homeowner truly owns — built by the
            pros, filled by the work.
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

      {/* 5 · Two paths — the router lives on */}
      <section className="py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="reveal rd-1">
              <div className="h-full rounded-[26px] bg-indigobg p-8 sm:p-10 flex flex-col items-start">
                <Eyebrow accent="indigo">Homeowners</Eyebrow>
                <h3 className="mt-3 text-2xl sm:text-3xl tracking-tight text-ink">
                  A home that remembers itself.
                </h3>
                <p className="mt-3 text-[15px] text-indigodark">Free forever. No data entry.</p>
                <div className="mt-auto pt-7">
                  <Link to="/for-homeowners">
                    <Btn variant="indigo" size="lg">
                      See homeowners
                    </Btn>
                  </Link>
                </div>
              </div>
            </div>
            <div className="reveal rd-2">
              <div className="h-full rounded-[26px] bg-indigobg p-8 sm:p-10 flex flex-col items-start">
                <Eyebrow accent="indigo">Pros</Eyebrow>
                <h3 className="mt-3 text-2xl sm:text-3xl tracking-tight text-ink">
                  Never lose a customer again.
                </h3>
                <p className="mt-3 text-[15px] text-indigodark">
                  Log a job in 30 seconds. Win the rebook.
                </p>
                <div className="mt-auto pt-7">
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
        <InView className="mx-auto max-w-3xl px-5">
          <div className="reveal">
            <SectionHead accent="indigo" eyebrow="FAQ" title="Short answers, straight." />
          </div>
          <dl className="mt-10">
            {FAQ.map((f, i) => (
              <div key={f.q} className={`reveal rd-${i + 1} border-b border-line py-5`}>
                <dt className="font-bold text-ink">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] text-muted">{f.a}</dd>
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
            <Link to="/for-homeowners">
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
