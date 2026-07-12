import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Btn } from "@/lib/ui";
import { MarketingShell, marketingHead, Phone, PhoneBtn, PhoneKV, PipelinePhone } from "@/components/marketing";
import { CameraIcon, MicIcon } from "@/components/svg";

export const Route = createFileRoute("/for-pros")({
  head: () =>
    marketingHead({
      title: "HomesBrain for pros: never get forgotten again.",
      description:
        "Homeowners set a reminder after the job. When it's due, they come back to you, and we tell you the moment they do. Free to start, no card.",
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
  { value: "Warm callbacks", caption: "come back on their own", warm: true },
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
];

const FREE_FEATURES = [
  "30-second job logging",
  "Branded record sent to the homeowner",
  "Automatic Google review requests",
  "Appliance summary and recall check",
  "Your own customer and job list",
];

const PRO_FEATURES = [
  "Automated service reminders",
  "One-tap rebooking",
  "Recall-driven lead lists",
  "New owner leads at resale",
  "Analytics on records, reviews, rebooks",
];


const INTEGRATIONS = [
  {
    emoji: "🖋️",
    title: "On paper or texts today?",
    body: "You are exactly who this is built for. Free, and finally a record your customer keeps.",
  },
  {
    emoji: "🧾",
    title: "Already using QuickBooks, Jobber, or Housecall Pro?",
    body: "Keep them. HomesBrain sits on top as the homeowner-owned record. Direct sync is coming later.",
  },
];


function ForPros() {
  return (
    <MarketingShell mobileCta={{ label: "Claim your profile", to: "/pro/signup", variant: "indigo" }}>
      {/* Hero */}
      <section className={`${CONTAINER} pt-14 pb-16`}>
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <div className="anim-fade-up">
              <div className="eyebrow text-teal">For pros</div>
            </div>
            <h1 className={`${H_SANS} anim-fade-up d-1 mt-4 text-4xl sm:text-5xl leading-[1.08]`}>
              You do the best work in St. Johns County. Google barely knows it.
            </h1>
            <p className="anim-fade-up d-2 mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Homeowners set a maintenance reminder after the job. When it's due, they come back to
              you, and we tell you the second it happens. Reviews and the branded record are automatic.
              Free to start, no card.
            </p>
            <div className="anim-fade-up d-3 mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Link to="/pro/signup" className="w-full sm:w-auto">
                <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
                  Claim your profile
                </Btn>
              </Link>
              <Link
                to="/how-it-works"
                className="pressable inline-flex min-h-12 items-center justify-center rounded-full border border-dashed border-ink/25 bg-paper px-6 py-3 text-base font-semibold text-ink hover:bg-soft"
              >
                See how it works
              </Link>
            </div>
            <p className="anim-fade-up d-5 mt-6 text-sm text-muted">
              Your pipeline starts the first time a customer sets a reminder.
            </p>
          </div>

          <div className="anim-fade-up d-4">
            <PipelinePhone />
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
        <p className="anim-fade-up d-5 mt-5 text-center text-sm text-muted">
          Founding pros of St. Johns County. Claim your profile, tell us the towns you serve, and
          you show up for every homeowner there.
        </p>
      </section>

      {/* Logging a job */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <SectionHeadC
          eyebrow="Logging a job"
          title={
            <>
              You never type. Just
              <br />
              snap or speak.
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
              Add customers as you go. Every home gets a profile.
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
              <PhoneBtn>Add your first customer</PhoneBtn>
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
                Claim your profile
              </span>
            </Link>

          </div>

          {/* Pro */}
          <div className="rounded-[24px] bg-indigo p-7 text-white sm:p-8">
            <div className="flex items-center gap-2">
              <div className="eyebrow text-white/70">Pro · brings them back</div>
              <span className="rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Founding · Charter Class of 2027
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
                Claim your profile
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
              Keep the tools you
              <br />
              already use.
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
          An invoice is not a record. We are the homeowner-owned record that sits on top of whatever
          you already use.
        </p>
      </section>

      {/* For homeowners: why they value the record */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="rounded-[24px] bg-coralbg p-7 sm:p-9">
          <div className="eyebrow text-coraldark">For homeowners</div>
          <h2 className={`${H_SANS} mt-3 text-2xl sm:text-3xl leading-[1.15] text-coraldark`}>
            Homeowners keep the record. That's why your name stays on it.
          </h2>
          <p className="mt-3 text-[15px] text-coraldark/90 max-w-xl">
            Your customer owns their home's living record for life. Every appliance, every job,
            every warranty, kept and searchable. When something is due, your name is the one they
            see. That's the reminder, and the rebook.
          </p>
        </div>

        {/* Cold start: honest, "seeding" framing */}
        <div className="mt-8 rounded-[20px] border border-dashed border-ink/20 bg-paper p-6 text-center">
          <p className="text-[15px] text-ink">
            We're seeding St. Johns pro by pro.{" "}
            <span className="font-bold">Claim early and rank first.</span>
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className={`${CONTAINER} border-t border-line py-24 text-center`}>
        <h2 className={`${H_SANS} text-3xl sm:text-4xl`}>Snap a photo. Keep your customer.</h2>
        <div className="mt-8 flex justify-center">
          <Link to="/pro/signup" className="w-full sm:w-auto">
            <Btn variant="indigo" size="lg" className="w-full sm:w-auto min-h-12">
              Claim your profile
            </Btn>
          </Link>
        </div>
      </section>

    </MarketingShell>
  );
}
