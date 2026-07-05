import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "@/lib/ui";
import { Scribble } from "@/components/svg";

/* The forgetting-tax scene, acted out: homeowner questions whip across the
   stage — never more than a few at once — over speed streaks that build with
   the panic, then the noise clears and the answer lands like a hero moment.
   Starts when scrolled into view and loops; reduced motion (and no-JS/SSR)
   gets the settled resolution instead. */

type Panic = 0 | 1 | 2;

type Question = {
  text: string;
  top: number; // % from stage top
  left: number; // % rest position the flight crosses through
  rot: number;
  dir: 1 | -1; // 1 = flies left→right
  start: number; // ms into the chaos act
  dur: number; // flight time — shrinks as the panic builds
  panic: Panic;
};

const QUESTIONS: Question[] = [
  { text: "When does my softener warranty run out?", top: 6, left: 30, rot: -2, dir: 1, start: 0, dur: 2600, panic: 0 },
  { text: "Who installed the water heater?", top: 52, left: 40, rot: 2, dir: -1, start: 900, dur: 2400, panic: 0 },
  { text: "What size filter does the furnace take?", top: 28, left: 22, rot: -3, dir: 1, start: 1700, dur: 2200, panic: 0 },
  { text: "Was the AC serviced last year??", top: 76, left: 45, rot: 3, dir: -1, start: 2400, dur: 1900, panic: 1 },
  { text: "Where's the receipt for the roof repair??", top: 14, left: 50, rot: -4, dir: -1, start: 3000, dur: 1700, panic: 1 },
  { text: "What model is the dishwasher?!", top: 64, left: 18, rot: 4, dir: 1, start: 3500, dur: 1500, panic: 1 },
  { text: "Is ANY of this still under warranty?!", top: 38, left: 42, rot: -5, dir: -1, start: 3900, dur: 1300, panic: 2 },
  { text: "WHO do I even call?!?", top: 84, left: 28, rot: 6, dir: 1, start: 4300, dur: 1200, panic: 2 },
];

const CHAOS_MS = 5600;
const PANIC_1_AT = 2400;
const PANIC_2_AT = 3900;
const RESOLVED_HOLD = 5000;

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

/* The hero-style payoff: eyebrow, big headline with the brand scribble, and
   the answers as calm pills — everything the panic was asking for. */
function Resolution({ animate }: { animate: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
      {/* Soft indigo glow behind the moment */}
      <div
        className={`absolute w-[min(480px,90%)] aspect-square rounded-full ${animate ? "anim-fade-in" : ""}`}
        style={{
          background: "radial-gradient(circle, var(--indigobg) 0%, transparent 68%)",
        }}
      />
      <div className="relative text-center">
        <div className={animate ? "anim-fade-up" : ""}>
          <Eyebrow accent="indigo">Asked and answered</Eyebrow>
        </div>
        <h3
          className={`${animate ? "anim-scale-in d-1" : ""} mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]`}
        >
          Your home{" "}
          <span className="relative inline-block">
            remembers.
            {animate && <Scribble className="absolute -bottom-1.5 left-0 w-full h-3" />}
          </span>
        </h3>
        <div
          className={`${animate ? "anim-fade-up d-4" : ""} mt-6 flex flex-wrap justify-center gap-2`}
        >
          {ANSWERS.map((a) => (
            <span
              key={a.k}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[13px] sm:text-sm shadow-[0_8px_24px_-14px_rgba(22,22,15,0.3)]"
            >
              <CheckMark className="text-indigo shrink-0" />
              <span className="text-muted">{a.k}</span>
              <span className="font-bold text-ink">{a.v}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ForgettingScene({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"chaos" | "resolved">("chaos");
  const [panic, setPanic] = useState<Panic>(0);
  const [cycle, setCycle] = useState(0);

  // Kick off only once the stage is actually on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The loop: one chaos act (bubble flights are pure CSS, keyed by cycle),
  // the panic level stepping up underneath, then the resolution, then again.
  useEffect(() => {
    if (!started || reduced) return;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timers.push(window.setTimeout(res, ms));
      });
    (async () => {
      while (!cancelled) {
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
        setPhase("resolved");
        await wait(RESOLVED_HOLD);
        if (cancelled) return;
        setCycle((c) => c + 1);
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started, reduced]);

  // Reduced motion / pre-hydration: the settled resolution, frozen.
  const isStatic = reduced;
  const chaos = !isStatic && phase === "chaos";

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label="Homeowner questions flying past faster and faster — warranty dates, filter sizes, who installed what — until the home's record answers them all at once"
      className={`relative h-[380px] sm:h-[420px] overflow-hidden ${className}`}
    >
      {/* Speed streaks — the background accelerates as the panic builds. */}
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
          → out), so only a few share the stage at any moment. Remounting on
          `cycle` restarts the act. */}
      {chaos && started && (
        <div key={cycle} aria-hidden="true" className="absolute inset-0">
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

      {(isStatic || phase === "resolved") && <Resolution animate={!isStatic} />}
    </div>
  );
}
