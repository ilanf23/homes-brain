import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Btn, Card, Eyebrow, Field, Input, Pill, SectionHead, Select } from "@/lib/ui";
import { MarketingShell, marketingHead, PhoneKV } from "@/components/marketing";
import { CheckBurst, LogoMark, Scribble, ShieldCheck } from "@/components/svg";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/partners")({
  head: () =>
    marketingHead({
      title: "HomesBrain partners: the record follows the home.",
      description:
        "Builders, realtors, inspectors, insurers, and home-watch firms: start the record at closing, inspection, or handover, and stay part of the home's story.",
      path: "/partners",
    }),
  component: Partners,
});

/* ---- Motion helper (same pattern as the other marketing pages) ---- */

/* Adds .in-view once the wrapper scrolls into the viewport, which triggers
   the CSS .reveal / .draw-path / .seq children. Fires once. */
function InView({
  children,
  className = "",
  threshold = 0.18,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
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
  return (
    <div ref={ref} className={`${className} ${inView ? "in-view" : ""}`}>
      {children}
    </div>
  );
}

/* ---- Page data ---- */

const PARTNER_TYPES = ["Builders", "Realtors", "Inspectors", "Insurers", "Home-watch firms"];

const PROBLEM_STATS = [
  { value: "~$15B", caption: "the forgetting tax, every year" },
  { value: "~6M", caption: "homes change hands a year" },
  { value: "0", caption: "service records survive the sale" },
];

/* ---- Hero visual: the record card outliving three owners of the same home ---- */

function HandoffScene({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="mx-auto max-w-md rounded-[26px] border border-line bg-soft p-6 sm:p-7">
        {/* three ownerships, handed off left to right */}
        <div className="flex items-center justify-between gap-1.5">
          {(["Built · 2021", "Sold · 2024", "Sold · 2029"] as const).map((label, i) => (
            <div key={label} className="flex min-w-0 items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1.5 text-[11px] font-extrabold text-ink shadow-sm">
                {label}
              </span>
              {i < 2 && (
                <svg viewBox="0 0 34 12" className="w-7 shrink-0 text-indigo" aria-hidden="true">
                  <path
                    d="M2 6h24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="3 5"
                    className="dash-flow"
                  />
                  <path
                    d="M24 2l6 4-6 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
        {/* the record card that persists through every sale */}
        <div className="anim-float mt-6 rounded-[22px] border border-line bg-paper p-5 shadow-[0_24px_48px_-28px_rgba(22,22,15,0.4)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LogoMark size={18} />
              <span className="text-sm font-extrabold text-ink">14 Palm Row</span>
            </div>
            <Pill accent="indigo">Verified</Pill>
          </div>
          <div className="mt-4 space-y-2">
            <PhoneKV k="HVAC" v="Trane XR14 · 2021" />
            <PhoneKV k="Inspection" v="Clear · 2024" accentV />
            <PhoneKV k="Water heater" v="Serviced · 2029" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigodark">
            <span className="pulse-dot h-2 w-2 rounded-full bg-indigo" aria-hidden="true" />
            The record stays with the home
          </div>
        </div>
      </div>
    </div>
  );
}

/* The problem visual: paper records die at every sale; the HomesBrain line
   runs through the same closings unbroken. Draws when scrolled into view. */
function HandoffTimeline({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 720 208"
        className="w-full"
        role="img"
        aria-label="Timeline of a home sold twice: paper records fade out at each sale while the HomesBrain record continues unbroken."
      >
        {/* closing markers */}
        {[
          { x: 150, label: "Built 2021" },
          { x: 380, label: "Sold 2024" },
          { x: 610, label: "Sold 2029" },
        ].map((m) => (
          <g key={m.x}>
            <line
              x1={m.x}
              y1={34}
              x2={m.x}
              y2={168}
              stroke="var(--line)"
              strokeWidth={2}
              strokeDasharray="2 6"
            />
            <text
              x={m.x}
              y={22}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--muted)"
            >
              {m.label}
            </text>
          </g>
        ))}
        {/* lane 1: binders and PDFs, dying at each closing */}
        <text x={24} y={66} fontSize={12} fontWeight={700} fill="var(--muted)">
          Binders and PDFs
        </text>
        <path
          d="M24 88 H136"
          stroke="var(--muted)"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.75}
        />
        <path
          d="M164 88 H366"
          stroke="var(--muted)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="8 6"
          opacity={0.45}
        />
        <path
          d="M394 88 H480"
          stroke="var(--muted)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="3 9"
          opacity={0.25}
        />
        {[380, 610].map((x) => (
          <g key={x} stroke="var(--muted)" strokeWidth={2.5} strokeLinecap="round" opacity={0.6}>
            <path d={`M${x - 7} 81 l14 14`} />
            <path d={`M${x + 7} 81 l-14 14`} />
          </g>
        ))}
        <text x={496} y={92} fontSize={11.5} fontWeight={600} fill="var(--muted)" opacity={0.7}>
          gone by the second sale
        </text>
        {/* lane 2: the HomesBrain record, unbroken */}
        <text x={24} y={132} fontSize={12} fontWeight={700} fill="var(--indigo)">
          The HomesBrain record
        </text>
        <path
          d="M24 154 H696"
          stroke="var(--indigo)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={672}
          strokeDashoffset={672}
          className="draw-path"
          style={{ transitionDuration: "1.4s" }}
        />
        {[150, 380, 610].map((x) => (
          <circle key={x} cx={x} cy={154} r={5.5} fill="var(--indigo)" />
        ))}
      </svg>
      <p className="mt-3 text-center text-xs text-muted">
        Two sales in, the binder is gone. The record is not.
      </p>
    </div>
  );
}

/* ---- Page ---- */

function Partners() {
  const [form, setForm] = useState({ name: "", company: "", type: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await logEvent(null, "partner_lead", { ...form });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingShell mobileCta={null}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="text-center lg:text-left">
          <div className="anim-fade-up">
            <Eyebrow accent="indigo">For everyone who touches the home</Eyebrow>
          </div>
          <h1 className="anim-fade-up d-1 mt-4 text-5xl sm:text-6xl tracking-tight text-ink leading-[1.04]">
            Every home you touch{" "}
            <span className="relative inline-block">
              keeps a memory.
              <Scribble className="absolute -bottom-2 left-0 w-full h-3" />
            </span>
          </h1>
          <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0">
            If your business touches the home, you can start its record and stay part of its story
            for as long as the home stands.
          </p>
          <div className="anim-fade-up d-3 mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <a href="#become-a-partner">
              <Btn variant="indigo" size="lg">
                Become a partner
              </Btn>
            </a>
            <a href="#how-it-works">
              <Btn variant="secondary" size="lg">
                See how it works
              </Btn>
            </a>
          </div>
          <div className="anim-fade-up d-4 mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo" animate={false} /> Free to start
            </span>
            <span>·</span>
            <span>The homeowner owns the record</span>
            <span>·</span>
            <span>Verified at the source</span>
          </div>
        </div>
        <HandoffScene className="anim-scale-in d-2 hidden sm:block" />
      </section>

      {/* 1 · The handoff problem */}
      <section className="bg-soft border-y border-line py-24">
        <InView className="mx-auto max-w-5xl px-5">
          <div className="reveal">
            <SectionHead
              accent="indigo"
              eyebrow="The handoff problem"
              title="Every closing wipes the home's memory."
              sub="The builder's binder gets lost in a garage. The inspection PDF dies in a download folder. The insurer underwrites blind. The new owner starts from zero."
            />
          </div>
          <div className="reveal rd-1 mt-12 rounded-[22px] border border-line bg-paper p-5 sm:p-8">
            <HandoffTimeline />
          </div>
          <div className="reveal rd-2 relative mt-10 overflow-hidden rounded-[22px]">
            <img
              src="/images/landing/problem-homes.jpg"
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-ink/60" aria-hidden="true" />
            <div className="relative grid divide-y divide-white/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROBLEM_STATS.map((s) => (
                <div key={s.value} className="px-6 py-10 sm:py-14 text-center">
                  <div className="text-4xl sm:text-[44px] font-extrabold tracking-tight text-white tnum [text-shadow:0_2px_16px_rgba(22,22,15,0.5)]">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-white/90 [text-shadow:0_1px_10px_rgba(22,22,15,0.6)]">
                    {s.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="reveal rd-3 mt-4 text-center text-xs text-muted">
            Illustrative estimates of the US home-services forgetting tax.
          </p>
        </InView>
      </section>

      {/* Task 3 inserts: who we work with */}

      {/* Task 4 inserts: stat band + how partnering works */}

      {/* Task 5 inserts: FAQ */}

      {/* Lead form (restyled into a split layout in Task 5) */}
      <section id="become-a-partner" className="py-20">
        <div className="mx-auto max-w-xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Become a partner"
            title="Tell us where you fit"
            sub="A short note is all it takes. We'll come back within a couple of days."
          />
          <Card className="mt-10">
            {done ? (
              <div className="anim-scale-in text-center py-8">
                <CheckBurst size={64} className="mx-auto text-indigo" />
                <h3 className="mt-4 text-xl font-semibold tracking-tight font-display">
                  Thanks, we'll be in touch.
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Your note is in. Expect a reply at {form.email || "your email"} shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Field label="Your name">
                  <Input
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jordan Rivera"
                  />
                </Field>
                <Field label="Company">
                  <Input
                    required
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Rivera Homes"
                  />
                </Field>
                <Field label="What kind of partner are you?">
                  <Select
                    required
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="" disabled>
                      Choose one…
                    </option>
                    {PARTNER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="Other">Someone else</option>
                  </Select>
                </Field>
                <Field label="Work email">
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jordan@riverahomes.com"
                  />
                </Field>
                {error && (
                  <p role="alert" className="text-sm font-semibold text-red">
                    {error}
                  </p>
                )}
                <Btn
                  type="submit"
                  variant="indigo"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Become a partner
                </Btn>
              </form>
            )}
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
