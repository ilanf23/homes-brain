import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Btn, Eyebrow } from "@/lib/ui";
import { CameraIcon, Scribble, ShieldCheck } from "@/components/svg";
import { MarketingShell, marketingHead, MsgBubble, Phone, PhoneBtn, PhoneKV, PipelinePhone } from "@/components/marketing";
import { MiniLifespansPicker } from "@/components/mini-lifespans";
import { allBrowseEntries, useCountUp } from "@/lib/make-it-last-visuals";

export const Route = createFileRoute("/")({
  head: () =>
    marketingHead({
      title: "HomesBrain: Every home remembers.",
      description:
        "The living record for every home. A pro logs the work in 30 seconds; your home keeps the record and warns you before the next failure.",
      path: "/",
    }),
  component: Landing,
});

/* ---- Motion helper ---- */
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

/* One type system: sans, weight 800, tight tracking. */
const H_SANS = "font-sans font-extrabold tracking-[-0.02em] text-ink";

/* Small, calm line-art icons for the silent-risk cards. */
function WaterHeaterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <rect x="14" y="6" width="20" height="34" rx="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="24" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 24h12M18 30h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 40v3M30 40v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
function HoseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8 34c4-8 10-8 14-4s10 4 14-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect x="4" y="30" width="6" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="38" y="20" width="6" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 40l1.5 3M28 40l1.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AcDrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <rect x="6" y="10" width="28" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 16h20M10 20h20" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M34 20h5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 36l1 3M35 38l0.5 2M39 38l-0.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---- Page data: the three failures homeowners never see coming ---- */
const HIDDEN_FAILURES = [
  {
    tag: "Water heater",
    Icon: WaterHeaterIcon,
    stat: "Year 8+",
    line: "When it lets go, it empties into your garage.",
    truth: "Your record warns you before it goes.",
  },
  {
    tag: "Washing machine hose",
    Icon: HoseIcon,
    stat: "650 gal/hr",
    line: "A $15 part, one spike from bursting.",
    truth: "Your record knows when it is due.",
  },
  {
    tag: "AC drain line",
    Icon: AcDrainIcon,
    stat: "Every season",
    line: "Clogs in Florida humidity, soaks the ceiling.",
    truth: "Your record reminds you to flush it.",
  },
];


const FAQ = [
  { q: "Is it really free for homeowners?", a: "Yes. Free forever, owned for life." },
  {
    q: "Do I have to enter anything?",
    a: "No. Get your record with your address and it fills itself as your pros do the work. Prefer to start now? Add your appliances yourself anytime.",
  },
  { q: "What if I change pros?", a: "The record stays with your home, not the contractor." },
  { q: "Is my data mine?", a: "Always. Yours to keep, export, and share." },
];

