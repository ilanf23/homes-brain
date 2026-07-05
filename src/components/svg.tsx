import { useEffect, useRef, useState } from "react";

/* HomesBrain SVG set. One visual language: 1.75 stroke, round caps, currentColor. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* Official HomesBrain mark: white house in an indigo squircle (rx 23%), arched door
   as negative space. Exact geometry from the brand artifact - do not redraw. */

export type LogoVariant = "primary" | "reversed" | "onDark" | "mono";

const LOGO_COLORS: Record<
  LogoVariant,
  { tile: string; house: string; door: string; border?: string }
> = {
  primary: { tile: "#473fb0", house: "#ffffff", door: "#473fb0" },
  reversed: { tile: "#ffffff", house: "#473fb0", door: "#ffffff", border: "#e7e5de" },
  onDark: { tile: "#16160f", house: "#ffffff", door: "#16160f" },
  mono: { tile: "none", house: "currentColor", door: "var(--bg, #ffffff)" },
};

export function LogoMark({
  size = 28,
  variant = "primary",
  className = "",
}: {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}) {
  const c = LOGO_COLORS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="HomesBrain"
    >
      <rect
        width="120"
        height="120"
        rx="28"
        fill={c.tile}
        stroke={c.border ?? "none"}
        strokeWidth={c.border ? 3 : 0}
      />
      <path d="M60 30 L93 57 H27 Z" fill={c.house} />
      <rect x="36" y="54" width="48" height="38" rx="5" fill={c.house} />
      <path d="M52 92 V79 a8 8 0 0 1 16 0 V92 Z" fill={c.door} />
    </svg>
  );
}

/* Mark + wordmark lockup. The wordmark is always the sans stack at 800, never Fraunces. */
export function Logo({
  size = 28,
  variant = "primary",
  showWordmark = true,
  className = "",
  markClassName = "",
  wordmarkClassName = "",
}: {
  size?: number;
  variant?: LogoVariant;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: Math.round(size * 0.35) }}
    >
      <LogoMark size={size} variant={variant} className={markClassName} />
      {showWordmark && (
        <span
          className={`font-sans font-extrabold tracking-tight ${
            variant === "onDark" ? "text-white" : "text-ink"
          } ${wordmarkClassName}`}
        >
          HomesBrain
        </span>
      )}
    </span>
  );
}

export type TradeIconName =
  | "water_treatment"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "appliance"
  | string;

export function TradeIcon({
  trade,
  size = 20,
  className = "",
}: {
  trade?: TradeIconName | null;
  size?: number;
  className?: string;
}) {
  const p = { ...stroke };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {trade === "water_treatment" && (
        <path
          d="M12 3.5c3.4 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 2.6-6.3 6-10.5ZM9.5 14a2.5 2.5 0 0 0 2.5 2.5"
          {...p}
        />
      )}
      {trade === "hvac" && (
        <>
          <circle cx="12" cy="12" r="2" {...p} />
          <path
            d="M12 10c0-3 1.5-4.5 3.5-4.5S18 7.5 16 9l-4 1M14 12c3 0 4.5 1.5 4.5 3.5S16.5 18 15 16l-3-4M10 14c0 3-1.5 4.5-3.5 4.5S6 16.5 8 15l4-1M10 12c-3 0-4.5-1.5-4.5-3.5S7.5 6 9 8l3 4"
            {...p}
            strokeWidth={1.5}
          />
        </>
      )}
      {trade === "plumbing" && <path d="M4 10h6V4h4v6h6v4h-6v6h-4v-6H4v-4ZM10 10l4 4" {...p} />}
      {trade === "electrical" && <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" {...p} />}
      {trade === "appliance" && (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" {...p} />
          <circle cx="12" cy="13" r="4" {...p} />
          <path d="M8 7h3" {...p} strokeWidth={1.5} />
        </>
      )}
      {!["water_treatment", "hvac", "plumbing", "electrical", "appliance"].includes(
        trade ?? "",
      ) && (
        <path
          d="M14.7 6.3a4.5 4.5 0 0 0-6 6L4 17a2 2 0 1 0 3 3l4.7-4.7a4.5 4.5 0 0 0 6-6l-2.9 2.9-2.3-2.3 2.9-2.9Z"
          {...p}
        />
      )}
    </svg>
  );
}

/* Recall shield with a check that draws itself on. */
export function ShieldCheck({
  size = 22,
  className = "",
  animate = true,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3 8.3 7 10 4-1.7 7-5 7-10V6l-7-3Z" {...stroke} />
      <path
        d="m8.5 12 2.4 2.4 4.6-4.8"
        {...stroke}
        strokeWidth={2}
        strokeDasharray={12}
        strokeDashoffset={animate ? 12 : 0}
        className={animate ? "draw-on" : ""}
      />
    </svg>
  );
}

