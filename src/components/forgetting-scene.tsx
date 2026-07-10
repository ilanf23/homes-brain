import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Btn, Eyebrow } from "@/lib/ui";
import { LogoMark } from "@/components/svg";

/* The forgetting-tax scene, acted out: homeowner questions whip across the
   stage - never more than a few at once - over speed streaks that build with
   the panic. Then the finale: the biggest question of all, "Where do I even
   go?", as a giant indigo cell that whips in from the left, stops dead
   center, shakes as it holds, and cracks apart word by word. As the pieces fall, the home's record comes clearly into view
   behind them, answering every question row by row - with a signup CTA so the
   payoff is actionable. Starts when scrolled into view and plays once, ending
   settled on the record; reduced motion (and no-JS/SSR) gets the settled
   resolution instead. */

type Panic = 0 | 1 | 2;

type Question = {
  text: string;
  top: number; // % from stage top
  left: number; // % rest position the flight crosses through
  rot: number;
  dir: 1 | -1; // 1 = flies left→right
  start: number; // ms into the chaos act
  dur: number; // flight time - shrinks as the panic builds
  panic: Panic;
};

const QUESTIONS: Question[] = [
  {
    text: "When does my softener warranty run out?",
    top: 6,
    left: 30,
    rot: -2,
    dir: 1,
    start: 0,
    dur: 2600,
    panic: 0,
  },
  {
    text: "Who installed the water heater?",
    top: 52,
    left: 40,
    rot: 2,
    dir: -1,
    start: 900,
    dur: 2400,
    panic: 0,
  },
  {
    text: "What size filter does the furnace take?",
    top: 28,
    left: 22,
    rot: -3,
    dir: 1,
    start: 1700,
    dur: 2200,
    panic: 0,
  },
  {
    text: "Was the AC serviced last year??",
    top: 76,
    left: 45,
    rot: 3,
    dir: -1,
    start: 2400,
    dur: 1900,
    panic: 1,
  },
  {
    text: "Where's the receipt for the roof repair??",
    top: 14,
    left: 50,
    rot: -4,
    dir: -1,
    start: 3000,
    dur: 1700,
    panic: 1,
  },
  {
    text: "What model is the dishwasher?!",
    top: 64,
    left: 18,
    rot: 4,
    dir: 1,
    start: 3500,
    dur: 1500,
    panic: 1,
  },
  {
    text: "Is ANY of this still under warranty?!",
    top: 38,
    left: 42,
    rot: -5,
    dir: -1,
    start: 3900,
    dur: 1300,
    panic: 2,
  },
  {
    text: "Did ANYONE write this down?!",
    top: 84,
    left: 28,
    rot: 6,
    dir: 1,
    start: 4300,
    dur: 1200,
    panic: 2,
  },
];

const CHAOS_MS = 5600;
const PANIC_1_AT = 2400;
const PANIC_2_AT = 3900;
const FINALE_MS = 2400; // keep in sync with the hb-finale-fly duration in styles.css
const BREAK_MS = 1750;

/* The finale line, one pill per word so the cell can crack apart piece by
   piece - each word carries its own chunk of the indigo background, seamless
   against the cell until it falls. Each word comes loose in its own
   direction; the delays stagger the collapse ("even" gives first, "go?"
   hangs on longest) so it reads as slowly falling apart rather than one
   clean exit. */
const FINALE_WORDS = [
  { word: "Where", x: -34, rot: -16, delay: 300 },
  { word: "do", x: 12, rot: 9, delay: 150 },
  { word: "I", x: -10, rot: -7, delay: 430 },
  { word: "even", x: 26, rot: 13, delay: 0 },
  { word: "go?", x: -20, rot: -11, delay: 560 },
];

const PANIC_STYLES: Record<Panic, string> = {
  0: "bg-paper border border-line text-ink shadow-[0_8px_20px_-12px_rgba(22,22,15,0.25)]",
  1: "bg-indigobg border border-indigo/25 text-indigodark shadow-[0_10px_24px_-12px_rgba(71,63,176,0.35)]",
  2: "bg-indigo text-white font-bold shadow-[0_14px_32px_-12px_rgba(71,63,176,0.6)]",
};

