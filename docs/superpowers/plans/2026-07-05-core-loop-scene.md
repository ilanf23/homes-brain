# CoreLoopScene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `HouseScene` hero illustration with `CoreLoopScene`, an animated scene that plays out the HomesBrain core loop (pro logs job → record sent → homeowner claims) in sync with the homepage's rotating step text, plus compact static poses for the claim page and pro dashboard.

**Architecture:** One new component (`src/components/core-loop-scene.tsx`) rendering a hybrid scene: an SVG line-art layer (house, phone, dashed arc, traveling record chip) plus absolutely-positioned HTML overlays styled like real product UI (job card, phone screen, timeline chips). All choreography is CSS keyframes/transitions driven by a `data-step` attribute + keyed remounts; the `step` prop comes from the hero's existing `loopStep` state, so text and scene stay in sync. A `variant="compact"` renders a pure-SVG static pose.

**Tech Stack:** React 18, TypeScript, Tailwind v4 (`@theme` tokens: `bg-teal`, `text-coral`, `border-line`, etc.), plain CSS keyframes in `src/styles.css` following the existing `hb-*` naming. No new dependencies. No unit-test runner exists in this repo - each task's gate is `npm run build` (must exit 0) plus visual verification in the browser.

## Global Constraints

- Color roles are strict (CLAUDE.md): teal = pro actions, indigo = brand/record, coral = homeowner actions. Never mix.
- SVG language: `strokeWidth` ~2–2.25, round caps/joins, `currentColor` (match `src/components/svg.tsx`).
- Keyframes named `hb-cls-*`; scene classes named `cls-*`; added to `src/styles.css` in the Motion system section.
- Reduced motion: full variant must render a static tableau (all story elements visible at once, no movement). The site already has a global `prefers-reduced-motion` kill-switch at `src/styles.css:378`.
- Hero responsive behavior unchanged: wrapper keeps `hidden sm:block`.
- `HouseScene` is deleted only after all three call sites are migrated.
- Commit after every task. No real SMS/email/Twilio anywhere (unrelated to this feature, but a hard project rule).

---

### Task 1: Choreography CSS

**Files:**

- Modify: `src/styles.css` (insert after the `@keyframes hb-sway` block that ends at line 239, i.e. before the `/* Entry motion... */` comment at line 241; plus one addition inside the `@media (prefers-reduced-motion: reduce)` block at line 378)

**Interfaces:**

- Produces: CSS classes `cls-scene`, `cls-arc`, `cls-window-dot`, `cls-chip`, `cls-job`, `cls-typein`, `cls-send`, `cls-drop`, `cls-stamp`, `cls-ripple` and the `data-step` / `data-static` attribute contract consumed by Task 2's component.

- [ ] **Step 1: Add the keyframes and scene classes to `src/styles.css`**

Insert after line 239 (`}` closing `@keyframes hb-sway`):

```css
/* ---------- CoreLoopScene choreography ----------
   The hero scene acts out the core loop. Element visibility is driven by
   [data-step] on .cls-scene; one-shot animations restart via keyed remounts.
   data-static="true" (reduced motion) shows the whole tableau, frozen. */

@keyframes hb-cls-rise {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hb-cls-typein {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hb-cls-send {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
@keyframes hb-cls-travel {
  0% {
    opacity: 0;
    transform: translate(0px, 6px) scale(0.7);
  }
  12% {
    opacity: 1;
    transform: translate(12px, -14px) scale(1);
  }
  55% {
    transform: translate(86px, -36px) scale(1);
  }
  88% {
    opacity: 1;
    transform: translate(166px, 52px) scale(0.92);
  }
  100% {
    opacity: 0;
    transform: translate(172px, 66px) scale(0.75);
  }
}
@keyframes hb-cls-drop {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hb-cls-stamp {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes hb-cls-ripple {
  from {
    transform: scale(0.5);
    opacity: 0.7;
  }
  to {
    transform: scale(2.1);
    opacity: 0;
  }
}

/* Arc + window pulse only light up while the record travels. */
.cls-scene .cls-arc,
.cls-scene .cls-window-dot {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.cls-scene[data-step="record"] .cls-arc {
  opacity: 1;
}
.cls-scene[data-step="record"] .cls-window-dot {
  opacity: 1;
  animation: hb-pulse-dot 1.1s ease-in-out 2;
}

/* Traveling record chip (SVG group, remounted each record phase). */
.cls-chip {
  animation: hb-cls-travel 2.8s cubic-bezier(0.45, 0, 0.4, 1) 0.25s both;
}

/* Job card: hero of the pro phase, dimmed the rest of the loop. */
.cls-scene .cls-job {
  transition: opacity 0.5s ease;
  opacity: 0.4;
}
.cls-scene[data-step="pro"] .cls-job,
.cls-scene[data-static="true"] .cls-job {
  opacity: 1;
}
.cls-job-enter {
  animation: hb-cls-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cls-typein {
  animation: hb-cls-typein 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cls-send {
  animation: hb-cls-send 0.7s ease-in-out 1.7s 2;
}
.cls-drop {
  animation: hb-cls-drop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cls-stamp {
  animation: hb-cls-stamp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cls-ripple {
  animation: hb-cls-ripple 0.9s ease-out 0.5s 2;
  opacity: 0;
}

/* Static tableau (reduced motion): everything visible, chip frozen mid-arc. */
.cls-scene[data-static="true"] .cls-arc,
.cls-scene[data-static="true"] .cls-window-dot {
  opacity: 1;
}
.cls-scene[data-static="true"] .cls-chip {
  animation: none;
  opacity: 1;
  transform: translate(86px, -36px);
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: exit 0, no CSS syntax errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(hero): add CoreLoopScene choreography keyframes"
```

