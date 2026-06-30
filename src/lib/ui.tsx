import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
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
      <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">{title}</h2>
      {sub && <p className="mt-3 text-muted">{sub}</p>}
    </div>
  );
}

export function Pill({
  accent = "ink",
  children,
}: {
  accent?: Accent;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${accentBg[accent]} ${accentText[accent]}`}
    >
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[22px] border border-line bg-white p-6 ${className}`}>{children}</div>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="text-sm text-muted">{k}</div>
      <div className="text-sm font-semibold text-ink text-right">{v}</div>
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "teal" | "coral" | "indigo" | "ghost";

const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:opacity-90",
  secondary: "bg-soft text-ink hover:bg-line",
  teal: "bg-teal text-white hover:opacity-90",
  coral: "bg-coral text-white hover:opacity-90",
  indigo: "bg-indigo text-white hover:opacity-90",
  ghost: "bg-transparent text-ink hover:bg-soft",
};

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: { variant?: BtnVariant; size?: "sm" | "md" | "lg" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeC = size === "lg" ? "px-6 py-3 text-base" : size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${sizeC} ${btnStyles[variant]} ${className}`}
    />
  );
}

export function Avatar({ name, accent = "indigo", size = 44 }: { name: string; accent?: Accent; size?: number }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold ${accentBg[accent]} ${accentText[accent]}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
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
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} min-h-[88px] ${props.className ?? ""}`} />;
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-ink text-white px-5 py-3 text-sm shadow-lg max-w-[92vw]">
      {children}
    </div>
  );
}
