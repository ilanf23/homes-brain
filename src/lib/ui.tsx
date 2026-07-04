import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { initials } from "./hb";

type Accent = "indigo" | "teal" | "coral" | "amber" | "red" | "ink";

const accentText: Record<Accent, string> = {
  indigo: "text-indigo",
  teal: "text-teal",
  coral: "text-coral",
  amber: "text-amber",
  red: "text-red",
  ink: "text-ink",
};
const accentBg: Record<Accent, string> = {
  indigo: "bg-indigobg",
  teal: "bg-tealbg",
  coral: "bg-coralbg",
  amber: "bg-amberbg",
  red: "bg-redbg",
  ink: "bg-soft",
};
const accentSolid: Record<Accent, string> = {
  indigo: "bg-indigo",
  teal: "bg-teal",
  coral: "bg-coral",
  amber: "bg-amber",
  red: "bg-red",
  ink: "bg-ink",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${accentBg[accent]} ${accentText[accent]}`}
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

type BtnVariant = "primary" | "secondary" | "teal" | "coral" | "indigo" | "ghost";

const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85 hover:shadow-[0_10px_24px_-12px_rgba(22,22,15,0.5)]",
  secondary: "bg-soft text-ink hover:bg-line",
  teal: "bg-teal text-white hover:bg-teal/90 hover:shadow-[0_10px_24px_-12px_rgba(15,110,86,0.55)]",
  coral:
    "bg-coral text-white hover:bg-coral/90 hover:shadow-[0_10px_24px_-12px_rgba(194,70,31,0.55)]",
  indigo:
    "bg-indigo text-white hover:bg-indigo/90 hover:shadow-[0_10px_24px_-12px_rgba(71,63,176,0.55)]",
  ghost: "bg-transparent text-ink hover:bg-soft",
};

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: { variant?: BtnVariant; size?: "sm" | "md" | "lg" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeC =
    size === "lg"
      ? "px-6 py-3 text-base"
      : size === "sm"
        ? "px-3 py-1.5 text-sm"
        : "px-4 py-2.5 text-sm";
  return (
    <button
      {...rest}
      className={`pressable inline-flex items-center justify-center gap-2 rounded-full font-semibold hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${sizeC} ${btnStyles[variant]} ${className}`}
    />
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

const baseInput =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-all duration-200 focus:border-ink focus:ring-2 focus:ring-ink/10 hover:border-ink/30";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} min-h-[88px] ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 rounded-2xl bg-ink text-white px-5 py-3 text-sm shadow-[0_16px_40px_-12px_rgba(22,22,15,0.5)] max-w-[92vw]"
      style={{ animation: "hb-slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      {children}
    </div>
  );
}

/* Animated multi-step progress bar for wizards. */
export function StepBar({
  steps,
  current,
  accent = "teal",
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
   ARCHIVED — no flow uses this right now. The mock "any 4 digits" verify steps
   were removed from /login, /pro/signup, and /claim because they verified
   nothing. Re-add a Verify step using this component when real Supabase OTP
   (email/phone) ships. */
export function OtpBoxes({
  value,
  onChange,
  accent = "teal",
}: {
  value: string;
  onChange: (v: string) => void;
  accent?: Accent;
}) {
  const accentBorder: Record<Accent, string> = {
    indigo: "border-indigo",
    teal: "border-teal",
    coral: "border-coral",
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
