import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn } from "@/lib/ui";
import { MarketingShell, marketingHead, PipelinePhone } from "@/components/marketing";
import { VoiceToRecord } from "@/components/voice-record-visual";

export const Route = createFileRoute("/")({
  head: () =>
    marketingHead({
      title: "HomesBrain: get more Google reviews. Automatically. Free.",
      description:
        "For home service pros in St. Johns County. Log a job in 30 seconds. We ask your customer for the review, then tell you when it is time to go back.",
      path: "/",
    }),
  component: Landing,
});

const H_SANS = "font-sans font-extrabold tracking-[-0.02em] text-ink";

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.7 30.2.5 24 .5 14.8.5 6.9 5.8 3 13.4l7.9 6.1C12.7 13.7 17.9 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.6z"/>
      <path fill="#FBBC05" d="M10.9 28.5A14.6 14.6 0 0 1 10 24c0-1.6.3-3.1.9-4.5l-7.9-6.1A24 24 0 0 0 .5 24c0 3.9.9 7.6 2.5 10.6l7.9-6.1z"/>
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.1 0-11.3-4.1-13.1-9.9l-7.9 6.1C6.9 42.2 14.8 47.5 24 47.5z"/>
    </svg>
  );
}

function StarCircleIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coralbg">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="text-coral">
        <path
          fill="currentColor"
          d="M10 1.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15.3l-5.3 2.7 1-5.9L1.4 7.9l5.9-.9L10 1.7z"
        />
      </svg>
    </div>
  );
}

function BellCircleIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigobg">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-indigo"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </div>
  );
}

function MiniGoogleReviewCard() {
  return (
    <div className="relative rounded-[20px] border border-coral/15 bg-bg p-5 shadow-[0_8px_24px_-12px_rgba(194,70,31,0.18)]">
      <span className="absolute -top-2.5 -right-2.5 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-(--on-accent) shadow-sm">
        +1
      </span>
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`anim-fade-in d-${i + 1}`}
          >
            <path d="M10 1.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15.3l-5.3 2.7 1-5.9L1.4 7.9l5.9-.9L10 1.7z" fill="#f5b400" />
          </svg>
        ))}
      </div>
      <p className="mt-3 text-[15px] leading-snug text-ink">
        "Fast, honest, best plumber in Ponte Vedra."
      </p>
      <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-muted">
        <GoogleGlyph />
        New review, posted for you.
      </div>
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MiniNudgeCard() {
  return (
    <div className="relative">
      {/* main notification */}
      <div className="rounded-[20px] border border-coral/15 bg-bg p-4 shadow-[0_12px_30px_-14px_rgba(194,70,31,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo text-[13px] font-extrabold text-(--on-accent)">
            HB
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[15px] font-bold text-ink">Karen Whitfield</div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-coralbg px-2.5 py-1 text-[11px] font-bold text-coraldark">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
                Due today
              </span>
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              Water softener · serviced 6 months ago
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[12px] font-medium text-muted">Next up on your list</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-1.5 text-[12px] font-bold text-(--on-accent) shadow-[0_4px_12px_-4px_rgba(194,70,31,0.5)] transition-transform duration-150 active:scale-[0.97]"
          >
            <PhoneGlyph /> Call Karen
          </button>
        </div>
      </div>
    </div>
  );
}