---

### Task 2: CoreLoopScene component

**Files:**

- Create: `src/components/core-loop-scene.tsx`

**Interfaces:**

- Consumes: Task 1's `cls-*` classes; `LogoMark` and `TradeIcon` from `@/components/svg`.
- Produces: `CoreLoopScene` component with props `{ step?: "pro" | "record" | "owner" | null; variant?: "full" | "compact"; pose?: "pro" | "owner"; celebrate?: boolean; className?: string }`. Exported type `LoopKey = "pro" | "record" | "owner"`.

- [ ] **Step 1: Create `src/components/core-loop-scene.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { LogoMark, TradeIcon } from "@/components/svg";

/* CoreLoopScene: the HomesBrain story, played out.
   Full variant syncs to the hero's rotating step: a pro logs a job (teal),
   the branded record travels to a phone (indigo), the homeowner claims it
   and the home's timeline grows (coral). Compact variant is a static pose
   for small placements. */

export type LoopKey = "pro" | "record" | "owner";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const JOBS = [
  { trade: "plumbing", label: "Water heater flushed" },
  { trade: "hvac", label: "HVAC tuned up" },
  { trade: "water_treatment", label: "Softener serviced" },
  { trade: "appliance", label: "Filter replaced" },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function CoreLoopScene({
  step = null,
  variant = "full",
  pose = "owner",
  celebrate = false,
  className = "",
}: {
  step?: LoopKey | null;
  variant?: "full" | "compact";
  pose?: "pro" | "owner";
  celebrate?: boolean;
  className?: string;
}) {
  if (variant === "compact") {
    return <CompactScene pose={pose} celebrate={celebrate} className={className} />;
  }
  return <FullScene step={step} className={className} />;
}

function FullScene({ step, className }: { step: LoopKey | null; className: string }) {
  const reduced = useReducedMotion();
  const [logged, setLogged] = useState(1);
  const prev = useRef<LoopKey | null>(step);

  // Each time the loop reaches "owner", the home's history gains a row.
  useEffect(() => {
    if (step === "owner" && prev.current !== "owner") setLogged((n) => n + 1);
    prev.current = step;
  }, [step]);

  const effStep: LoopKey | null = reduced ? null : step;
  const count = Math.min(3, logged);
  const rows = Array.from({ length: count }, (_, i) => JOBS[(logged - count + i) % JOBS.length]);
  const showChip = reduced || effStep === "record";
  const showRecordCard = reduced || effStep === "record" || effStep === "owner";
  const showClaim = reduced || effStep === "owner";

  return (
    <div
      className={`cls-scene relative select-none ${className}`}
      style={{ aspectRatio: "460 / 360" }}
      data-step={effStep ?? ""}
      data-static={reduced ? "true" : undefined}
      role="img"
      aria-label="A pro logs a job, a branded service record is sent to the homeowner's phone, and the home's history grows"
    >
      <svg viewBox="0 0 460 360" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* ground */}
        <path d="M20 300h420" {...stroke} stroke="var(--line)" />
        {/* house */}
        <g style={{ color: "var(--ink)" }}>
          <path d="M60 300V164l90-70 90 70v136" {...stroke} strokeWidth={2.25} />
          <path d="M40 180l110-86 110 86" {...stroke} strokeWidth={2.25} />
          <path d="M132 300v-46a18 18 0 0 1 36 0v46" {...stroke} />
          <rect x="84" y="198" width="28" height="28" rx="6" {...stroke} />
          <rect x="188" y="198" width="28" height="28" rx="6" {...stroke} />
        </g>
        {/* the home "remembering": window pulses as the record passes */}
        <circle cx="202" cy="212" r="5" fill="var(--indigo)" className="cls-window-dot" />
        {/* dashed arc: house → phone */}
        <path
          d="M230 128C270 60 340 62 376 134"
          {...stroke}
          strokeWidth={1.5}
          strokeDasharray="4 7"
          className="cls-arc dash-flow"
          style={{ color: "var(--indigo)" }}
        />
        {/* phone */}
        <g style={{ color: "var(--ink)" }}>
          <rect x="332" y="140" width="102" height="158" rx="18" {...stroke} strokeWidth={2.25} />
          <path d="M370 154h26" {...stroke} stroke="var(--line)" />
        </g>
        {/* traveling record chip */}
        {showChip && (
          <g key={`chip-${logged}`} className="cls-chip" style={{ transformBox: "fill-box" }}>
            <g transform="translate(172, 86)">
              <rect width="76" height="30" rx="9" fill="var(--bg)" stroke="var(--line)" />
              <rect x="7" y="7" width="16" height="16" rx="5" fill="var(--indigo)" />
              <path d="M15 10.5l6 5h-12Z" fill="#fff" />
              <rect x="10.5" y="15.5" width="9" height="6" rx="1.5" fill="#fff" />
              <rect
                x="29"
                y="9"
                width="36"
                height="4.5"
                rx="2.25"
                fill="var(--ink)"
                opacity="0.75"
              />
              <rect
                x="29"
                y="17"
                width="26"
                height="4.5"
                rx="2.25"
                fill="var(--muted)"
                opacity="0.6"
              />
            </g>
          </g>
        )}
      </svg>

      {/* Job card - the pro phase */}
      <div
        key={`job-${effStep === "pro" ? logged : "idle"}`}
        className={`cls-job absolute ${effStep === "pro" ? "cls-job-enter" : ""}`}
        style={{ left: "0.5%", top: "46%", width: "40%" }}
      >
        <div className="rounded-2xl border border-line bg-white p-2.5 shadow-sm">
          <span className="inline-block rounded-full bg-tealbg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-teal">
            Job logged
          </span>
          <div className="mt-1.5 space-y-1">
            <div
              className={effStep === "pro" ? "cls-typein" : ""}
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink">
                <TradeIcon trade="plumbing" size={11} className="shrink-0 text-teal" />
                Water heater - annual flush
              </div>
            </div>
            <div
              className={effStep === "pro" ? "cls-typein" : ""}
              style={{ animationDelay: "0.9s" }}
            >
              <div className="text-[10px] text-muted">Next service · Jan 2027</div>
            </div>
          </div>
          <div className="cls-send mt-2 rounded-full bg-teal py-1 text-center text-[10px] font-bold text-white">
            Send record →
          </div>
        </div>
      </div>

      {/* Phone screen - record arrives, homeowner claims */}
      <div
        className="absolute flex flex-col gap-1.5"
        style={{ left: "74.5%", top: "45.5%", width: "17.6%" }}
      >
        {showRecordCard ? (
          <div
            key={`rec-${effStep ?? "static"}-${logged}`}
            className={effStep === "record" ? "cls-drop" : ""}
            style={effStep === "record" ? { animationDelay: "2.7s" } : undefined}
          >
            <div className="rounded-lg border border-line bg-white p-1.5 shadow-sm">
              <div className="flex items-center gap-1">
                <LogoMark size={11} className="shrink-0" />
                <span className="text-[8px] font-extrabold leading-none text-ink">
                  Service record
                </span>
              </div>
              <div className="mt-1 text-[7.5px] leading-tight text-muted">
                128 Maple St · Recall check ✓
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 opacity-40">
            <div className="h-1.5 rounded-full bg-line" />
            <div className="h-1.5 w-3/4 rounded-full bg-line" />
          </div>
        )}
        {showClaim && (
          <div
            key={`claim-${logged}`}
            className="cls-drop relative"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="rounded-full bg-coral py-1 text-center text-[8px] font-bold text-white">
              Claim your home
            </div>
            <span className="cls-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-coral" />
          </div>
        )}
      </div>

      {/* Timeline - the history writing itself */}
      <div
        className="absolute flex items-center gap-1"
        style={{ left: "3%", top: "86.5%", width: "64%" }}
      >
        {rows.map((r, i) => (
          <span
            key={`${r.label}-${logged - count + i}`}
            className={`flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-white py-0.5 pl-1.5 pr-2 text-[8.5px] font-semibold text-ink shadow-sm ${
              i === count - 1 && effStep === "owner" ? "cls-stamp" : ""
            }`}
            style={i === count - 1 && effStep === "owner" ? { animationDelay: "0.6s" } : undefined}
          >
            <TradeIcon trade={r.trade} size={10} className="shrink-0 text-indigo" />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Compact static pose: pure SVG so it stays crisp and legible at 7–12rem. */
function CompactScene({
  pose,
  celebrate,
  className,
}: {
  pose: "pro" | "owner";
  celebrate: boolean;
  className: string;
}) {
  return (
    <svg
      viewBox="0 0 300 250"
      className={className}
      role="img"
      aria-label={
        pose === "pro"
          ? "A house with a freshly logged job card"
          : "A claimed home with its service history"
      }
    >
      {/* ground */}
      <path d="M20 210h260" {...stroke} stroke="var(--line)" />
      {/* house */}
      <g style={{ color: "var(--ink)" }}>
        <path d="M85 210v-92l65-50 65 50v92" {...stroke} strokeWidth={2.25} />
        <path d="M70 130l80-62 80 62" {...stroke} strokeWidth={2.25} />
        <path d="M132 210v-32a13 13 0 0 1 26 0v32" {...stroke} />
        <rect x="103" y="146" width="22" height="22" rx="5" {...stroke} />
        <rect x="165" y="146" width="22" height="22" rx="5" {...stroke} />
      </g>

      {pose === "pro" && (
        /* teal mini job card beside the house */
        <g transform="translate(8, 52)">
          <rect width="82" height="56" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <rect x="8" y="8" width="34" height="10" rx="5" fill="var(--tealbg)" />
          <rect x="13" y="11.5" width="24" height="3" rx="1.5" fill="var(--teal)" />
          <rect x="8" y="24" width="60" height="4" rx="2" fill="var(--ink)" opacity="0.7" />
          <rect x="8" y="32" width="44" height="4" rx="2" fill="var(--muted)" opacity="0.55" />
          <rect x="8" y="42" width="66" height="9" rx="4.5" fill="var(--teal)" />
        </g>
      )}

      {pose === "owner" && (
        <>
          {/* coral claimed check */}
          <g>
            <circle cx="218" cy="88" r="20" fill="var(--coralbg)" />
            <path
              key={celebrate ? "drawn" : "static"}
              d="M209 88l6 6 13-13"
              {...stroke}
              strokeWidth={2.5}
              stroke="var(--coral)"
              className={celebrate ? "draw-on" : ""}
              strokeDasharray={celebrate ? 28 : undefined}
              strokeDashoffset={celebrate ? 28 : undefined}
            />
          </g>
          {/* two timeline rows under the ground line */}
          <g>
            <rect
              x="70"
              y="220"
              width="160"
              height="13"
              rx="6.5"
              fill="var(--bg)"
              stroke="var(--line)"
            />
            <circle cx="80" cy="226.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="224.5" width="90" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
            <rect
              x="70"
              y="237"
              width="128"
              height="13"
              rx="6.5"
              fill="var(--bg)"
              stroke="var(--line)"
            />
            <circle cx="80" cy="243.5" r="3" fill="var(--indigo)" />
            <rect x="88" y="241.5" width="66" height="4" rx="2" fill="var(--ink)" opacity="0.65" />
          </g>
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/core-loop-scene.tsx
git commit -m "feat(hero): add CoreLoopScene animated core-loop component"
```

