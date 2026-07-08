import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { initials } from "./hb";

/* indigo = brand (default), coral = homeowner + payoff moments,
   teal = pro-world subbrand (pros directory, pro profiles, pros-near-you),
   amber = functional warning/status, red = errors/compliance. */
type Accent = "indigo" | "coral" | "teal" | "amber" | "red" | "ink";

const accentText: Record<Accent, string> = {
  indigo: "text-indigo",
  coral: "text-coral",
  teal: "text-teal",
  amber: "text-amber",
  red: "text-red",
  ink: "text-ink",
};
const accentBg: Record<Accent, string> = {
  indigo: "bg-indigobg",
  coral: "bg-coralbg",
  teal: "bg-tealbg",
  amber: "bg-amberbg",
  red: "bg-redbg",
  ink: "bg-soft",
};
const accentSolid: Record<Accent, string> = {
  indigo: "bg-indigo",
  coral: "bg-coral",
  teal: "bg-teal",
  amber: "bg-amber",
  red: "bg-red",
  ink: "bg-ink",
};
/* Dark tones for text sitting ON a tint background - the strong tones
   don't reach WCAG AA there (brand guidelines' "Dark (on tint)" column). */
const accentTextOnTint: Record<Accent, string> = {
  indigo: "text-indigodark",
  coral: "text-coraldark",
  teal: "text-tealdark",
  amber: "text-amberdark",
  red: "text-red",
  ink: "text-ink",
};


export function Eyebrow({ accent = "indigo", children }: { accent?: Accent; children: ReactNode }) {
  return <div className={`eyebrow ${accentText[accent]}`}>{children}</div>;
}

export function SectionHead({
  accent = "indigo",
  eyebrow,
  title,
  sub,
  center = true,
}: {
  accent?: Accent;
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center mx-auto max-w-2xl" : ""}>
      <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink">{title}</h2>
      {sub && <p className="mt-3 text-muted">{sub}</p>}
    </div>
  );
}

export function Pill({ accent = "ink", children }: { accent?: Accent; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${accentBg[accent]} ${accentTextOnTint[accent]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  className = "",
  lift = false,
  children,
}: {
  className?: string;
  lift?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[22px] border border-line bg-paper p-6 shadow-[0_1px_2px_rgba(22,22,15,0.04)] ${lift ? "liftable" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function KV({ k, v, mono = true }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="text-sm text-muted">{k}</div>
      <div
        className={`text-sm font-semibold text-ink text-right ${mono && typeof v === "string" ? "font-mono text-[13px] tnum" : ""}`}
      >
        {v}
      </div>
    </div>
  );
}

/* indigo = default brand CTA; coral = payoff CTAs (rebook, revenue) only. */
type BtnVariant = "primary" | "secondary" | "coral" | "indigo" | "ghost";

/* Fill text tokens instead of text-white so dark mode stays AA: ink fills
   flip light (text follows --bg), accent fills brighten (text follows
   --on-accent). */
const btnStyles: Record<BtnVariant, string> = {
  primary:
    "bg-ink text-background hover:bg-ink/85 hover:shadow-[0_10px_24px_-12px_rgba(22,22,15,0.5)]",
  secondary: "bg-soft text-ink hover:bg-line",
  coral:
    "bg-coral text-(--on-accent) hover:bg-coral/90 hover:shadow-[0_10px_24px_-12px_rgba(194,70,31,0.55)]",
  indigo:
    "bg-indigo text-(--on-accent) hover:bg-indigo/90 hover:shadow-[0_10px_24px_-12px_rgba(71,63,176,0.55)]",
  ghost: "bg-transparent text-ink hover:bg-soft",
};

/* Tiny inline spinner for Btn's loading state - transform-only animation. */
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="animate-spin" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="30"
        strokeDashoffset="20"
        opacity="0.9"
      />
    </svg>
  );
}

export function Btn({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeC =
    size === "lg"
      ? "px-6 py-3 text-base min-h-12"
      : size === "sm"
        ? "px-3 py-1.5 text-sm"
        : "px-4 py-2.5 text-sm min-h-11";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`pressable relative inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none ${sizeC} ${btnStyles[variant]} ${className}`}
    >
      {/* Keep the label in the layout while loading so the button never changes width. */}
      <span
        className={`inline-flex items-center justify-center gap-2 transition-opacity duration-150 ${loading ? "opacity-0" : ""}`}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === "lg" ? 16 : 14} />
        </span>
      )}
    </button>
  );
}

