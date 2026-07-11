import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Btn } from "@/lib/ui";
import { MarketingShell, marketingHead, Phone, PhoneBtn, PhoneKV } from "@/components/marketing";
import { CameraIcon, MicIcon, SyncIcon } from "@/components/svg";

export const Route = createFileRoute("/for-pros")({
  head: () =>
    marketingHead({
      title: "HomesBrain for pros: never lose a customer again.",
      description:
        "Log a job in 30 seconds, send a branded record, and get more five star Google reviews, automatically. Free to start, no card.",
      path: "/for-pros",
    }),
  component: ForPros,
});

/* Layout matches the approved landing mock: one narrow centered column,
   hairline rules between sections, sans extrabold headlines (overriding the
   global Fraunces h1–h3 for this page only). */
const CONTAINER = "mx-auto w-full max-w-[770px] px-5";
const H_SANS = "font-sans font-extrabold tracking-[-0.02em] text-ink";

function SectionHeadC({
  eyebrow,
  title,
  titleClassName = "max-w-md",
}: {
  eyebrow: string;
  title: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="text-center">
      <div className="eyebrow text-muted">{eyebrow}</div>
      <h2
        className={`${H_SANS} mt-4 mx-auto text-3xl sm:text-[34px] leading-[1.15] ${titleClassName}`}
      >
        {title}
      </h2>
    </div>
  );
}