/* Speed streaks behind the questions. Each lane appears once the panic
   reaches its level, so the background accelerates with the foreground. */
type Streak = {
  top: number; // %
  w: number; // px
  dur: number; // s
  delay: number; // s
  minPanic: Panic;
  dir: 1 | -1;
};

const STREAKS: Streak[] = [
  { top: 12, w: 150, dur: 2.6, delay: 0, minPanic: 0, dir: 1 },
  { top: 58, w: 110, dur: 3.0, delay: -1.2, minPanic: 0, dir: -1 },
  { top: 34, w: 170, dur: 2.2, delay: -0.6, minPanic: 1, dir: 1 },
  { top: 80, w: 130, dur: 2.4, delay: -1.8, minPanic: 1, dir: -1 },
  { top: 22, w: 200, dur: 1.5, delay: -0.3, minPanic: 2, dir: -1 },
  { top: 46, w: 160, dur: 1.3, delay: -0.9, minPanic: 2, dir: 1 },
  { top: 70, w: 190, dur: 1.4, delay: -0.5, minPanic: 2, dir: 1 },
  { top: 90, w: 140, dur: 1.2, delay: -1.1, minPanic: 2, dir: -1 },
];

const ANSWERS = [
  { k: "Softener warranty", v: "to 2031" },
  { k: "Water heater", v: "ABC Water · 2021" },
  { k: "Furnace filter", v: "16×25×1" },
  { k: "AC service", v: "Done · May 2025" },
];

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

function CheckMark({ className = "" }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" className={className}>
      <path
        d="m3 7.5 2.6 2.6L11 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The payoff is the product artifact: the home's record settles in as a calm
   ledger card that answers, row by row, exactly what the panic was asking -
   ending on the finale question itself, "where do I even go". The big brand
   line ("Your home remembers") stays reserved for the hero and closing
   sections. */
function Resolution({ animate }: { animate: boolean }) {
  const delay = (ms: number) =>
    animate ? ({ animationDelay: `${ms}ms` } as React.CSSProperties) : undefined;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
      {/* Soft indigo glow behind the moment */}
      <div
        className={`absolute w-[min(480px,90%)] aspect-square rounded-full ${animate ? "anim-fade-in" : ""}`}
        style={{
          background: "radial-gradient(circle, var(--indigobg) 0%, transparent 68%)",
        }}
      />
      <div className="relative w-full max-w-[360px] text-center">
        <div className={animate ? "anim-fade-up" : ""}>
          <Eyebrow accent="indigo">Asked and answered</Eyebrow>
        </div>
        <div
          className={`${animate ? "anim-scale-in" : ""} mt-4 rounded-[22px] border border-line bg-paper text-left shadow-[0_18px_44px_-20px_rgba(22,22,15,0.35)]`}
          style={delay(80)}
        >
          <div
            className={`${animate ? "anim-fade-up" : ""} flex items-center gap-2.5 border-b border-line px-5 py-3.5`}
            style={delay(140)}
          >
            <LogoMark size={22} />
            <span className="text-sm font-bold text-ink">128 Birch Lane</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigobg px-2.5 py-1 text-[11px] font-bold text-indigodark">
              <CheckMark className="shrink-0" /> Verified
            </span>
          </div>
          <div className="px-5 py-1">
            {ANSWERS.map((a, i) => (
              <div
                key={a.k}
                className={`${animate ? "anim-fade-up" : ""} flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0`}
                style={delay(200 + i * 60)}
              >
                <span className="flex items-center gap-2 text-[13px] text-muted">
                  <CheckMark className="text-indigo shrink-0" />
                  {a.k}
                </span>
                <span className="text-right text-[13px] font-bold text-ink">{a.v}</span>
              </div>
            ))}
          </div>
          <div
            className={`${animate ? "anim-fade-up" : ""} rounded-b-[21px] border-t border-line bg-soft px-5 py-3.5`}
            style={delay(460)}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-muted">Where do I even go?</span>
              <span className="text-[13px] font-bold text-indigo">Mike · ABC Water →</span>
            </div>
            <Link to="/home/signup" className="mt-3 block">
              <Btn variant="indigo" className="w-full">
                Start your free record
              </Btn>
            </Link>
          </div>
        </div>
        <p
          className={`${animate ? "anim-fade-up" : ""} mt-4 text-sm text-muted`}
          style={delay(560)}
        >
          One record. Every answer. Zero typing.
        </p>
      </div>
    </div>
  );
}

