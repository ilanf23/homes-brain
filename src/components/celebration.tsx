import { useEffect, useMemo, useState } from "react";
import { haptic } from "@/lib/mobile";

/* One-shot celebration overlay for the loop's payoff moments.
   - "burst": quick confetti pop with a few balloons. For the pro's
     "record sent" screen, which they hit daily - short and out of the way.
   - "grand": bigger confetti volley plus a flock of balloons rising the
     full viewport. For the homeowner claiming their home, a once-ever moment.
   Decorative only: pointer-events-none, aria-hidden, self-removes when done.
   Under prefers-reduced-motion it renders nothing - the success copy and
   CheckBurst on the page carry the meaning. */

type Variant = "burst" | "grand";

const CELEBRATION_KEY = "hb_celebrate";

/* Queue a celebration to play on the next page (survives client-side
   navigation, never survives a refresh replay because consume removes it). */
export function queueCelebration(kind: string) {
  try {
    sessionStorage.setItem(CELEBRATION_KEY, kind);
  } catch {
    /* storage unavailable: skip the confetti, keep the flow */
  }
}

export function consumeCelebration(kind: string): boolean {
  try {
    if (sessionStorage.getItem(CELEBRATION_KEY) !== kind) return false;
    sessionStorage.removeItem(CELEBRATION_KEY);
    return true;
  } catch {
    return false;
  }
}

/* Brand palette for the pieces: indigo carries it, coral is the payoff
   accent, tints keep the cloud from going heavy. No amber (status-only). */
const CONFETTI_COLORS = [
  "var(--indigo)",
  "var(--indigo)",
  "var(--indigo-dark)",
  "var(--indigobg)",
  "var(--coral)",
  "var(--coralbg)",
];

const BALLOON_COLORS = ["var(--indigo)", "var(--coral)", "var(--indigo-dark)", "#8f88e8"];

type ConfettiPiece = {
  left: number; // launch x, % of viewport width
  cx: number; // horizontal drift, px
  cyUp: string; // apex height (negative = up); vh for grand so it scales
  cyDown: number; // settle depth, px
  crx: number;
  cry: number;
  turns: number;
  dur: number; // ms
  delay: number; // ms
  w: number;
  h: number;
  color: string;
  round: boolean;
};

type BalloonSpec = {
  left: number; // % of viewport width
  size: number; // px width of the balloon body
  dur: number; // ms
  delay: number; // ms
  sway: number; // px
  swayDur: number; // ms
  color: string;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeConfetti(count: number, grand: boolean): ConfettiPiece[] {
  return Array.from({ length: count }, () => {
    const side = Math.random() < 0.5 ? -1 : 1;
    return {
      // grand launches from the bottom edge fanning across; burst pops from
      // the center third where the success card sits.
      left: grand ? rand(4, 96) : rand(32, 68),
      cx: side * rand(30, grand ? 220 : 150),
      cyUp: grand ? `-${rand(26, 68).toFixed(1)}vh` : `-${rand(120, 300).toFixed(0)}px`,
      cyDown: rand(60, 200),
      crx: rand(0.2, 1),
      cry: rand(0, 1),
      turns: rand(360, 900),
      dur: rand(1100, grand ? 2200 : 1700),
      delay: rand(0, grand ? 550 : 250),
      w: rand(6, 11),
      h: rand(8, 14),
      color: pick(CONFETTI_COLORS),
      round: Math.random() < 0.3,
    };
  });
}

function makeBalloons(count: number): BalloonSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    // spread across the width, jittered so the flock never looks like a grid
    left: (i + 0.5) * (100 / count) + rand(-6, 6),
    size: rand(34, 58),
    dur: rand(2400, 3600),
    delay: rand(0, 700),
    sway: rand(-22, 22),
    swayDur: rand(1400, 2200),
    // cycle instead of random pick so even a 3-balloon burst mixes colors
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
  }));
}

function Balloon({ spec }: { spec: BalloonSpec }) {
  const { size, color } = spec;
  const h = size * 1.22;
  return (
    <div
      className="absolute"
      style={{
        left: `${spec.left}%`,
        bottom: -(h + 70),
        animation: `hb-balloon-rise ${spec.dur}ms cubic-bezier(0.3, 0.1, 0.4, 1) ${spec.delay}ms both`,
      }}
    >
      <div
        style={
          {
            "--bsway": `${spec.sway}px`,
            animation: `hb-balloon-sway ${spec.swayDur}ms ease-in-out ${spec.delay}ms infinite`,
          } as React.CSSProperties
        }
      >
        <svg width={size} height={h + 46} viewBox={`0 0 ${size} ${h + 46}`} aria-hidden="true">
          <ellipse cx={size / 2} cy={h / 2} rx={size / 2} ry={h / 2} fill={color} />
          {/* highlight so the body reads as a balloon, not a dot */}
          <ellipse
            cx={size * 0.36}
            cy={h * 0.3}
            rx={size * 0.13}
            ry={h * 0.16}
            fill="#ffffff"
            opacity={0.35}
          />
          <path
            d={`M ${size / 2 - 4} ${h} L ${size / 2 + 4} ${h} L ${size / 2} ${h + 7} Z`}
            fill={color}
          />
          <path
            d={`M ${size / 2} ${h + 7} q 7 12 0 22 q -7 10 0 17`}
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            opacity={0.6}
          />
        </svg>
      </div>
    </div>
  );
}

export function Celebration({ variant = "burst" }: { variant?: Variant }) {
  const grand = variant === "grand";
  const [gone, setGone] = useState(false);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const confetti = useMemo(
    () => (reduced ? [] : makeConfetti(grand ? 56 : 26, grand)),
    [reduced, grand],
  );
  const balloons = useMemo(() => (reduced ? [] : makeBalloons(grand ? 8 : 3)), [reduced, grand]);

  const total = grand ? 4400 : 2300;
  useEffect(() => {
    haptic([10, 60, 14]);
    const t = setTimeout(() => setGone(true), total);
    return () => clearTimeout(t);
  }, [total]);

  if (reduced || gone) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {confetti.map((p, i) => (
        <div
          key={`c${i}`}
          className="absolute"
          style={
            {
              left: `${p.left}%`,
              top: grand ? "100%" : "38%",
              "--cx": `${p.cx}px`,
              animation: `hb-confetti-x ${p.dur}ms linear ${p.delay}ms both`,
            } as React.CSSProperties
          }
        >
          <div
            style={
              {
                "--cy-up": p.cyUp,
                "--cy-down": `${p.cyDown}px`,
                animation: `hb-confetti-y ${p.dur}ms linear ${p.delay}ms both`,
              } as React.CSSProperties
            }
          >
            <div
              style={
                {
                  width: p.w,
                  height: p.round ? p.w : p.h,
                  background: p.color,
                  borderRadius: p.round ? 999 : 2,
                  "--crx": p.crx,
                  "--cry": p.cry,
                  "--cturns": `${p.turns}deg`,
                  animation: `hb-confetti-spin ${p.dur}ms linear ${p.delay}ms both`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      ))}
      {balloons.map((b, i) => (
        <Balloon key={`b${i}`} spec={b} />
      ))}
    </div>
  );
}
