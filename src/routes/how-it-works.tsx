import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Btn, Card, Eyebrow, KV, Pill, SectionHead } from "@/lib/ui";
import {
  CtaBand,
  MarketingShell,
  marketingHead,
  Phone,
  PhoneBtn,
  PhoneRow,
} from "@/components/marketing";
import {
  BellIcon,
  CameraIcon,
  CheckBurst,
  CountUp,
  DocumentIcon,
  MailIcon,
  ShieldCheck,
  TradeIcon,
  UserPlusIcon,
} from "@/components/svg";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    marketingHead({
      title: "How HomesBrain works: a home record that writes itself.",
      description:
        "A pro logs the job in 30 seconds. The homeowner gets a branded service record, claims it free, and owns it for life. One loop, everyone wins.",
      path: "/how-it-works",
    }),
  component: HowItWorks,
});

/* ---- Motion helpers (same patterns as the landing + audience pages) ---- */

/* True once the element has scrolled into the viewport. Fires once. */
function useInView(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* Adds .in-view once the wrapper scrolls into the viewport, which triggers
   the CSS .reveal / .draw-path / .seq / .tilt-* children. */
function InView({
  children,
  className = "",
  threshold = 0.18,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const { ref, inView } = useInView(threshold);
  return (
    <div ref={ref} className={`${className} ${inView ? "in-view" : ""}`}>
      {children}
    </div>
  );
}

/* SMIL animations don't obey the reduced-motion CSS override, so scenes that
   use <animateMotion>/<animate> gate them on this instead. */
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

/* Inline delay for the .seq sequenced reveal (styles.css). */
const seq = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* Pointer-tracked 3D tilt (mouse only). Sets the --rx/--ry vars that the
   .tilt-live transform reads; reduced-motion CSS flattens it entirely. */
function TiltLive({
  children,
  className = "",
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * max * 2).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * max * 2).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`tilt-live ${className}`}
    >
      {children}
    </div>
  );
}

/* Oversized ghost numeral behind each act header - outlined, never filled,
   so it stays a texture rather than competing with the headline. */
function GhostNumber({ n }: { n: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-10 right-0 select-none text-[110px] sm:text-[150px] font-extrabold leading-none tracking-tight text-transparent"
      style={{ WebkitTextStroke: "1.5px var(--line)" }}
    >
      {n}
    </span>
  );
}

/* ---- Hero: the loop, as one continuous orbit ----
   A record chip rides the ring through the three phases; each node lights up
   as the chip passes. SMIL keeps the chip and the node timing in perfect
   sync without any JS clock. */

const RING = { cx: 240, cy: 220, r: 150, dur: 8.4 };

function LoopNode({
  x,
  y,
  active,
  keyTimes,
  values,
  label,
  sub,
  labelAbove,
  children,
}: {
  x: number;
  y: number;
  active: boolean; // reduced-motion: everything fully lit, frozen
  keyTimes: string;
  values: string;
  label: string;
  sub: string;
  labelAbove?: boolean;
  children: ReactNode; // the icon paths, drawn in a 24x24 box
}) {
  const labelY = labelAbove ? -54 : 62;
  return (
    /* Base opacity is an attribute, not CSS - SMIL can only override attributes. */
    <g className="loop-node" opacity={active ? 1 : 0.55} transform={`translate(${x}, ${y})`}>
      {!active && (
        <animate
          attributeName="opacity"
          dur={`${RING.dur}s`}
          repeatCount="indefinite"
          keyTimes={keyTimes}
          values={values}
        />
      )}
      <circle r="36" fill="var(--bg)" stroke="var(--line)" strokeWidth="1.5" />
      <circle r="26" fill="var(--indigobg)" />
      <g transform="translate(-12, -12)" style={{ color: "var(--indigo)" }}>
        {children}
      </g>
      <text
        y={labelY}
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="var(--ink)"
        letterSpacing="-0.01em"
      >
        {label}
      </text>
      <text
        y={labelY + 17}
        textAnchor="middle"
        fontSize="11.5"
        fontWeight="600"
        fill="var(--muted)"
      >
        {sub}
      </text>
    </g>
  );
}