/* ---- Make it Last teaser (kept) ---- */
function MakeItLastTeaser() {
  const totalYearsGained = useMemo(
    () =>
      allBrowseEntries().reduce(
        (sum, e) => (e.payoff.kind === "gain" ? sum + e.payoff.years : sum),
        0,
      ),
    [],
  );
  const count = useCountUp(totalYearsGained, "home-mil-total", 1400);

  return (
    <section className="bg-soft border-t border-line py-20 sm:py-24">
      <InView className="mx-auto max-w-5xl px-5">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="reveal text-center lg:text-left">
            <Eyebrow accent="coral">For homeowners</Eyebrow>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1]`}>
              Protected, and lasting years longer.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted max-w-md mx-auto lg:mx-0">
              The same care that stops the flood buys you years on everything else. When your
              record notices something is due, the pro who fits the job is already in it.
            </p>

            <div
              className="relative mt-7 mx-auto lg:mx-0 max-w-md rounded-3xl bg-coralbg border border-coral/25 px-5 py-7 sm:px-7 sm:py-8 overflow-hidden"
              aria-label={`${totalYearsGained} plus years of extra life`}
            >
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-coraldark">
                  <Sparkles size={13} /> Hidden in your home
                </div>
                <div className="mt-2 flex items-baseline justify-center lg:justify-start gap-2">
                  <span className="tnum text-5xl sm:text-7xl font-extrabold text-coral leading-none tabular-nums">
                    {count}
                  </span>
                  <span className="text-2xl sm:text-4xl font-extrabold text-coral leading-none">
                    +
                  </span>
                  <span className="text-base sm:text-xl font-semibold text-coraldark">years</span>
                </div>
                <p className="mt-3 text-base sm:text-lg text-ink leading-snug">
                  of extra life hiding in your home right now.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Link to="/make-it-last" className="w-full sm:w-auto">
                <Btn variant="coral" size="lg" className="w-full sm:w-auto min-h-12">
                  Explore Make It Last
                </Btn>
              </Link>
              <Link
                to="/home/signup"
                className="text-sm font-semibold text-coraldark hover:text-coral transition-colors text-center"
              >
                Get my record
              </Link>
            </div>
          </div>
          <div className="reveal rd-2">
            <MiniLifespansPicker />
          </div>
        </div>
      </InView>
    </section>
  );
}

/* ---- Landing ---- */
function Landing() {
  return (
    <MarketingShell mobileCta={{ label: "Get my record", to: "/home/signup", variant: "coral" }}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 sm:pt-14 pb-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <div className="anim-fade-up eyebrow text-indigo">The living record for every home.</div>
            <h1
              className={`anim-fade-up d-1 mt-4 text-4xl sm:text-6xl leading-[1.05] ${H_SANS}`}
            >
              Every home{" "}
              <span className="relative inline-block">
                remembers.
                <Scribble className="absolute -bottom-2 left-0 w-full h-3" />
              </span>
            </h1>
            <p className="anim-fade-up d-2 mt-5 text-lg text-muted max-w-xl mx-auto lg:mx-0">
              A pro logs the work in 30 seconds. Your home keeps the record and catches the quiet failures before they flood or burn.
            </p>
            <div className="anim-fade-up d-3 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
              <Link to="/home/signup" className="block">
                <Btn variant="coral" size="lg" className="w-full min-h-12">
                  Get my record
                </Btn>
              </Link>
              <Link to="/pro/signup" className="block">
                <Btn variant="teal" size="lg" className="w-full min-h-12">
                  Claim your profile
                </Btn>
              </Link>
            </div>
            <div className="anim-fade-up d-4 mt-5 flex items-center justify-center lg:justify-start gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo" animate={false} /> Free for homeowners
              </span>
            </div>
          </div>

          {/* Hero visual: aspirational home with the record writing itself on top */}
          <div className="anim-scale-in d-2 relative">
            <img
              src="/images/homeowners/hero-home.jpg"
              alt="A warm, well kept family home"
              className="aspect-[4/3.2] w-full rounded-[26px] object-cover shadow-[0_36px_64px_-36px_rgba(22,22,15,0.5)]"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 rounded-b-[26px] bg-gradient-to-t from-ink/45 to-transparent" aria-hidden="true" />
            <div className="absolute left-4 top-4 rounded-2xl bg-paper/95 backdrop-blur border border-line px-3 py-2 shadow-[0_10px_24px_-12px_rgba(22,22,15,0.35)]">
              <div className="text-[11px] font-extrabold text-ink leading-tight">
                Water heater · installed 2016
              </div>
              <div className="text-[10.5px] text-muted leading-tight">Warning: past year 8. Flush due.</div>
            </div>
            <div className="absolute right-4 bottom-4 rounded-2xl bg-coralbg border border-coral/25 px-3 py-2 shadow-[0_10px_24px_-12px_rgba(194,70,31,0.35)]">
              <div className="text-[11px] font-extrabold text-coraldark leading-tight">
                Softener serviced ✓
              </div>
              <div className="text-[10.5px] text-coraldark/80 leading-tight">ABC Water · today · wrote itself</div>
            </div>
          </div>
        </div>
      </section>


      {/* Problems you can't see */}
      <section className="border-t border-line bg-soft py-20 sm:py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal text-center">
            <Eyebrow accent="indigo">The problems you can't see</Eyebrow>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1] max-w-2xl mx-auto`}>
              It always breaks without warning. Yours won't.
            </h2>
          </div>

          <div className="reveal rd-1 mt-10 grid gap-4 md:grid-cols-3">
            {HIDDEN_FAILURES.map((f) => (
              <div
                key={f.tag}
                className="rounded-[22px] border border-line bg-paper p-6 flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigobg text-indigo">
                    <f.Icon className="h-6 w-6" />
                  </span>
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amberbg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amberdark">
                    {f.tag}
                  </div>
                </div>
                <div className="mt-5 text-3xl sm:text-4xl font-extrabold text-indigo leading-none tnum">
                  {f.stat}
                </div>
                <p className="mt-3 text-[15px] text-ink leading-snug">{f.line}</p>
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-indigobg px-3 py-3">
                  <ShieldCheck size={16} animate={false} className="mt-0.5 shrink-0 text-indigo" />
                  <p className="text-[13px] font-semibold text-indigodark leading-snug">{f.truth}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal rd-2 mt-16 text-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-ink leading-none tnum">
              $15,000
            </div>
            <p className="mt-3 text-base sm:text-lg text-muted max-w-md mx-auto">
              the average water damage claim. Almost all preventable.
            </p>
          </div>
        </InView>
      </section>


      {/* How it works */}
      <section className="py-20 sm:py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="reveal text-center">
            <Eyebrow accent="indigo">How it works</Eyebrow>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1] max-w-2xl mx-auto`}>
              The job creates the record. The record protects the home.
            </h2>
          </div>

          <ol className="reveal rd-1 mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                n: 1,
                title: "A pro does the work",
                phone: (
                  <Phone title="Log this job" titleRight="AquaPure Water">
                    <div className="rounded-xl border border-line border-dashed bg-paper px-3.5 py-3 flex flex-col items-center justify-center gap-1 text-center">
                      <CameraIcon size={22} className="text-indigo" />
                      <span className="text-[11px] font-bold text-ink">Snap the nameplate</span>
                      <span className="text-[9.5px] text-muted">Auto detects make & model</span>
                    </div>
                    <PhoneKV k="Make" v="Bradford White" accentV />
                    <PhoneKV k="Warranty" v="to 2031" accentV />
                    <PhoneBtn>Done in 30 sec</PhoneBtn>
                  </Phone>
                ),
              },
              {
                n: 2,
                title: "Your home updates itself",
                phone: (
                  <Phone>
                    <MsgBubble sender="AquaPure Water" align="left">
                      Your home record is ready ✓
                    </MsgBubble>
                    <MsgBubble align="left">
                      <div className="rounded-xl border border-line/70 bg-white/70 px-3 py-2 -mx-1 -my-1">
                        <div className="text-[11px] font-bold text-ink">Water softener</div>
                        <div className="mt-0.5 text-[10px] text-muted">Installed today · warranty to 2031</div>
                        <div className="mt-1.5 text-[10px] font-bold text-indigo">View record →</div>
                      </div>
                    </MsgBubble>
                    <MsgBubble sender="HomesBrain" align="left" tone="indigo">
                      Owned by you, free for life.
                    </MsgBubble>
                  </Phone>
                ),
              },
              {
                n: 3,
                title: "It watches your back",
                phone: (
                  <Phone>
                    <MsgBubble sender="HomesBrain" align="left">
                      Heads up, your water heater is past year 8. A flush now beats a flood later.
                    </MsgBubble>
                    <MsgBubble align="left">Want your pro back to handle it?</MsgBubble>
                    <MsgBubble align="right" tone="coral">
                      Yes please
                    </MsgBubble>
                    <MsgBubble align="left" tone="indigo">
                      <span className="flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M2 5.2l2 2 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Reminder set
                      </span>
                    </MsgBubble>
                  </Phone>
                ),
              },
            ].map((s) => (
              <li key={s.n} className="rounded-[22px] border border-line bg-paper p-5 sm:p-6 flex flex-col">
                <div className="flex-1 min-h-0 flex items-center justify-center py-2">
                  {s.phone}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white bg-indigo">
                    {s.n}
                  </span>
                  <h3 className={`${H_SANS} text-lg`}>{s.title}</h3>
                </div>
              </li>
            ))}
          </ol>
        </InView>
      </section>

      {/* Pro pipeline band — one dark section for contrast */}
      <section className="bg-ink py-20 sm:py-24">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
            <div className="reveal text-white">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">
                For pros · Charter Class of 2027
              </div>
              <h2 className={`${H_SANS} mt-3 text-3xl sm:text-4xl leading-[1.1] text-white`}>
                Your customers come back on their own.
              </h2>
              <p className="mt-4 text-[15px] sm:text-base text-white/75 max-w-lg">
                When the work is due, they rebook you, and you get the ping. The callbacks stack up.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link to="/pro/signup" className="block sm:inline-block">
                  <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
                    Claim your profile
                  </Btn>
                </Link>
                <Link
                  to="/for-pros"
                  className="pressable inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  See how it works for pros
                </Link>
              </div>
              <div className="mt-5 text-[13px] text-white/60">
                Founding price $19/mo, locked for life for the first 1,000 pros. Reviews always free.
              </div>
            </div>
            <div className="reveal rd-1">
              <PipelinePhone />
            </div>
          </div>
        </InView>
      </section>



      {/* Make it Last teaser */}
      <MakeItLastTeaser />

      {/* FAQ */}
      <section className="bg-soft border-t border-line py-20 sm:py-24">
        <InView className="mx-auto max-w-3xl px-5">
          <div className="reveal text-center">
            <Eyebrow accent="indigo">FAQ</Eyebrow>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl`}>Short answers, straight.</h2>
          </div>
          <dl className="mt-10 space-y-3">
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                className={`reveal rd-${i + 1} rounded-2xl border border-line bg-paper px-5 py-5 sm:px-6 sm:flex sm:items-center sm:justify-between sm:gap-8`}
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

      {/* Closing */}
      <section className="py-20 sm:py-24">
        <InView className="mx-auto max-w-3xl px-5 text-center">
          <h2
            className={`reveal ${H_SANS} text-3xl sm:text-5xl leading-[1.08] max-w-2xl mx-auto`}
          >
            Every home remembers. So nothing catches you off guard.
          </h2>
          <div className="reveal rd-2 mt-9 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <Link to="/home/signup" className="block">
              <Btn variant="coral" size="lg" className="w-full min-h-12">
                Get my record
              </Btn>
            </Link>
            <Link to="/pro/signup" className="block">
              <Btn variant="indigo" size="lg" className="w-full min-h-12">
                Claim your profile
              </Btn>
            </Link>
          </div>
        </InView>
      </section>
    </MarketingShell>
  );
}