export function ForgettingScene({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"chaos" | "finale" | "break" | "resolved">("chaos");
  const [panic, setPanic] = useState<Panic>(0);

  // Kick off once the stage is mostly on screen. A second, lower threshold
  // guards the case where the section is taller than the viewport (or the
  // page is scrolled in an unusual way) and 0.35 never fires: once any part
  // of it is visible, a short fallback timer forces the start anyway, so
  // the finale and CTA still show up for sighted users.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    let fallback: number | undefined;
    const clearFallback = () => {
      if (fallback !== undefined) {
        window.clearTimeout(fallback);
        fallback = undefined;
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.35) {
          setStarted(true);
          io.disconnect();
          clearFallback();
          return;
        }
        if (entry.isIntersecting && fallback === undefined) {
          fallback = window.setTimeout(() => {
            setStarted(true);
            io.disconnect();
          }, 2000);
        } else if (!entry.isIntersecting) {
          clearFallback();
        }
      },
      { threshold: [0.05, 0.35] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearFallback();
    };
  }, []);

  // The act plays once: chaos with the panic level stepping up underneath,
  // then the finale question flying in and breaking apart into the
  // resolution, which stays settled so its signup CTA holds still.
  useEffect(() => {
    if (!started || reduced) return;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timers.push(window.setTimeout(res, ms));
      });
    (async () => {
      setPhase("chaos");
      setPanic(0);
      await wait(PANIC_1_AT);
      if (cancelled) return;
      setPanic(1);
      await wait(PANIC_2_AT - PANIC_1_AT);
      if (cancelled) return;
      setPanic(2);
      await wait(CHAOS_MS - PANIC_2_AT);
      if (cancelled) return;
      setPhase("finale");
      await wait(FINALE_MS);
      if (cancelled) return;
      setPhase("break");
      await wait(BREAK_MS);
      if (cancelled) return;
      setPhase("resolved");
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started, reduced]);

  // Reduced motion / pre-hydration: the settled resolution, frozen.
  const isStatic = reduced;
  const chaos = !isStatic && phase === "chaos";
  const showResolution = isStatic || phase === "break" || phase === "resolved";

  // The chaos and finale layers are decorative (aria-hidden) and role="img"
  // on the stage gives assistive tech a plain-language description of the
  // scene. Real content and the signup CTA live in an always-mounted
  // sr-only block below so screen-reader users get them from first render,
  // not only once the animation reaches the break phase; that block is
  // hidden from the accessibility tree once the visible Resolution card
  // mounts, so the moment isn't announced twice.
  return (
    <div
      ref={stageRef}
      role="img"
      aria-label="A home's scattered paper service records swirl in a panic, then dissolve into one clean, verified HomesBrain service record."
      className={`relative h-[440px] sm:h-[470px] overflow-hidden ${className}`}
    >
      {/* Speed streaks - the background accelerates as the panic builds. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-500 ${chaos ? "" : "opacity-0"}`}
      >
        {!isStatic &&
          STREAKS.map((s, i) => (
            <div
              key={i}
              className={`absolute h-[2px] rounded-full transition-opacity duration-500 ${
                chaos && panic >= s.minPanic ? "opacity-100" : "opacity-0"
              }`}
              style={{
                top: `${s.top}%`,
                left: -220,
                width: s.w,
                background:
                  "linear-gradient(90deg, transparent, color-mix(in srgb, var(--indigo) 30%, transparent), transparent)",
                animation: `hb-streak ${s.dur}s linear ${s.delay}s infinite`,
                animationDirection: s.dir === 1 ? "normal" : "reverse",
              }}
            />
          ))}
      </div>

      {/* The flying questions. Each flight is one CSS animation (in → across
          → out), so only a few share the stage at any moment. */}
      {chaos && started && (
        <div aria-hidden="true" className="absolute inset-0">
          {QUESTIONS.map((q) => (
            <div
              key={q.text}
              className="absolute w-[56%] sm:w-auto sm:max-w-[260px]"
              style={{ left: `${q.left}%`, top: `${q.top}%` }}
            >
              <div
                className="fly-through"
                style={
                  {
                    "--fly-from": `${q.dir * -460}px`,
                    "--fly-to": `${q.dir * 460}px`,
                    "--fly-rot": `${q.rot}deg`,
                    animationDelay: `${q.start}ms`,
                    animationDuration: `${q.dur}ms`,
                  } as React.CSSProperties
                }
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-[13px] sm:text-sm leading-snug ${PANIC_STYLES[q.panic]}`}
                >
                  {q.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The finale: the biggest question - now a giant indigo cell, the
          panic bubbles' final form - whips in from the left, stops dead
          center, jitters in place while it holds, then cracks apart word by
          word. Three nested wrappers so the transforms compose: flight on
          the outside, the shake in the middle, the cell itself inside. The
          cell's background fades as it breaks while each word pill keeps its
          own indigo chunk, so the white words stay visible as they fall.
          Transforms don't move the layout boxes, so nothing reflows while
          the pieces fall in front of the record card arriving underneath
          (z-20 over the card's z-10). */}
      {!isStatic && (phase === "finale" || phase === "break") && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6"
        >
          <div
            className={phase === "finale" ? "finale-fly" : ""}
            style={phase === "finale" ? { animationDuration: `${FINALE_MS}ms` } : undefined}
          >
            <div
              className={phase === "finale" ? "jitter" : ""}
              // The shake kicks in only once the flight has stopped center.
              style={
                phase === "finale"
                  ? { animationDelay: `${Math.round(FINALE_MS * 0.4)}ms` }
                  : undefined
              }
            >
              <div
                className={`flex max-w-[620px] flex-wrap justify-center gap-x-1.5 gap-y-1.5 rounded-[26px] px-5 py-4 sm:px-8 sm:py-6 transition-[background-color,box-shadow] duration-300 ${
                  phase === "break"
                    ? "bg-transparent shadow-none"
                    : "bg-indigo shadow-[0_24px_60px_-18px_rgba(71,63,176,0.65)]"
                }`}
              >
                {FINALE_WORDS.map((w) => (
                  <span
                    key={w.word}
                    className={`inline-block rounded-2xl bg-indigo px-2.5 py-1 text-center text-[clamp(26px,5.5vw,44px)] font-extrabold leading-[1.05] tracking-tight text-white ${phase === "break" ? "word-fall" : ""}`}
                    style={
                      {
                        "--fall-x": `${w.x}px`,
                        "--fall-rot": `${w.rot}deg`,
                        animationDelay: phase === "break" ? `${w.delay}ms` : undefined,
                      } as React.CSSProperties
                    }
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Always in the DOM from first render, for screen readers and for the
          case where the intersection threshold above never fires: the same
          headline and signup CTA the visible Resolution card shows once the
          animation settles. */}
      <div className="sr-only" aria-hidden={showResolution ? "true" : undefined}>
        <p>
          Every question a homeowner has about their house, warranties, install dates, service
          history, gets answered by one clean, verified HomesBrain record.
        </p>
        <Link to="/home/signup">Start your free record</Link>
      </div>

      {showResolution && <Resolution animate={!isStatic} />}
    </div>
  );
}