/* Small line icons for the repeat-loop flywheel (Lucide paths). */
function LoopStroke({ d, size = 22 }: { d: string | string[]; size?: number }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const LOOP_NODES = [
  {
    pos: "left-1/2 top-[9%]",
    tone: "indigo" as const,
    label: "You do the job",
    d: "m14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  },
  {
    pos: "left-[91%] top-1/2",
    tone: "indigo" as const,
    label: "Record, your name on it",
    d: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
  },
  {
    pos: "left-1/2 top-[91%]",
    tone: "indigo" as const,
    label: "We nudge you when it's due",
    d: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  },
  {
    pos: "left-[9%] top-1/2",
    tone: "coral" as const,
    label: "They call you back",
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  },
];

function RepeatLoop() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[400px]">
      {/* orbit + direction arrow */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full text-indigo/30"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <marker id="loopArrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M1 1 6 3.5 1 6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <path
          d="M141 29 A82 82 0 1 1 59 29"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 6"
          markerEnd="url(#loopArrow)"
        />
      </svg>

      {/* center payoff */}
      <div className="absolute left-1/2 top-1/2 flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-coral text-center text-(--on-accent) shadow-[0_12px_30px_-8px_rgba(194,70,31,0.45)]">
        <LoopStroke
          size={28}
          d={["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5"]}
        />
        <div className="mt-1.5 text-[15px] font-extrabold leading-tight tracking-[-0.01em]">
          Again
          <br />& again
        </div>
      </div>

      {/* orbiting steps */}
      {LOOP_NODES.map((n) => (
        <div
          key={n.label}
          className={`absolute ${n.pos} flex w-[88px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2`}
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ring-4 ring-bg ${
              n.tone === "coral" ? "bg-coralbg text-coral" : "bg-indigobg text-indigo"
            }`}
          >
            <LoopStroke d={n.d} />
          </div>
          <span className="rounded-full border border-line bg-bg px-2.5 py-1 text-center text-[11px] font-bold leading-tight text-ink shadow-[0_1px_2px_rgba(22,22,15,0.05)]">
            {n.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Landing() {
  return (
    <MarketingShell mobileCta={{ label: "Create account", to: "/pro/signup", variant: "indigo" }}>
      {/* Hero: customers waiting to book, led by the workflow phone */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:pt-16 pb-14">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <div className="eyebrow text-indigo">For pros in St. Johns County</div>
            <h1 className={`${H_SANS} mt-5 text-4xl sm:text-6xl leading-[1.12] tracking-[-0.02em]`}>
              Never lose a customer
              <br />
              <span className="text-coral">you already earned.</span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-muted">
              Log a job in 30 seconds. Win more repeat customers, more reviews, and a professional record with your name on it.
            </p>
            <div className="mt-8 flex justify-center lg:justify-start">
              <Link to="/pro/signup" className="w-full sm:w-auto">
                <Btn variant="indigo" size="lg" className="w-full sm:w-auto min-h-12">
                  Create account
                </Btn>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              No card. No password. Free to start.
            </p>
          </div>

          {/* Booking workflow phone */}
          <div className="order-first lg:order-last">
            <PipelinePhone />
          </div>
        </div>

      </section>


      {/* The core promise: turn one job into a customer who keeps coming back */}
      <section className="border-t border-line py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <div className="eyebrow text-indigo">Why HomesBrain exists</div>
              <h2 className={`${H_SANS} mt-4 text-3xl sm:text-[42px] leading-[1.08]`}>
                Your best customers forget you.{" "}
                <span className="text-coral">We make sure they come back.</span>
              </h2>
              <p className="mt-5 max-w-md mx-auto lg:mx-0 text-[16px] leading-relaxed text-muted">
                You did great work once, then they moved on. Six months later, when the softener
                needs service, they Google a stranger. HomesBrain keeps every customer tied to your
                name, so the next call comes back to you. Again and again.
              </p>
              <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-2">
                <span className="rounded-full bg-indigobg px-3 py-1.5 text-[13px] font-bold text-indigo">
                  More repeat jobs
                </span>
                <span className="rounded-full bg-coralbg px-3 py-1.5 text-[13px] font-bold text-coraldark">
                  No customer forgotten
                </span>
              </div>
            </div>
            <RepeatLoop />
          </div>
        </div>
      </section>


      {/* HomesBrain AI: voice in, record out */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center">
            <div className="eyebrow text-indigo">HomesBrain AI, free for every pro</div>
            <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1]`}>
              Just talk. It fills itself in.
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-[15px] sm:text-base text-muted">
              You never type. Talk through the job, HomesBrain AI writes the record. Faster than
              your notebook.
            </p>
          </div>
          <div className="mt-10">
            <VoiceToRecord footer="Keep your notebook. This is just faster, and it lands you the review and the rebook." />
          </div>
        </div>
      </section>

      {/* The whole idea */}
      <section className="border-t border-line bg-soft py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="eyebrow text-indigo">The whole idea</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1]`}>
            Never forgotten. Never forget.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 text-left">
            <div className="rounded-[22px] border border-line bg-paper p-7 shadow-[0_1px_2px_rgba(22,22,15,0.04)]">
              <StarCircleIcon />
              <h3 className={`${H_SANS} mt-4 text-xl`}>The review</h3>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                Every job turns into a Google review, on its own. The world remembers you.
              </p>
              <div className="mt-6">
                <MiniGoogleReviewCard />
              </div>
            </div>
            <div className="rounded-[22px] border border-line bg-paper p-7 shadow-[0_1px_2px_rgba(22,22,15,0.04)]">
              <BellCircleIcon />
              <h3 className={`${H_SANS} mt-4 text-xl`}>The nudge</h3>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                We tell you when each customer is due. Your callback list builds itself and
                hands you the name.
              </p>
              <div className="mt-6">
                <MiniNudgeCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Homeowner nod band */}
      <section className="border-t border-line py-10">
        <div className="mx-auto max-w-4xl px-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-coralbg border border-coral/20 px-5 py-4">
            <div className="eyebrow text-coraldark">Own a home?</div>
            <Link
              to="/home/signup"
              className="text-[15px] font-bold text-coraldark hover:text-coral transition-colors"
            >
              Your home already has a record. See it. →
            </Link>
          </div>
          <p className="text-center text-sm text-muted">
            With your consent, your pro can text you your service records and reminders from
            HomesBrain. Message frequency varies. Msg &amp; data rates may apply. Reply STOP
            anytime. See our{" "}
            <Link to="/messaging-terms" className="font-semibold text-ink hover:underline">
              Messaging Terms
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
