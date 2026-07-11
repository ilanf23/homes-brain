import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Btn, Eyebrow } from "@/lib/ui";
import { Scribble, ShieldCheck } from "@/components/svg";
import { MarketingShell, marketingHead, PipelinePhone } from "@/components/marketing";
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

/* ---- Page data: the three failures homeowners never see coming ---- */
const HIDDEN_FAILURES = [
  {
    tag: "Water heater",
    body: "Fails between year 8 and 12. When it lets go, it empties into the garage or the utility closet.",
    truth: "Your record knows its age and warns you before it goes.",
  },
  {
    tag: "Washing-machine hose",
    body: "A $15 rubber part. When it bursts it releases up to 650 gallons an hour into the laundry room.",
    truth: "Your record knows when the hose is due for replacement.",
  },
  {
    tag: "AC drain line",
    body: "Clogs quietly in Florida humidity. The overflow soaks the ceiling below the air handler.",
    truth: "Your record reminds you to flush it every season.",
  },
];

const FAQ = [
  { q: "Is it really free for homeowners?", a: "Yes. Free forever, owned for life." },
  {
    q: "Do I have to enter anything?",
    a: "No. Sign up with your address and the record fills itself as your pros do the work. Prefer to start now? Add your appliances yourself anytime.",
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
      <section className="mx-auto max-w-3xl px-5 pt-10 sm:pt-14 pb-10 text-center">
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
        <p className="anim-fade-up d-2 mt-5 text-lg text-muted max-w-xl mx-auto">
          So it can warn you before something breaks. A pro logs the work in 30 seconds, your home
          keeps the record and starts catching the quiet failures before they flood or burn.
        </p>
        <div className="anim-fade-up d-3 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
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
        <div className="anim-fade-up d-4 mt-5 flex items-center justify-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo" animate={false} /> Free for homeowners
          </span>
          <span aria-hidden="true">·</span>
          <span>Recall checks included</span>
        </div>
      </section>

      {/* Fork */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[26px] bg-coralbg p-6 sm:p-8 flex flex-col">
            <Eyebrow accent="coral">Homeowner</Eyebrow>
            <h3 className={`${H_SANS} mt-3 text-2xl sm:text-[28px] leading-[1.15]`}>
              A home that protects itself.
            </h3>
            <p className="mt-3 text-[15px] text-coraldark">
              Free for life. It remembers every appliance and warns you before the next one fails.
            </p>
            <div className="mt-6">
              <Link to="/home/signup" className="block">
                <Btn variant="coral" size="lg" className="w-full min-h-12 sm:w-auto">
                  Get my record
                </Btn>
              </Link>
            </div>
          </div>

          <div className="rounded-[26px] bg-tealbg p-6 sm:p-8 flex flex-col">
            <Eyebrow accent="teal">Pro</Eyebrow>
            <h3 className={`${H_SANS} mt-3 text-2xl sm:text-[28px] leading-[1.15]`}>
              Never get forgotten again.
            </h3>
            <p className="mt-3 text-[15px] text-tealdark">
              Your customers come back on their own. We tell you the moment they do.
            </p>
            <div className="mt-6">
              <Link to="/pro/signup" className="block">
                <span className="pressable inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-full bg-teal px-6 py-3 text-base font-bold text-white hover:bg-tealdark transition-colors">
                  Claim your profile
                </span>
              </Link>
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
            <p className="mt-4 text-[16px] text-muted max-w-2xl mx-auto">
              The water heater quietly past year ten. The washing-machine hose one spike from
              letting go. The AC drain line clogging in Florida humidity. Nobody was watching
              them. Now your home is.
            </p>
          </div>

          <div className="reveal rd-1 mt-10 grid gap-4 md:grid-cols-3">
            {HIDDEN_FAILURES.map((f) => (
              <div
                key={f.tag}
                className="rounded-[22px] border border-line bg-paper p-6 flex flex-col"
              >
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amberbg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amberdark">
                  {f.tag}
                </div>
                <p className="mt-4 text-[15px] text-ink leading-relaxed">{f.body}</p>
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-indigobg px-3 py-3">
                  <ShieldCheck size={16} animate={false} className="mt-0.5 shrink-0 text-indigo" />
                  <p className="text-[13px] font-semibold text-indigodark leading-snug">{f.truth}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="reveal rd-2 mt-10 text-center text-[15px] sm:text-base text-muted max-w-2xl mx-auto">
            The average water-damage claim runs over{" "}
            <span className="font-bold text-ink tnum">$15,000</span> — and almost all of it was
            preventable.
          </p>
        </InView>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24">
        <InView className="mx-auto max-w-4xl px-5">
          <div className="reveal text-center">
            <Eyebrow accent="indigo">How it works</Eyebrow>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1] max-w-2xl mx-auto`}>
              The job creates the record. The record protects the home.
            </h2>
          </div>

          <ol className="reveal rd-1 mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                title: "A pro does the work",
                body: "They snap the nameplate or speak a note. 30 seconds, no forms.",
              },
              {
                n: 2,
                title: "Your home updates itself",
                body: "Every appliance, warranty, and service date lands in your record, verified at the source.",
              },
              {
                n: 3,
                title: "It watches your back",
                body: "It warns you before the next failure and helps everything last years longer.",
              },
            ].map((s) => (
              <li key={s.n} className="rounded-[22px] border border-line bg-paper p-6 sm:p-7">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white ${
                    s.n === 3 ? "bg-coral" : "bg-indigo"
                  }`}
                >
                  {s.n}
                </span>
                <h3 className={`${H_SANS} mt-4 text-xl`}>{s.title}</h3>
                <p className="mt-2 text-[15px] text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
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