/* Simple stroke icons sharing the set's language (1.75 stroke, round caps). */

export function DocumentIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z"
        {...stroke}
      />
      <path d="M14 3.5V8h4.5M9.5 12.5h5M9.5 16h3.5" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

export function BellIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4.2-1.5 5.6-2 6.5h15c-.5-.9-2-2.3-2-6.5A5.5 5.5 0 0 0 12 4Z"
        {...stroke}
      />
      <path d="M10 19.5a2 2 0 0 0 4 0" {...stroke} />
    </svg>
  );
}

export function MailIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" {...stroke} />
      <path d="m4.5 7.5 7.5 6 7.5-6" {...stroke} />
    </svg>
  );
}

export function PaperclipIcon({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M17.5 11.5 11 18a4.2 4.2 0 0 1-6-6l7.5-7.5a2.8 2.8 0 0 1 4 4L9 16a1.4 1.4 0 0 1-2-2l6.5-6.5"
        {...stroke}
      />
    </svg>
  );
}

export function UserPlusIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="10" cy="8" r="3.5" {...stroke} />
      <path d="M4 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5M18.5 7.5v5M16 10h5" {...stroke} />
    </svg>
  );
}

export function LinkIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M10.5 13.5a4 4 0 0 0 6 .4l2.5-2.5a4 4 0 1 0-5.7-5.7l-1.4 1.4" {...stroke} />
      <path d="M13.5 10.5a4 4 0 0 0-6-.4L5 12.6a4 4 0 1 0 5.7 5.7l1.4-1.4" {...stroke} />
    </svg>
  );
}

/* Camera + mic - the magic-capture controls on log-a-job. */
export function CameraIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3.5 8.6a1.2 1.2 0 0 1 1.2-1.2h2.5l1.6-2.2h6.4l1.6 2.2h2.5a1.2 1.2 0 0 1 1.2 1.2v9.2a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2V8.6Z"
        {...stroke}
      />
      <circle cx="12" cy="13" r="3.2" {...stroke} />
    </svg>
  );
}

export function MicIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="9.2" y="3" width="5.6" height="10.2" rx="2.8" {...stroke} />
      <path d="M6.2 11.4a5.8 5.8 0 0 0 11.6 0M12 17.2V21" {...stroke} />
    </svg>
  );
}

/* Success check inside a burst - for done/sent states. */
export function CheckBurst({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className={className} aria-hidden="true">
      <circle cx="36" cy="36" r="22" fill="var(--indigobg)" className="anim-scale-in" />
      <path
        d="m27 36.5 6.5 6.5L46 30"
        {...stroke}
        stroke="var(--indigo)"
        strokeWidth={3}
        strokeDasharray={30}
        strokeDashoffset={30}
        className="draw-on"
      />
      <g stroke="var(--indigo)" strokeWidth={2} strokeLinecap="round" opacity={0.55}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="36"
            y1="6"
            x2="36"
            y2="11"
            transform={`rotate(${deg} 36 36)`}
            strokeDasharray={5}
            strokeDashoffset={5}
            className="draw-on"
            style={{ animationDelay: `${350 + (deg / 45) * 40}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}

/* Tiny sparkline for stat cards. */
export function SparkLine({
  points,
  width = 84,
  height = 28,
  color = "var(--indigo)",
  className = "",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = width / Math.max(points.length - 1, 1);
  const d = points
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(height - 4 - ((v - min) / span) * (height - 8)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        {...stroke}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={200}
        strokeDashoffset={200}
        className="draw-on"
      />
      <circle
        cx={(points.length - 1) * step}
        cy={height - 4 - ((points[points.length - 1] - min) / span) * (height - 8)}
        r="2.5"
        fill={color}
        className="anim-fade-in d-5"
      />
    </svg>
  );
}

/* Animated progress ring, e.g. viewed-rate. */
export function ProgressRing({
  value,
  size = 92,
  strokeWidth = 8,
  color = "var(--indigo)",
  label,
  className = "",
}: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={label ?? `${Math.round(value * 100)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={mounted ? c * (1 - Math.min(Math.max(value, 0), 1)) : c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight={700}
        fill="var(--ink)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

/* Hand-drawn underline flourish for headlines. Indigo is the brand accent;
   coral is reserved for payoff moments and must not underline brand copy. */
export function Scribble({
  className = "",
  color = "var(--indigo)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 220 14" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M4 9c40-6 84-7 118-4 30 2.6 62 2 94-2"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={230}
        strokeDashoffset={230}
        className="draw-on"
        style={{ animationDelay: "450ms", animationDuration: "0.8s" }}
      />
    </svg>
  );
}

/* Count-up number: animates from 0 to value on mount. */
export function CountUp({
  value,
  duration = 900,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(value);
      return;
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);
  return <span className={`tnum ${className}`}>{n}</span>;
}