---

### Task 3: Wire the homepage hero

**Files:**

- Modify: `src/routes/index.tsx:4` (import) and `src/routes/index.tsx:106-108` (hero slot)

**Interfaces:**

- Consumes: `CoreLoopScene` from Task 2; `active.key` is already `"pro" | "record" | "owner"` from `LOOP_STEPS`.

- [ ] **Step 1: Swap the import**

At `src/routes/index.tsx:4`, change:

```tsx
import { HouseScene, Scribble, ShieldCheck, TradeIcon } from "@/components/svg";
```

to:

```tsx
import { Scribble, ShieldCheck, TradeIcon } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
```

- [ ] **Step 2: Swap the hero element**

At `src/routes/index.tsx:106-108`, change:

```tsx
<div className="anim-scale-in d-2 hidden sm:block">
  <HouseScene active={active.key} className="w-full max-w-md mx-auto anim-float" />
</div>
```

to:

```tsx
<div className="anim-scale-in d-2 hidden sm:block">
  <CoreLoopScene step={active.key} className="w-full max-w-md mx-auto" />
</div>
```

(`anim-float` is dropped deliberately: the scene now has its own internal motion, and floating the whole frame while a chip travels inside it reads as jitter.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Visual verification**

Run `npm run dev`, open the homepage in the browser, and watch at least two full loop cycles (~21s). Verify:

- Pro phase: job card rises, rows type in, "Send record" pill pulses.
- Record phase: dashed arc lights up, chip arcs from house to phone, window dot pulses, record card drops into the phone as the chip lands.
- Owner phase: claim button drops in with ripple; a new timeline chip stamps in; timeline caps at 3.
- Text steps and scene phases stay in sync (both driven by `active.key`).
- No horizontal overflow, no layout shift, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(hero): play the core loop in the homepage hero scene"
```

---

### Task 4: Compact call sites + delete HouseScene

**Files:**

- Modify: `src/routes/claim.$recordId.tsx:7` (import) and `:74` (element)
- Modify: `src/routes/pro.index.tsx:6` (import) and `:102` (element)
- Modify: `src/components/svg.tsx:97-176` (delete `HouseScene`)

**Interfaces:**

- Consumes: `CoreLoopScene` compact variant from Task 2.

- [ ] **Step 1: Migrate the claim page**

`src/routes/claim.$recordId.tsx:7`:

```tsx
import { Logo } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
```

`src/routes/claim.$recordId.tsx:74`:

```tsx
<CoreLoopScene variant="compact" pose="owner" celebrate={!!contact} className="w-48 mx-auto mb-2" />
```

- [ ] **Step 2: Migrate the pro dashboard empty state**

`src/routes/pro.index.tsx:6`:

```tsx
import { CountUp, ProgressRing, SparkLine } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
```

`src/routes/pro.index.tsx:102`:

```tsx
<CoreLoopScene variant="compact" pose="pro" className="w-28 shrink-0 opacity-90" />
```

- [ ] **Step 3: Delete `HouseScene` from `src/components/svg.tsx`**

Remove the comment + function at lines 97–176 (from `/* Hero illustration: a house with service-system nodes. ... */` through the closing `}` of `HouseScene`).

- [ ] **Step 4: Confirm no remaining references, then build**

Run: `grep -rn "HouseScene" src/`
Expected: no output.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Visual verification**

With the dev server running:

- `/claim/<any-record-id>` route: compact owner pose renders at `w-48`; after entering contact info the coral check draws itself once.
- `/pro` dashboard with an empty account: compact pro pose renders at `w-28`, legible, quiet.

- [ ] **Step 6: Commit**

```bash
git add src/routes/claim.\$recordId.tsx src/routes/pro.index.tsx src/components/svg.tsx
git commit -m "feat(hero): migrate claim + pro dashboard to CoreLoopScene, drop HouseScene"
```

---

### Task 5: Visual polish pass

Animation geometry written blind never lands pixel-perfect. This task is an explicitly sanctioned tuning loop - adjust coordinates, overlay percentages, font sizes, and animation timing in `core-loop-scene.tsx` / `styles.css` until the scene reads cleanly. Do not change the component API or the phase structure.

**Files:**

- Modify (as needed): `src/components/core-loop-scene.tsx`, `src/styles.css`

- [ ] **Step 1: Screenshot each phase**

With the dev server running, screenshot the hero during each of the three phases (the loop advances every 3.5s). Check against the spec's choreography section:

- Overlays don't collide with the SVG line art or each other.
- The chip's travel path visually follows the dashed arc (tune `hb-cls-travel` waypoints if it drifts).
- The chip lands where the record card drops in (tune the 88%/100% waypoints and the `cls-drop` 2.7s delay together).
- Text in mini cards is legible at `max-w-md` and doesn't wrap awkwardly.

- [ ] **Step 2: Reduced-motion check**

Emulate `prefers-reduced-motion: reduce` (DevTools → Rendering). Verify the full variant renders the static tableau: job card, chip frozen mid-arc, record card + claim button, 3-row timeline - no movement.

- [ ] **Step 3: Compact-size check**

Verify the claim page pose at `w-48` and the dashboard pose at `w-28` - every drawn element still legible, nothing clipped.

- [ ] **Step 4: Commit the polish**

```bash
git add src/components/core-loop-scene.tsx src/styles.css
git commit -m "polish(hero): tune CoreLoopScene geometry and timing"
```
