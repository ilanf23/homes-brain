import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eyebrow, Pill, Card, Btn, KV } from "@/lib/ui";
import { HouseScene, Scribble, ShieldCheck, TradeIcon } from "@/components/svg";
import { Logo, LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomesBrain — A Carfax for homes that writes itself" },
      {
        name: "description",
        content:
          "Log a 30-second job. Send a branded service record. Homeowners claim it free and own it for life.",
      },
    ],
  }),
  component: Landing,
});

const LOOP_STEPS = [
  {
    key: "pro" as const,
    accent: "teal" as const,
    pill: "For pros",
    title: "Log a job in 30 seconds",
    body: "Customer, equipment, what you did, next service date. Photo optional. Done.",
  },
  {
    key: "record" as const,
    accent: "indigo" as const,
    pill: "Automatic",
    title: "Branded record is sent",
    body: "Your logo, your work, a recall check, and a Google review ask. Sent by text and email.",
  },
  {
    key: "owner" as const,
    accent: "coral" as const,
    pill: "For homeowners",
    title: "Claim your home, free",
    body: "Own the full history. Add the other pros who work on your home and keep one source of truth.",
  },
];

function Landing() {
  const [loopStep, setLoopStep] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance the core loop until the visitor takes over.
  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(() => setLoopStep((s) => (s + 1) % LOOP_STEPS.length), 3500);
    return () => clearInterval(t);
  }, [paused]);

  const active = LOOP_STEPS[loopStep];

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <Logo size={30} className="transition-transform duration-300 group-hover:-rotate-3" />
          </Link>
          <nav className="flex items-center gap-2">
            <a
              href="#how"
              className="hidden sm:inline-block text-sm font-semibold text-muted hover:text-ink transition-colors px-3 py-2"
            >
              How it works
            </a>
            <Link
              to="/login"
              className="text-sm font-semibold text-muted hover:text-ink transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link to="/pro/signup">
              <Btn variant="teal" size="sm">
                For pros
              </Btn>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="text-center lg:text-left">
          <div className="anim-fade-up">
            <Eyebrow accent="indigo">Every home deserves a history</Eyebrow>
          </div>
          <h1 className="anim-fade-up d-1 mt-4 text-5xl sm:text-6xl tracking-tight text-ink leading-[1.04]">
            A Carfax for homes{" "}
            <span className="relative inline-block">
              that writes itself.
              <Scribble className="absolute -bottom-2 left-0 w-full h-3" color="#473fb0" />
            </span>
          </h1>
          <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0">
            Home-service pros log a job in 30 seconds. We send a branded service record to the
            homeowner — they claim it free and own their home's history for life.
          </p>
          <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <Link to="/pro/signup">
              <Btn variant="teal" size="lg">
                Start free — for pros
              </Btn>
            </Link>
            <a href="#how">
              <Btn variant="secondary" size="lg">
                How it works
              </Btn>
            </a>
          </div>
          <div className="anim-fade-up d-4 mt-8 flex items-center justify-center lg:justify-start gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-teal" animate={false} /> Recall checks included
            </span>
            <span>·</span>
            <span>No credit card</span>
            <span>·</span>
            <span>Free for homeowners, forever</span>
          </div>
        </div>
        <div className="anim-scale-in d-2 hidden sm:block">
          <HouseScene active={active.key} className="w-full max-w-md mx-auto anim-float" />
        </div>
      </section>

      {/* How it works — interactive core loop */}
      <section id="how" className="bg-soft py-20 border-y border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow accent="indigo">The core loop</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight">
              Three steps. Everyone wins.
            </h2>
            <p className="mt-3 text-sm text-muted">Tap a step to see how the record moves.</p>
          </div>

          <div
            className="mt-10 grid md:grid-cols-3 gap-4"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {LOOP_STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setLoopStep(i);
                  setPaused(true);
                }}
                aria-pressed={loopStep === i}
                className={`pressable text-left rounded-[22px] border p-6 transition-all duration-300 ${
                  loopStep === i
                    ? "border-ink/20 bg-paper shadow-[0_20px_44px_-24px_rgba(22,22,15,0.25)] -translate-y-1"
                    : "border-line bg-paper/60 hover:bg-paper hover:border-ink/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Pill accent={s.accent}>{s.pill}</Pill>
                  <span
                    className={`font-mono text-xs tnum transition-colors ${loopStep === i ? "text-ink" : "text-muted"}`}
                  >
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight font-display">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
                <div className="mt-4 h-1 rounded-full bg-line overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${loopStep === i ? "w-full" : "w-0"}`}
                    style={{ backgroundColor: `var(--${s.accent})` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sample record preview */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow accent="coral">What the homeowner sees</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight">
              A record they're proud to keep.
            </h2>
            <p className="mt-4 text-muted max-w-md">
              Compliant, calm, premium. Looks like a fintech statement, not a contractor invoice.
              The homeowner taps once to claim — and your business comes with them.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink">
              {[
                { icon: "water_treatment", text: "Equipment, warranty, and serials on file" },
                { icon: "electrical", text: "Automatic recall check on every visit" },
                { icon: "appliance", text: "Your branding and review link, front and center" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-tealbg text-teal flex items-center justify-center shrink-0">
                    <TradeIcon trade={f.icon} size={16} />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
          <Card
            lift
            className="shadow-[0_24px_60px_-30px_rgba(22,22,15,0.25)] rotate-1 hover:rotate-0 transition-transform duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tealbg text-teal flex items-center justify-center font-extrabold">
                AW
              </div>
              <div>
                <div className="font-extrabold text-ink">Aqua Works</div>
                <div className="text-xs text-muted">Water treatment · Austin, TX</div>
              </div>
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight font-display">
              Service record
            </h3>
            <div className="mt-3">
              <KV k="Equipment" v="Whole-house softener" />
              <KV k="Make / Model" v="EcoWater · EVR3700R30" />
              <KV k="Warranty until" v="Mar 2030" />
              <KV
                k="Recall status"
                v={
                  <span className="inline-flex items-center gap-1.5 text-teal font-semibold text-sm">
                    <ShieldCheck size={16} animate={false} /> No known recalls
                  </span>
                }
              />
              <KV k="Work done" v="Annual service, resin check" />
              <KV k="Next service" v="Mar 2027" />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Btn variant="coral" size="lg">
                Claim your home, free
              </Btn>
              <Btn variant="secondary">Leave Aqua Works a review</Btn>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span>© {new Date().getFullYear()} HomesBrain</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/pro/signup" className="hover:text-ink transition-colors">
              For pros
            </Link>
            <a href="#how" className="hover:text-ink transition-colors">
              How it works
            </a>
            <span className="text-xs">v0 demo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
