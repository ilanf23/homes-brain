import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Btn } from "@/lib/ui";
import { MarketingShell, marketingHead, Phone } from "@/components/marketing";
import { VoiceToRecord } from "@/components/voice-record-visual";

export const Route = createFileRoute("/for-pros")({
  head: () =>
    marketingHead({
      title: "HomesBrain for pros: reviews and rebooks, on their own.",
      description:
        "Every job turns into a Google review and a reason for the customer to bring you back. Free to start, nothing to learn.",
      path: "/for-pros",
    }),
  component: ForPros,
});

const CONTAINER = "mx-auto w-full max-w-[770px] px-5";
const H_SANS = "font-sans font-extrabold tracking-[-0.02em] text-ink";

function CallbackRow({ initial, name, need, area }: { initial: string; name: string; need: string; area: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-teal/10 border border-teal/20 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-white font-extrabold">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-ink">
          {name}, {need}
        </div>
        <div className="text-[12px] text-muted">{area}</div>
      </div>
      <span className="rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-bold text-white">
        Call
      </span>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-line bg-paper p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-white text-sm font-extrabold">
          {n}
        </span>
        <h3 className={`${H_SANS} text-lg`}>{title}</h3>
      </div>
      <p className="mt-3 text-[15px] text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function ForPros() {
  return (
    <MarketingShell mobileCta={{ label: "Claim your profile", to: "/pro/signup", variant: "indigo" }}>
      {/* Hero */}
      <section className={`${CONTAINER} pt-14 pb-14 text-center`}>
        <div className="eyebrow text-teal">Charter Pro, Class of 2027</div>
        <h1 className={`${H_SANS} mt-4 text-4xl sm:text-5xl leading-[1.08]`}>
          You do the best work in St. Johns County.
          <br />
          <span className="text-teal">Google barely knows it.</span>
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-lg text-muted">
          HomesBrain turns every job into a Google review and a reason for the customer to bring
          you back. Free to start, nothing to learn.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/pro/signup" className="w-full sm:w-auto">
            <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
              Claim your profile
            </Btn>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">Log your first job before you set up anything.</p>
      </section>

      {/* Just talk: voice in, record out */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="text-center">
          <div className="eyebrow text-indigo">HomesBrain AI, free for every pro</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-[34px] leading-[1.15]`}>
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
      </section>

      {/* Your pipeline, shown as the pro app */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="text-center">
          <div className="eyebrow text-teal">Your pipeline</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-[34px] leading-[1.15]`}>
            Callbacks, with the names attached.
          </h2>
        </div>
        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-[320px]">
            <Phone>
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="text-[13px] font-extrabold text-ink">Your pipeline</div>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-teal">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-teal/60 animate-ping" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-teal" />
                  </span>
                  3 due
                </span>
              </div>
              <CallbackRow initial="K" name="Karen" need="softener due" area="Ponte Vedra" />
              <CallbackRow initial="M" name="Mike" need="AC drain line due" area="Nocatee" />
              <CallbackRow initial="R" name="Rosa" need="water heater flush" area="St. Augustine" />
            </Phone>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          3 callbacks waiting. One saved rebook covers the year.
        </p>
      </section>

      {/* How it works */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="text-center">
          <div className="eyebrow text-teal">How it works</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-[34px] leading-[1.15]`}>
            Three taps, near zero typing.
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          <Step
            n={1}
            title="Log a job in 30 seconds"
            body="Confirm the home, talk, snap a photo. Done."
          />
          <Step
            n={2}
            title="The review sends itself"
            body="Your customer gets the Google ask, automatically."
          />
          <Step
            n={3}
            title="We nudge you when they are due"
            body="The callback comes back to you, not into thin air."
          />
        </div>
      </section>

      {/* Pricing: free and founding Pro */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-[24px] border border-teal/20 bg-soft p-7 sm:p-8 flex flex-col">
            <div className="flex items-baseline gap-3">
              <h3 className={`${H_SANS} text-2xl text-ink`}>Free</h3>
              <div className="font-sans text-3xl font-extrabold tracking-tight text-teal tnum">$0</div>
            </div>
            <p className="mt-1 text-sm text-muted">Start here. The wedge never expires.</p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink flex-1">
              {[
                "Automatic Google reviews",
                "Your branded job record",
                "Verified pro profile",
                "Recall check",
                "See who is due, your callback list",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-6" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-[24px] bg-indigo p-7 sm:p-8 text-white flex flex-col">
            <span className="inline-block self-start rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Founding price, first 1,000 pros
            </span>
            <div className="mt-4 font-sans text-5xl font-extrabold tracking-tight tnum">
              $19<span className="text-xl font-medium text-white/70">/mo</span>
            </div>
            <ul className="mt-6 space-y-3 text-[15px] text-white/90 flex-1">
              {[
                "Everything in Free",
                "Automatic rebooking, we work your callback list for you",
                "The tools that win repeat work",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-6" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-white/70">
              Locked for life. $59 standard after.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted">
            No card to start. Upgrade to Pro when you want the callbacks worked for you.
          </p>
          <div className="mt-5 flex justify-center">
            <Link to="/pro/signup" className="w-full sm:w-auto">
              <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
                Claim your profile
              </Btn>
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className={`${CONTAINER} border-t border-line py-20 text-center`}>
        <Link to="/pro/signup" className="inline-block w-full sm:w-auto">
          <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
            Claim your profile
          </Btn>
        </Link>
      </section>
    </MarketingShell>
  );
}