export function Avatar({
  name,
  accent = "indigo",
  size = 44,
}: {
  name: string;
  accent?: Accent;
  size?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center font-bold shrink-0 ${accentBg[accent]} ${accentText[accent]}`}
      style={{ width: size, height: size, fontSize: size * 0.36, borderRadius: size * 0.32 }}
    >
      {initials(name || "?")}
    </div>
  );
}

/* Switch with a 44px hit area around a 24px visual track. Writes should be
   optimistic: flip state before the request, revert on failure. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  accent = "indigo",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  accent?: Accent;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="pressable shrink-0 rounded-full p-2.5 -m-2.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ink/40"
    >
      <span
        className={`relative block w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? accentSolid[accent] : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper shadow transition-all duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* Label + optional sub on the left, control on the right. The list-row unit
   of every settings section. */
export function SettingRow({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-line last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      {children && <div className="shrink-0 flex items-center">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-ink mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </label>
  );
}

/* 16px on touch screens (prevents iOS focus-zoom), 44px min height for field use. */
const baseInput =
  "w-full min-h-11 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[16px] sm:text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10 hover:border-ink/30";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} min-h-[88px] ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Toast({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-ink text-background pl-4 pr-3 py-3 text-sm shadow-[0_16px_40px_-12px_rgba(22,22,15,0.5)] max-w-[92vw]"
      style={{ animation: "hb-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
        <circle cx="8" cy="8" r="8" fill="var(--indigo)" opacity="0.9" />
        <path
          d="m4.8 8.3 2.1 2.1 4.3-4.6"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="pressable shrink-0 rounded-full p-1 text-background/60 hover:text-background hover:bg-background/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 2.5l7 7M9.5 2.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/* Animated multi-step progress bar for wizards. */
export function StepBar({
  steps,
  current,
  accent = "indigo",
}: {
  steps: string[];
  current: number; // 0-indexed
  accent?: Accent;
}) {
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current + 1}
      aria-label={steps[current]}
    >
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className={`h-full rounded-full ${accentSolid[accent]} transition-all duration-500 ease-out`}
              style={{
                width: i < current ? "100%" : i === current ? "100%" : "0%",
                opacity: i === current ? 1 : i < current ? 0.45 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold tracking-wide text-muted">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`transition-colors duration-300 ${i === current ? accentText[accent] : ""}`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Four-box OTP input.
   ARCHIVED - no flow uses this right now. The mock "any 4 digits" verify steps
   were removed from /login, /pro/signup, and /claim because they verified
   nothing. Re-add a Verify step using this component when real Supabase OTP
   (email/phone) ships. */
export function OtpBoxes({
  value,
  onChange,
  accent = "indigo",
}: {
  value: string;
  onChange: (v: string) => void;
  accent?: Accent;
}) {
  const accentBorder: Record<Accent, string> = {
    indigo: "border-indigo",
    coral: "border-coral",
    teal: "border-teal",
    amber: "border-amber",
    red: "border-red",
    ink: "border-ink",
  };

  return (
    <div className="relative">
      <div className="flex gap-2.5 justify-center" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-13 h-15 sm:w-14 sm:h-16 rounded-xl border-2 bg-paper flex items-center justify-center font-mono text-2xl font-semibold transition-all duration-200 ${
              value.length === i
                ? `${accentBorder[accent]} scale-105 shadow-sm`
                : value.length > i
                  ? "border-line"
                  : "border-line"
            }`}
          >
            {value[i] ?? ""}
          </div>
        ))}
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="4-digit verification code"
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
      />
    </div>
  );
}

/* Skeleton loading block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-dvh bg-soft flex items-center justify-center">
      <div className="anim-fade-in flex flex-col items-center gap-4">
        <div className="w-full max-w-xs space-y-3">
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-24 w-72" />
          <Skeleton className="h-24 w-72" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