function Check({ className = "text-indigo" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
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

function CheckRow({ dark = false, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <li
      className={`flex items-center gap-3 border-b py-3.5 last:border-b-0 last:pb-0 ${
        dark ? "border-white/15" : "border-line"
      }`}
    >
      <Check className={dark ? "text-white/80" : "text-indigo"} />
      <span className={`text-[15px] ${dark ? "text-white/95" : "text-ink"}`}>{children}</span>
    </li>
  );
}

function LogJobPhone({
  doneLabel,
  showReviewRow = false,
  floatDelay,
}: {
  doneLabel: string;
  showReviewRow?: boolean;
  floatDelay?: string;
}) {
  return (
    <Phone title="Log this job" titleRight="Dana R." floatDelay={floatDelay}>
      <div className="rounded-2xl border-2 border-dashed border-indigo/40 bg-indigobg/60 px-3 py-4 text-center">
        <div className="text-xl leading-none" aria-hidden="true">
          📷
        </div>
        <div className="mt-2 text-xs font-bold text-indigo">Snap the nameplate</div>
      </div>
      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        <Check /> Auto detected
      </div>
      <PhoneKV k="Make" v="Bradford White" />
      <PhoneKV k="Warranty" v="to 2031" />
      {showReviewRow && <PhoneKV k="Review request" v="on" accentV />}
      <PhoneBtn>{doneLabel}</PhoneBtn>
    </Phone>
  );
}

/* Warm accent (coral) marks the payoff moments only - everything else is indigo. */
const HERO_STATS = [
  { value: "30 sec", caption: "to log a job", warm: false },
  { value: "$0", caption: "to start, no card", warm: false },
  { value: "1 rebook", caption: "covers the year", warm: true },
];

/* Demo-strip primitives for the capture cards: raw input (dashed) becomes a
   clean record row (solid + check), the ledger doing the typing. */
function DemoArrow() {
  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 18 12"
      aria-hidden="true"
      className="shrink-0 text-ink/30"
    >
      <path
        d="M1 6h14m0 0-4-4m4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InToken({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed border-ink/25 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-muted">
      {children}
    </span>
  );
}

function OutToken({ k, v }: { k: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[11px]">
      <Check />
      <span className="text-muted">{k}</span>
      <span className="font-bold text-ink">{v}</span>
    </span>
  );
}

function Waveform() {
  return (
    <span className="flex shrink-0 items-center gap-[2.5px]" aria-hidden="true">
      {[5, 9, 6, 11, 7, 4].map((h, i) => (
        <span key={i} className="w-[2.5px] rounded-full bg-indigo/70" style={{ height: h }} />
      ))}
    </span>
  );
}

const LOG_WAYS = [
  {
    icon: CameraIcon,
    title: "Snap a photo",
    body: "Photograph the nameplate or invoice. We read the make, model, serial, and dates for you.",
    demo: (
      <>
        <InToken>
          <CameraIcon size={13} className="shrink-0" /> nameplate.jpg
        </InToken>
        <DemoArrow />
        <OutToken k="Make" v="Bradford White" />
        <OutToken k="Model" v="RE350S6" />
        <OutToken k="Warranty" v="to 2031" />
      </>
    ),
  },
  {
    icon: MicIcon,
    title: "Speak a note",
    body: "Ten seconds of voice. We turn it into a clean, structured service record.",
    demo: (
      <>
        <InToken>
          <MicIcon size={13} className="shrink-0" />
          <Waveform />
          <span className="min-w-0 italic">"Swapped the filter, due next June"</span>
        </InToken>
        <DemoArrow />
        <OutToken k="Done" v="Filter replaced" />
        <OutToken k="Next service" v="Jun 2027" />
      </>
    ),
  },
  {
    icon: SyncIcon,
    title: "Sync your tools",
    body: "Already on Jobber or QuickBooks. Jobs flow in automatically, zero new entry.",
    demo: (
      <>
        <InToken>Jobber</InToken>
        <InToken>QuickBooks</InToken>
        <DemoArrow />
        <OutToken k="Job #1042" v="Record sent" />
      </>
    ),
  },
];

const FREE_FEATURES = [
  "30 second job logging",
  "Branded record sent to the homeowner",
  "Get paid on the spot, card and tap to pay",
  "Automatic Google review requests",
  "Appliance summary and recall check",
  "Your own customer and job list",
  "Works with QuickBooks and Jobber",
];

const PRO_FEATURES = [
  "Automated service reminders",
  "One tap rebooking",
  "Recall driven lead lists",
  "New owner leads at resale",
  "Analytics on records, reviews, rebooks",
  "Lower payment processing rate",
];

const INTEGRATIONS = [
  {
    emoji: "💳",
    title: "On QuickBooks or Square?",
    body: "We sync your jobs and add the homeowner record on top. Nothing to switch.",
  },
  {
    emoji: "📱",
    title: "On Jobber or Housecall Pro?",
    body: "They keep your record. We give your customer one they own across every pro.",
  },
  {
    emoji: "🖋️",
    title: "On paper or texts?",
    body: "You are exactly who this is built for. Free, and finally a record your customer keeps.",
  },
];

function ForPros() {
  return (
    <MarketingShell mobileCta={{ label: "Start free", to: "/pro/signup", variant: "indigo" }}>
      {/* Hero */}
      <section className={`${CONTAINER} pt-14 pb-16`}>
        <div className="anim-fade-up">
          <div className="eyebrow text-indigo">For pros</div>
        </div>
        <h1 className={`${H_SANS} anim-fade-up d-1 mt-4 text-4xl sm:text-5xl leading-[1.08]`}>
          Never lose a customer again.
        </h1>
        <p className="anim-fade-up d-2 mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Log a job in 30 seconds, send a branded record, and get more five star Google reviews,
          automatically. We flag recalls too. It replaces the $75 to $599 a month review tool you
          may already pay for. Free to start, no card.
        </p>
        <div className="anim-fade-up d-3 mt-8 flex flex-wrap gap-3">
          <Link to="/pro/signup">
            <Btn variant="indigo" size="lg">
              Start free
            </Btn>
          </Link>
          <Link
            to="/how-it-works"
            className="pressable inline-flex min-h-12 items-center justify-center rounded-full border border-dashed border-ink/25 bg-paper px-6 py-3 text-base font-semibold text-ink hover:bg-soft"
          >
            See how it works
          </Link>
        </div>

        <div className="anim-fade-up d-4 mt-14 flex justify-center">
          <div className="w-full max-w-[270px]">
            <LogJobPhone doneLabel="Done in 30 sec" showReviewRow />
          </div>
        </div>

        {/* Stat card */}
        <div className="anim-fade-up d-5 mt-12 divide-y divide-line rounded-[22px] border border-line bg-paper">
          {HERO_STATS.map((s) => (
            <div key={s.value} className="px-6 py-9 text-center">
              <div
                className={`font-sans text-4xl font-extrabold tracking-tight tnum ${
                  s.warm ? "text-coral" : "text-indigo"
                }`}
              >
                {s.value}
              </div>
              <div className="mt-1.5 text-sm text-muted">{s.caption}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Logging a job */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <SectionHeadC
          eyebrow="Logging a job"
          title={
            <>
              You never type. Snap,
              <br />
              speak, or sync.
            </>
          }
        />
        <div className="mt-10 space-y-5">
          {LOG_WAYS.map((w) => (
            <div
              key={w.title}
              className="overflow-hidden rounded-[20px] border border-line bg-paper"
            >
              <div className="flex items-start gap-4 p-6 sm:p-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigobg text-indigo">
                  <w.icon size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className={`${H_SANS} text-lg`}>{w.title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted">{w.body}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-soft px-6 py-4 sm:px-7">
                {w.demo}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <SectionHeadC
          eyebrow="How it works"
          title={
            <>
              From your customer list to
              <br />
              the next booking.
            </>
          }
          titleClassName="max-w-lg"
        />
        <div className="mt-12 grid gap-12 text-center sm:grid-cols-3 sm:gap-5">
          {/* Step 1 */}
          <div>
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-indigo font-sans text-sm font-bold text-white">
              1
            </div>
            <h3 className={`${H_SANS} mt-4 text-lg`}>Bring your customers</h3>
            <p className="mx-auto mt-2 max-w-[240px] text-sm text-muted">
              Import your list or add as you go. Every home gets a profile.
            </p>
            <Phone title="Your customers" className="mt-6">
              {(
                [
                  ["Dana R.", "Water softener", "active", "text-indigo"],
                  ["The Patels", "Softener + filter", "active", "text-indigo"],
                  ["M. Alvarez", "RO system", "due soon", "text-amber"],
                ] as const
              ).map(([name, sub, status, tone]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2.5"
                >
                  <div>
                    <div className="text-xs font-bold text-ink">{name}</div>
                    <div className="text-[11px] text-muted">{sub}</div>
                  </div>
                  <span className={`text-[11px] font-semibold ${tone}`}>{status}</span>
                </div>
              ))}
              <PhoneBtn>Import from QuickBooks</PhoneBtn>
            </Phone>
          </div>

          {/* Step 2 */}
          <div>
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-indigo font-sans text-sm font-bold text-white">
              2
            </div>
            <h3 className={`${H_SANS} mt-4 text-lg`}>Log the job in 30 seconds</h3>
            <p className="mx-auto mt-2 max-w-[240px] text-sm text-muted">
              Snap the nameplate. We read make, model, and warranty for you.
            </p>
            <div className="mx-auto mt-6 max-w-[270px] text-left">
              <LogJobPhone doneLabel="Done" floatDelay="-1.6s" />
            </div>
          </div>

          {/* Step 3 */}
          <div>
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-coral font-sans text-sm font-bold text-white">
              3
            </div>
            <h3 className={`${H_SANS} mt-4 text-lg`}>Win the rebook</h3>
            <p className="mx-auto mt-2 max-w-[240px] text-sm text-muted">
              We remind the customer when service is due. They book you back.
            </p>
            <Phone title="Due for service" className="mt-6" floatDelay="-3.2s">
              {(
                [
                  ["M. Alvarez", "RO filter due"],
                  ["The Patels", "Annual service"],
                ] as const
              ).map(([name, sub]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2.5"
                >
                  <div>
                    <div className="text-xs font-bold text-ink">{name}</div>
                    <div className="text-[11px] text-muted">{sub}</div>
                  </div>
                  <span className="rounded-full bg-coral px-3 py-1.5 text-[11px] font-bold text-white">
                    Rebook
                  </span>
                </div>
              ))}
              <div className="rounded-xl bg-coralbg px-3 py-3 text-center">
                <div className="font-sans text-base font-extrabold text-coraldark tnum">
                  + $4,200
                </div>
                <div className="text-[11px] text-muted">rebooked this month</div>
              </div>
            </Phone>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <SectionHeadC
          eyebrow="Simple plans"
          title={
            <>
              Free does the job. Pro
              <br />
              brings them back.
            </>
          }
        />
        <div className="mt-12 space-y-6">
          {/* Free */}
          <div className="rounded-[24px] border border-line bg-paper p-7 sm:p-8">
            <div className="eyebrow text-indigo">Free</div>
            <div className="mt-3 font-sans text-5xl font-extrabold tracking-tight text-indigo tnum">
              $0
            </div>
            <p className="mt-3 text-[15px] text-muted">
              Look professional and get reviews. No card.
            </p>
            <ul className="mt-5 border-t border-line">
              {FREE_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <Link to="/pro/signup" className="mt-7 block">
              <span className="pressable flex min-h-13 w-full items-center justify-center rounded-2xl bg-indigobg px-6 py-3.5 text-base font-bold text-indigo hover:bg-indigo hover:text-white transition-colors">
                Start free
              </span>
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-[24px] bg-indigo p-7 text-white sm:p-8">
            <div className="flex items-center gap-2">
              <div className="eyebrow text-white/70">Pro · brings them back</div>
              <span className="rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Founding
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <div className="font-sans text-5xl font-extrabold tracking-tight tnum">
                $19
                <span className="text-base font-medium text-white/70"> /mo</span>
              </div>
              <div className="text-base font-medium text-white/60 line-through tnum">
                $59
              </div>
            </div>
            <p className="mt-3 text-[15px] text-white/80">
              Founding price. Locked for life for the first 1,000 pros. $59/mo after.
            </p>
            <ul className="mt-5 border-t border-white/15">
              {PRO_FEATURES.map((f) => (
                <CheckRow key={f} dark>
                  {f}
                </CheckRow>
              ))}
            </ul>
            <Link to="/pro/signup" className="mt-7 block">
              <span className="pressable flex min-h-13 w-full items-center justify-center rounded-2xl bg-paper px-6 py-3.5 text-base font-bold text-indigo hover:bg-white/90">
                Start free, upgrade anytime
              </span>
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          Reviews are always free. One saved rebook covers the year.
        </p>
      </section>

      {/* Works with what you have */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <SectionHeadC
          eyebrow="Works with what you have"
          title={
            <>
              Already on QuickBooks or
              <br />
              Jobber? Keep them.
            </>
          }
          titleClassName="max-w-lg"
        />
        <div className="mt-10 space-y-5">
          {INTEGRATIONS.map((c) => (
            <div key={c.title} className="rounded-[20px] bg-soft p-7">
              <div className="text-2xl leading-none" aria-hidden="true">
                {c.emoji}
              </div>
              <h3 className={`${H_SANS} mt-5 text-lg`}>{c.title}</h3>
              <p className="mt-2 text-[15px] text-muted">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-md text-center text-[15px] text-muted">
          An invoice is not a record. We are the homeowner owned record that sits on top of whatever
          you already use.
        </p>
      </section>

      {/* Closing CTA */}
      <section className={`${CONTAINER} border-t border-line py-24 text-center`}>
        <h2 className={`${H_SANS} text-3xl sm:text-4xl`}>Snap a photo. Keep your customer.</h2>
        <div className="mt-8 flex justify-center">
          <Link to="/pro/signup">
            <Btn variant="indigo" size="lg">
              Start free
            </Btn>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
