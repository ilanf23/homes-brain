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

      {/* Your pipeline */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="text-center">
          <div className="eyebrow text-teal">Your pipeline</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-[34px] leading-[1.15]`}>
            Callbacks, with the names attached.
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          <CallbackRow initial="K" name="Karen" need="softener due" area="Ponte Vedra" />
          <CallbackRow initial="M" name="Mike" need="AC drain line due" area="Nocatee" />
          <CallbackRow initial="R" name="Rosa" need="water heater flush" area="St. Augustine" />
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

      {/* Charter price */}
      <section className={`${CONTAINER} border-t border-line py-16`}>
        <div className="rounded-[24px] bg-indigo p-7 sm:p-9 text-white text-center">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Founding price, first 1,000 pros
          </span>
          <div className="mt-5 font-sans text-6xl font-extrabold tracking-tight tnum">
            $19<span className="text-xl font-medium text-white/70">/mo</span>
          </div>
          <p className="mt-4 mx-auto max-w-md text-[15px] text-white/85">
            Locked for life. $59 standard after. The reviews, record and profile stay free.
          </p>
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
