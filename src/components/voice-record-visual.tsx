import type { ReactNode } from "react";
import { MicIcon } from "@/components/svg";
import { Phone } from "@/components/marketing";

const H_SANS = "font-sans font-extrabold tracking-[-0.02em] text-ink";

function Check({ className = "text-indigo" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path
        d="m2.5 7.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Waveform({ bars = 10, tone = "indigo" }: { bars?: number; tone?: "indigo" | "white" }) {
  const heights = [10, 18, 14, 22, 12, 20, 16, 24, 12, 18, 14, 20];
  const color = tone === "indigo" ? "bg-indigo/70" : "bg-white/80";
  return (
    <div className="flex items-end gap-[3px] h-6" aria-hidden="true">
      {heights.slice(0, bars).map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full animate-pulse ${color}`}
          style={{ height: h, animationDelay: `${i * 90}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}

export function VoiceOrb({ size = "lg" }: { size?: "lg" | "md" }) {
  const box = size === "lg" ? "h-24 w-24" : "h-20 w-20";
  const core = size === "lg" ? "h-16 w-16" : "h-14 w-14";
  const iconSize = size === "lg" ? 26 : 22;
  return (
    <div className={`relative flex ${box} items-center justify-center`}>
      <span className="absolute inset-0 rounded-full bg-indigo/20 animate-ping [animation-duration:2s]" aria-hidden="true" />
      <span className="absolute inset-2 rounded-full bg-indigo/15" aria-hidden="true" />
      <span className={`relative flex ${core} items-center justify-center rounded-full bg-indigo text-white shadow-lg`}>
        <MicIcon size={iconSize} />
      </span>
    </div>
  );
}

export function VoiceBlock({ caption = "10 seconds of talking" }: { caption?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <VoiceOrb />
      <div className="mt-4">
        <Waveform />
      </div>
      <div className="mt-4 eyebrow text-indigo">HomesBrain AI</div>
      <p className="mt-2 max-w-[240px] text-[14px] italic text-ink">
        "Swapped the water heater at the Patels. Bradford White, warranty to 2031."
      </p>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {caption}
      </div>
    </div>
  );
}

export function RecordCard() {
  const rows: Array<[string, string]> = [
    ["Customer", "The Patels"],
    ["Work", "Water heater swap"],
    ["Make", "Bradford White"],
    ["Warranty", "to 2031"],
  ];
  return (
    <div className="rounded-2xl border border-line bg-soft p-5">
      <div className="flex items-center justify-between">
        <div className={`${H_SANS} text-base`}>Job record</div>
        <span className="rounded-full bg-indigo/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo">
          Done in 12 sec
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map(([k, v], i) => (
          <li
            key={k}
            className={`anim-fade-up d-${i + 1} flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5`}
          >
            <Check />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{k}</span>
            <span className="ml-auto text-[13px] font-bold text-ink">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-indigo/60">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="rotate-90 sm:rotate-0"
      >
        <path
          d="M4 12h14m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function VoiceToRecord({ footer }: { footer?: ReactNode }) {
  return (
    <>
      <div className="rounded-[24px] border border-line bg-paper p-6 sm:p-8">
        <div className="grid items-center gap-6 sm:gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <VoiceBlock />
          <Arrow />
          <RecordCard />
        </div>
      </div>
      {footer && (
        <p className="mt-6 mx-auto max-w-xl text-center text-[15px] text-muted">{footer}</p>
      )}
    </>
  );
}

/* Phone mockup showing the HomesBrain AI voice logging screen. Reuses the
   marketing Phone frame so it matches other product shots. */
export function VoicePhone({ floatDelay }: { floatDelay?: string }) {
  return (
    <Phone title="Log a job" titleRight="HomesBrain AI" floatDelay={floatDelay}>
      <div className="flex flex-col items-center pt-4 pb-2">
        <VoiceOrb />
        <div className="mt-4">
          <Waveform bars={10} />
        </div>
        <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-indigo">
          HomesBrain AI
        </div>
        <p className="mt-2 px-2 text-center text-[11px] italic leading-snug text-ink">
          "Swapped the water heater at the Patels. Bradford White, warranty to 2031."
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigobg px-2.5 py-1 text-[9.5px] font-semibold text-indigo">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-indigo/60 animate-ping" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-indigo" />
          </span>
          Talking. 10 seconds.
        </div>
      </div>
    </Phone>
  );
}