function LoopDiagram({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const { cx, cy, r, dur } = RING;
  const icon = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <svg
      viewBox="0 0 480 470"
      className={className}
      role="img"
      aria-label="The HomesBrain loop: a pro logs a job, a branded record is sent, the homeowner claims the home, and the loop repeats"
    >
      {/* the orbit */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth="1.75"
        strokeDasharray="3 8"
        strokeLinecap="round"
      />
      {/* direction chevrons, sitting between the nodes */}
      <g
        fill="none"
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      >
        <path d="M362 112l10 8-13 5" />
        <path d="M244 372l-12 4 3-13" />
        <path d="M104 145l-1-13 12 6" />
      </g>

      {/* center: the home the loop orbits */}
      <g style={{ color: "var(--ink)" }}>
        <path
          d="M204 258v-46l36-30 36 30v46"
          fill="var(--soft)"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M196 218l44-37 44 37"
          fill="none"
          stroke="currentColor"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M230 258v-18a10 10 0 0 1 20 0v18Z" fill="var(--indigo)" />
      </g>
      <text
        x={cx}
        y="286"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="700"
        fill="var(--muted)"
        letterSpacing="0.08em"
      >
        EVERY PASS
      </text>
      <text
        x={cx}
        y="301"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="700"
        fill="var(--muted)"
        letterSpacing="0.08em"
      >
        DEEPENS THE RECORD
      </text>

      {/* the traveling record chip */}
      {reduced ? (
        <g transform={`translate(${cx + r * 0.87}, ${cy - r * 0.5})`}>
          <RecordChipGlyph />
        </g>
      ) : (
        <g>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            rotate="0"
            path={`M${cx} ${cy - r}a${r} ${r} 0 1 1 -0.1 0`}
          />
          <RecordChipGlyph />
        </g>
      )}

      {/* the three phases */}
      <LoopNode
        x={cx}
        y={cy - r}
        active={reduced}
        keyTimes="0;0.30;0.34;0.96;1"
        values="1;1;0.55;0.55;1"
        label="Pro logs the job"
        sub="30 seconds, on-site"
        labelAbove
      >
        <path
          d="M14.7 6.3a4.5 4.5 0 0 0-6 6L4 17a2 2 0 1 0 3 3l4.7-4.7a4.5 4.5 0 0 0 6-6l-2.9 2.9-2.3-2.3 2.9-2.9Z"
          {...icon}
        />
      </LoopNode>
      <LoopNode
        x={cx + r * 0.866}
        y={cy + r * 0.5}
        active={reduced}
        keyTimes="0;0.30;0.34;0.63;0.67;1"
        values="0.55;0.55;1;1;0.55;0.55"
        label="Record is sent"
        sub="Text + email, branded"
      >
        <path
          d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z"
          {...icon}
        />
        <path d="M14 3.5V8h4.5M9.5 12.5h5M9.5 16h3.5" {...icon} strokeWidth={1.5} />
      </LoopNode>
      <LoopNode
        x={cx - r * 0.866}
        y={cy + r * 0.5}
        active={reduced}
        keyTimes="0;0.63;0.67;0.96;1"
        values="0.55;0.55;1;1;0.55"
        label="Home claims it"
        sub="One tap, free forever"
      >
        <path d="M4 11.5 12 5l8 6.5" {...icon} />
        <path d="M6 10.5V19h12v-8.5" {...icon} />
        <path d="m9.5 14 2 2 3.5-3.5" {...icon} />
      </LoopNode>
    </svg>
  );
}

/* The branded record chip, drawn around its own origin so animateMotion can
   carry it along the ring. */
function RecordChipGlyph() {
  return (
    <g transform="translate(-30, -13)">
      <rect
        width="60"
        height="26"
        rx="8"
        fill="var(--bg)"
        stroke="var(--indigo)"
        strokeWidth="1.5"
      />
      <rect x="6" y="6" width="14" height="14" rx="4.5" fill="var(--indigo)" />
      <path d="M13 9l5 4h-10Z" fill="#fff" />
      <rect x="9.2" y="13.5" width="7.6" height="5" rx="1.3" fill="#fff" />
      <rect x="25" y="7.5" width="28" height="4" rx="2" fill="var(--ink)" opacity="0.75" />
      <rect x="25" y="14.5" width="19" height="4" rx="2" fill="var(--muted)" opacity="0.6" />
    </g>
  );
}

/* ---- Act 02: the record's flight from the pro's phone to the homeowner's ---- */

function JourneyScene() {
  const reduced = useReducedMotion();
  /* One shared path: drawn on scroll, then the chip rides it on repeat. */
  const flight = "M132 150C300 42 620 42 788 148";
  return (
    <svg
      viewBox="0 0 920 240"
      className="w-full"
      role="img"
      aria-label="A branded service record travels from the pro's phone to the homeowner's phone"
    >
      {/* pro's phone, job just sent */}
      <g style={{ color: "var(--ink)" }}>
        <rect
          x="52"
          y="88"
          width="82"
          height="150"
          rx="16"
          fill="var(--bg)"
          stroke="currentColor"
          strokeWidth="2.25"
        />
        <rect x="82" y="96" width="22" height="6" rx="3" fill="var(--line)" />
        <rect x="64" y="112" width="58" height="34" rx="8" fill="var(--soft)" />
        <rect x="70" y="119" width="34" height="4.5" rx="2.25" fill="var(--ink)" opacity="0.7" />
        <rect x="70" y="128" width="24" height="4.5" rx="2.25" fill="var(--muted)" opacity="0.55" />
        <rect x="64" y="152" width="58" height="16" rx="8" fill="var(--indigo)" />
        <text x="93" y="163" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff">
          Sent ✓
        </text>
      </g>

      {/* homeowner's phone, record arriving */}
      <g style={{ color: "var(--ink)" }}>
        <rect
          x="786"
          y="88"
          width="82"
          height="150"
          rx="16"
          fill="var(--bg)"
          stroke="currentColor"
          strokeWidth="2.25"
        />
        <rect x="816" y="96" width="22" height="6" rx="3" fill="var(--line)" />
        <g className="reveal rd-4">
          <rect
            x="798"
            y="116"
            width="58"
            height="40"
            rx="8"
            fill="var(--bg)"
            stroke="var(--line)"
          />
          <rect x="804" y="122" width="12" height="12" rx="4" fill="var(--indigo)" />
          <path d="M810 125l4 3.4h-8Z" fill="#fff" />
          <rect x="820" y="123" width="30" height="4" rx="2" fill="var(--ink)" opacity="0.75" />
          <rect x="804" y="140" width="44" height="4" rx="2" fill="var(--muted)" opacity="0.55" />
          <rect x="804" y="147" width="32" height="4" rx="2" fill="var(--muted)" opacity="0.4" />
        </g>
        <g className="reveal rd-5">
          <rect x="798" y="164" width="58" height="15" rx="7.5" fill="var(--indigo)" />
          <text x="827" y="174" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff">
            Claim home
          </text>
        </g>
      </g>

      {/* flight path: the soft underlay draws on scroll, the dashes keep
          flowing on top of it (paint order = document order) */}
      <path
        d={flight}
        fill="none"
        stroke="var(--indigobg)"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset="100"
        className="draw-path"
      />
      <path
        d={flight}
        fill="none"
        stroke="var(--indigo)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="4 8"
        className="dash-flow opacity-70"
      />

      {/* the record, in flight */}
      {reduced ? (
        <g transform="translate(460, 68)">
          <RecordChipGlyph />
        </g>
      ) : (
        <g>
          <animateMotion
            dur="5s"
            repeatCount="indefinite"
            rotate="0"
            path={flight}
            calcMode="linear"
            keyPoints="0;0;1;1"
            keyTimes="0;0.1;0.78;1"
          />
          <RecordChipGlyph />
        </g>
      )}
    </svg>
  );
}

/* ---- Page data ---- */

const LOG_FIELDS = [
  {
    icon: <UserPlusIcon size={20} />,
    title: "Customer, once",
    body: "Name and number the first time only. Texting consent is captured and stored right there - compliance is built into the flow, not bolted on.",
  },
  {
    icon: <CameraIcon size={20} />,
    title: "Snap the nameplate",
    body: "One photo pulls make, model, and serial. No typing serial numbers on a ladder, no transcription errors in the record.",
  },
  {
    icon: <DocumentIcon size={20} />,
    title: "What was done",
    body: "A line or two. Add a photo of the finished work if you want the record to show it.",
  },
  {
    icon: <BellIcon size={20} />,
    title: "Next service date",
    body: "The quiet money field. It sets the reminder that brings this exact job back to you instead of to a search result.",
  },
];

const DELIVERY_DETAILS = [
  { k: "Delivered by", v: "Text + email, instantly" },
  { k: "Branded to", v: "The pro who did the work" },
  { k: "Recall check", v: "Run against the equipment" },
  { k: "Review ask", v: "Same link for every customer" },
];

const TIMELINE_ROWS = [
  { trade: "water_treatment" as const, label: "Softener installed", meta: "Aqua Works · Jun 2025" },
  { trade: "hvac" as const, label: "HVAC tuned up", meta: "Cool Air Co · Oct 2025" },
  { trade: "plumbing" as const, label: "Water heater flushed", meta: "Aqua Works · Jan 2026" },
  { trade: "electrical" as const, label: "Panel inspected", meta: "Volt Bros · Apr 2026" },
];

const FLYWHEEL_CHIPS = [
  { pos: "top", label: "Pro logs more jobs", sub: "each one takes 30 seconds" },
  { pos: "right", label: "The record deepens", sub: "equipment, dates, warranties" },
  { pos: "bottom", label: "Homeowner invites their pros", sub: "one tap per trade" },
  { pos: "left", label: "Rebooks come back", sub: "+$4,200 rebooked", coral: true },
];

const DIFFERENT = [
  {
    title: "Verified at the source",
    body: "Every entry comes from the pro who did the work, on the day they did it. Not memories, not a shoebox of receipts.",
    icon: "M12 3 5 6v5c0 5 3 8.3 7 10 4-1.7 7-5 7-10V6l-7-3ZM8.5 12l2.4 2.4 4.6-4.8",
  },
  {
    title: "Owned by the homeowner",
    body: "The record belongs to the home and the person who lives in it: free, forever, and it moves with the house when it sells.",
    icon: "M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5M12 12.5v3.5M10.2 14h3.6",
  },
  {
    title: "Portable across every pro",
    body: "One record, every trade. The plumber sees what the softener installer left behind. Nobody starts from zero.",
    icon: "M9.5 14.5 14.5 9.5M8 11l-2.8 2.8a3.5 3.5 0 0 0 5 5L13 16M16 13l2.8-2.8a3.5 3.5 0 0 0-5-5L11 8",
  },
];

/* ---- The page ---- */

function HowItWorks() {
  return (
    <MarketingShell>
      {/* Hero: the loop as one orbit */}
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-10 text-center">
        <div className="anim-fade-up">
          <Eyebrow accent="indigo">How it works</Eyebrow>
        </div>
        <h1 className="anim-fade-up d-1 mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          The job creates the record.
          <br className="hidden sm:block" /> The record keeps the customer.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-2xl mx-auto">
          One 30-second log starts a loop: the pro's work becomes the homeowner's record, and the
          record brings the pro back for the next visit. Here it is in slow motion.
        </p>
        <div className="anim-fade-up d-3 mt-8">
          <LoopDiagram className="mx-auto w-full max-w-[520px]" />
        </div>
      </section>

      {/* Act 01 - the pro logs the job */}
      <section className="bg-soft border-y border-line py-20 overflow-hidden">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="relative">
            <GhostNumber n="01" />
            <div className="reveal max-w-xl">
              <Eyebrow accent="indigo">Step 01 · The pro</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">
                Log the job in 30 seconds, on the driveway
              </h2>
              <p className="mt-4 text-muted">
                Four fields, most of them filled by a photo. It's faster than writing the invoice -
                and unlike the invoice, it starts working for you the moment it's sent.
              </p>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-10 items-center">
            {/* field-by-field anatomy */}
            <div className="space-y-5">
              {LOG_FIELDS.map((f, i) => (
                <div key={f.title} className={`reveal rd-${i + 1} flex gap-4`}>
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigobg text-indigo">
                    {f.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted">{f.body}</p>
                  </div>
                </div>
              ))}
              <div className="reveal rd-5 inline-flex items-baseline gap-3 rounded-2xl border border-line bg-white px-5 py-4">
                <span className="text-4xl font-extrabold tracking-tight text-indigo tnum">
                  <StatNumber value={28} />
                </span>
                <span className="text-sm font-semibold text-muted">seconds, start to send</span>
              </div>
            </div>

            {/* the phone, acting it out */}
            <div className="persp">
              <div className="tilt-r">
                <TiltLive>
                  <Phone title="New job" titleRight="Aqua Works">
                    <div className="seq" style={seq(0.3)}>
                      <PhoneRow
                        left={
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigobg text-[11px] font-extrabold text-indigodark">
                              DK
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-bold text-ink">Dana K.</div>
                              <div className="text-[11px] text-muted">128 Maple St, Austin</div>
                            </div>
                          </div>
                        }
                        right={
                          <span className="shrink-0 rounded-full bg-indigobg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-indigodark">
                            Consent ✓
                          </span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(0.8)}>
                      <div className="relative overflow-hidden rounded-xl border border-line bg-paper px-3.5 py-2.5">
                        <div className="flex items-center gap-2 text-muted">
                          <CameraIcon size={15} />
                          <span className="text-[11px] font-semibold">Nameplate scanned</span>
                        </div>
                        <div className="mt-1.5 text-[13px] font-bold text-ink">AquaSoft 40k</div>
                        <div className="text-[11px] text-muted tnum">
                          SN 88-4412 · Warranty to 2030
                        </div>
                        {/* the scan beam */}
                        <span
                          aria-hidden="true"
                          className="scan-beam pointer-events-none absolute inset-x-2 h-[3px] rounded-full bg-indigo/60"
                        />
                      </div>
                    </div>
                    <div className="seq" style={seq(1.3)}>
                      <PhoneRow
                        left={
                          <div>
                            <div className="text-[11px] font-semibold text-muted">
                              What was done
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded-full bg-soft px-2 py-0.5 text-[10.5px] font-semibold text-ink">
                                Resin bed check
                              </span>
                              <span className="rounded-full bg-soft px-2 py-0.5 text-[10.5px] font-semibold text-ink">
                                Salt refill
                              </span>
                            </div>
                          </div>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(1.7)}>
                      <PhoneRow
                        left={
                          <div className="flex items-center gap-2 text-ink">
                            <BellIcon size={15} className="text-indigo" />
                            <span className="text-[12px] font-bold">Next service · Mar 2027</span>
                          </div>
                        }
                        right={
                          <span className="text-[10.5px] font-semibold text-muted">
                            reminder set
                          </span>
                        }
                      />
                    </div>
                    <div className="seq" style={seq(2.2)}>
                      <div style={{ animation: "hb-cls-send 0.8s ease-in-out 3s 2" }}>
                        <PhoneBtn>Send record →</PhoneBtn>
                      </div>
                      <p className="mt-1.5 text-center text-[10px] text-muted">
                        Recall check + review ask included
                      </p>
                    </div>
                  </Phone>
                </TiltLive>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* Act 02 - the record travels */}
      <section className="py-20 overflow-hidden">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="relative">
            <GhostNumber n="02" />
            <div className="reveal max-w-xl">
              <Eyebrow accent="indigo">Step 02 · Automatic</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">
                A branded record is on its way before the van leaves
              </h2>
              <p className="mt-4 text-muted">
                The homeowner gets a clean service record carrying the pro's name and logo - by text
                and email, no app, no account. It opens with one tap.
              </p>
            </div>
          </div>

          <div className="reveal rd-2 mt-10">
            <JourneyScene />
          </div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {DELIVERY_DETAILS.map((d, i) => (
              <div
                key={d.k}
                className={`reveal rd-${i + 2} rounded-2xl border border-line bg-white px-4 py-3.5`}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                  {d.k}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                  {i === 2 && (
                    <ShieldCheck size={16} animate={false} className="text-indigo shrink-0" />
                  )}
                  {i === 0 && <MailIcon size={15} className="text-indigo shrink-0" />}
                  {d.v}
                </div>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* Act 03 - claim it, and the home starts remembering */}
      <section className="bg-soft border-y border-line py-20 overflow-hidden">
        <InView className="mx-auto max-w-6xl px-5">
          <div className="relative">
            <GhostNumber n="03" />
            <div className="reveal max-w-xl">
              <Eyebrow accent="indigo">Step 03 · The homeowner</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">
                One tap to claim, and the home never forgets again
              </h2>
              <p className="mt-4 text-muted">
                No password, no forms - the record is already filled in. From then on, every visit
                from every invited pro writes itself into the same timeline.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Claiming is free, forever - the record belongs to the home",
                  "Invite the other pros who work on the house with one tap each",
                  "When the house sells, the record moves with it",
                ].map((t, i) => (
                  <li
                    key={t}
                    className={`reveal rd-${i + 2} flex items-start gap-2.5 text-sm text-ink`}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigobg">
                      <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
                        <path
                          d="m2.5 5.8 2.2 2.2 3.8-4.5"
                          fill="none"
                          stroke="var(--indigo)"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* the timeline, writing itself - its own trigger so the
              choreography starts when the reader reaches the card */}
          <InView threshold={0.25} className="persp mt-12 max-w-2xl mx-auto">
            <div className="tilt-l">
              <Card className="relative">
                <div className="flex items-center gap-3">
                  <BurstOnView size={52} />
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">128 Maple St · claimed</h3>
                    <p className="text-sm text-muted">The home's memory, from day one</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-4">
                  {/* the spine draws downward as the rows stamp in */}
                  <svg width="20" viewBox="0 0 20 296" className="shrink-0" aria-hidden="true">
                    <path
                      d="M10 8v280"
                      fill="none"
                      stroke="var(--indigo)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset="100"
                      className="draw-path"
                      opacity="0.35"
                    />
                    {[8, 78, 148, 218, 288].map((y, i) => (
                      <circle
                        key={y}
                        cx="10"
                        cy={y}
                        r="4"
                        fill={i === 4 ? "var(--coral)" : "var(--indigo)"}
                        className="seq"
                        style={seq(0.3 + i * 0.35)}
                      />
                    ))}
                  </svg>
                  <div className="min-w-0 flex-1 space-y-4">
                    {TIMELINE_ROWS.map((r, i) => (
                      <div key={r.label} className="seq" style={seq(0.3 + i * 0.35)}>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigobg">
                              <TradeIcon trade={r.trade} size={16} className="text-indigo" />
                            </span>
                            <span className="truncate text-sm font-bold text-ink">{r.label}</span>
                          </div>
                          <span className="shrink-0 text-xs text-muted tnum">{r.meta}</span>
                        </div>
                      </div>
                    ))}
                    {/* the payoff row - coral is reserved for exactly this */}
                    <div className="seq" style={seq(0.3 + 4 * 0.35)}>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-coral/25 bg-coralbg px-4 py-3">
                        <span className="text-sm font-bold text-coraldark">
                          Rebooked with Aqua Works
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-coraldark tnum">
                          via reminder
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </InView>
        </InView>
      </section>

      {/* The flywheel - why one loop compounds */}
      <section className="py-20 overflow-hidden">
        <InView className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Then it compounds"
            title="Every pass around the loop makes the next one stronger"
            sub="More jobs deepen the record. A deeper record pulls in more pros. More pros mean more jobs. That's the flywheel."
          />
          <div className="reveal mt-12 relative mx-auto max-w-[420px]">
            <svg viewBox="0 0 320 320" className="w-full" aria-hidden="true">
              <circle
                cx="160"
                cy="160"
                r="118"
                fill="none"
                stroke="var(--indigo)"
                strokeWidth="1.75"
                strokeDasharray="3 9"
                strokeLinecap="round"
                opacity="0.5"
                className="spin-slow"
              />
              <circle cx="160" cy="160" r="88" fill="var(--soft)" />
              <g style={{ color: "var(--ink)" }}>
                <path
                  d="M126 196v-42l34-28 34 28v42"
                  fill="var(--bg)"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M118 158l42-35 42 35"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M150 196v-16a10 10 0 0 1 20 0v16Z" fill="var(--indigo)" />
              </g>
            </svg>
            {/* Chips orbit the wheel on wide screens; on phones they stack
                below it so nothing clips at the viewport edge. */}
            {FLYWHEEL_CHIPS.map((c, i) => {
              const pos: Record<string, string> = {
                top: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/3",
                right: "right-0 top-1/2 translate-x-[38%] -translate-y-1/2",
                bottom: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3",
                left: "left-0 top-1/2 -translate-x-[38%] -translate-y-1/2",
              };
              return (
                <div
                  key={c.label}
                  className={`reveal rd-${i + 2} absolute max-sm:hidden ${pos[c.pos]}`}
                >
                  <FlywheelChip chip={c} />
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:hidden">
            {FLYWHEEL_CHIPS.map((c, i) => (
              <div key={c.label} className={`reveal rd-${i + 2}`}>
                <FlywheelChip chip={c} wrap />
              </div>
            ))}
          </div>

          {/* the loop, in numbers */}
          <StatBand />
        </InView>
      </section>

      {/* Same visit, both sides */}
      <section className="bg-soft border-y border-line py-20">
        <InView className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="One job, two wins"
            title="The same visit, from both sides"
            sub="A softener service in Austin. Here's what each side walks away with."
          />
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="reveal rd-1 h-full">
              <Card className="h-full border-t-4 border-t-indigo">
                <Pill accent="indigo">The pro's side</Pill>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                  Aqua Works logs the job
                </h3>
                <div className="mt-4">
                  <KV k="Time to log" v="28 seconds" />
                  <KV k="Record sent" v="Text + email, branded" />
                  <KV k="Review ask" v="Sent automatically" />
                  <KV k="Next service" v="Mar 2027 - reminder set" />
                </div>
                <p className="mt-4 text-sm text-muted">
                  The customer now carries Aqua Works in their pocket. When the resin needs checking
                  in two years, the rebook comes back to them, not to a search result.
                </p>
              </Card>
            </div>
            <div className="reveal rd-2 h-full">
              <Card className="h-full border-t-4 border-t-indigo">
                <Pill accent="indigo">The homeowner's side</Pill>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                  Dana claims the record
                </h3>
                <div className="mt-4">
                  <KV k="Effort" v="One tap, no login" />
                  <KV k="On file" v="Make, model, serial, warranty" />
                  <KV
                    k="Recall status"
                    v={
                      <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-sm">
                        <ShieldCheck size={16} animate={false} /> No known recalls
                      </span>
                    }
                  />
                  <KV k="Cost" v="Free, forever" />
                </div>
                <p className="mt-4 text-sm text-muted">
                  Dana never typed a thing. The home now remembers its own equipment, and every pro
                  she invites deepens the record.
                </p>
              </Card>
            </div>
          </div>
        </InView>
      </section>

      {/* Why it's different */}
      <section className="py-20">
        <InView className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Why it's different"
            title="A record you can actually trust"
          />
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {DIFFERENT.map((d, i) => (
              <div key={d.title} className={`reveal rd-${i + 1} h-full`}>
                <Card className="h-full">
                  <span className="flex w-11 h-11 items-center justify-center rounded-xl bg-indigobg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill="none"
                      stroke="var(--indigo)"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d={d.icon}
                        pathLength={100}
                        strokeDasharray="100"
                        strokeDashoffset="100"
                        className="draw-path"
                        style={{ transitionDelay: `${0.25 + i * 0.15}s` }}
                      />
                    </svg>
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight font-display">
                    {d.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{d.body}</p>
                </Card>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* Dual CTA */}
      <section className="pb-20">
        <InView className="mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-6">
          <div className="reveal rd-1 h-full">
            <Card lift className="h-full text-center py-10">
              <Pill accent="indigo">For pros</Pill>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                Never lose a customer again.
              </h3>
              <p className="mt-2 text-sm text-muted max-w-xs mx-auto">
                Log a job in 30 seconds. Free to start, no card.
              </p>
              <div className="mt-6">
                <Link to="/pro/signup">
                  <Btn variant="teal" size="lg">
                    Claim your profile
                  </Btn>
                </Link>
              </div>
            </Card>
          </div>
          <div className="reveal rd-2 h-full">
            <Card lift className="h-full text-center py-10">
              <Pill accent="indigo">For homeowners</Pill>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                Your home, finally remembered.
              </h3>
              <p className="mt-2 text-sm text-muted max-w-xs mx-auto">
                Free forever. It fills itself every time a pro does the work.
              </p>
              <div className="mt-6">
                <Link to="/for-homeowners">
                  <Btn variant="indigo" size="lg">
                    I own a home, see how
                  </Btn>
                </Link>
              </div>
            </Card>
          </div>
        </InView>
      </section>

      <CtaBand
        eyebrow="Every home remembers"
        accent="indigo"
        title="Start the loop with one job."
        sub="It takes a pro 30 seconds to give a home its memory."
      >
        <Link to="/pro/signup">
          <Btn variant="indigo" size="lg">
            Start free, no card
          </Btn>
        </Link>
        <Link to="/for-pros">
          <Btn variant="secondary" size="lg">
            See plans for pros
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}

function FlywheelChip({
  chip,
  wrap = false,
}: {
  chip: (typeof FLYWHEEL_CHIPS)[number];
  wrap?: boolean;
}) {
  const nowrap = wrap ? "" : "whitespace-nowrap";
  return (
    <div
      className={`rounded-2xl border px-3.5 py-2 text-center shadow-sm ${
        chip.coral ? "border-coral/25 bg-coralbg" : "border-line bg-white"
      }`}
    >
      <div
        className={`${nowrap} text-[13px] font-extrabold ${chip.coral ? "text-coraldark" : "text-ink"}`}
      >
        {chip.label}
      </div>
      <div
        className={`${nowrap} text-[11px] font-semibold ${chip.coral ? "text-coraldark/80" : "text-muted"}`}
      >
        {chip.sub}
      </div>
    </div>
  );
}

/* Count-up that waits for its own viewport entry, so the numbers roll when
   the reader actually sees them. */
function StatNumber({ value }: { value: number }) {
  const { ref, inView } = useInView(0.4);
  return <span ref={ref}>{inView ? <CountUp value={value} /> : 0}</span>;
}

/* CheckBurst's draw-on plays on mount, so hold it out of the tree until its
   spot is actually on screen. */
function BurstOnView({ size = 52 }: { size?: number }) {
  const { ref, inView } = useInView(0.5);
  return (
    <div ref={ref} style={{ width: size, height: size }} className="shrink-0">
      {inView && <CheckBurst size={size} />}
    </div>
  );
}

const STATS = [
  { value: 28, suffix: "s", label: "to log a job" },
  { value: 1, suffix: " tap", label: "to claim the home" },
  { value: 0, suffix: "$", prefix: true, label: "for homeowners, forever" },
  { value: 5, suffix: " trades", label: "on one shared record" },
];

function StatBand() {
  return (
    <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={`reveal rd-${i + 1} rounded-2xl border border-line bg-white px-5 py-6 text-center`}
        >
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-indigo tnum">
            {s.prefix ? (
              <>
                {s.suffix}
                <StatNumber value={s.value} />
              </>
            ) : (
              <>
                <StatNumber value={s.value} />
                {s.suffix}
              </>
            )}
          </div>
          <div className="mt-1.5 text-sm font-semibold text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
