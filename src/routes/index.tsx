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

function Stars() {
  return (
    <div className="flex items-center gap-0.5" aria-label="Five stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 1.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15.3l-5.3 2.7 1-5.9L1.4 7.9l5.9-.9L10 1.7z"
            fill="#f5b400"
          />
        </svg>
      ))}
    </div>
  );
}

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

function Landing() {
  return (
    <MarketingShell mobileCta={{ label: "Claim your profile", to: "/pro/signup", variant: "teal" }}>
      {/* Hero: callback led */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:pt-16 pb-14">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <div className="eyebrow text-teal">For pros in St. Johns County</div>
            <h1 className={`${H_SANS} mt-4 text-4xl sm:text-6xl leading-[1.05]`}>
              Never lose a customer
              <br />
              <span className="text-teal">you already earned.</span>
            </h1>
            <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg text-muted">
              HomesBrain tells you when each past customer is due and hands you the name to call.
              Your callback list builds itself.
            </p>
            <div className="mt-8 flex justify-center lg:justify-start">
              <Link to="/pro/signup" className="w-full sm:w-auto">
                <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
                  Claim your profile
                </Btn>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              No card. No password. Free to start.
            </p>
          </div>

          {/* Callback pipeline phone */}
          <div className="order-first lg:order-last">
            <PipelinePhone />
          </div>
        </div>

        {/* Day-one proof: reviews */}
        <div className="mt-14 mx-auto max-w-md text-center">
          <div className="eyebrow text-teal">And it pays you on day one</div>
        </div>
        <div className="mt-4 mx-auto max-w-md rounded-[22px] border border-line bg-paper p-6 shadow-[0_20px_50px_-30px_rgba(22,22,15,0.35)]">
          <Stars />
          <p className="mt-3 text-[16px] text-ink leading-snug">
            "Fast, honest, cleaned up after himself. Best plumber in Ponte Vedra."
          </p>
          <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-muted">
            <GoogleGlyph />
            New Google review, posted for you.
          </div>
        </div>
        <p className="mt-4 mx-auto max-w-md text-center text-sm text-muted">
          Every job asks your customer for the Google review, automatically. Free.
        </p>
      </section>


      {/* HomesBrain AI: voice in, record out */}
      <section className="border-t border-line py-16 sm:py-20">
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
          <div className="eyebrow text-teal">The whole idea</div>
          <h2 className={`${H_SANS} mt-4 text-3xl sm:text-4xl leading-[1.1]`}>
            Never forgotten. Never forget.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 text-left">
            <div className="rounded-[22px] border border-line bg-paper p-7">
              <h3 className={`${H_SANS} text-xl`}>The review</h3>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                Every job turns into a Google review, on its own. The world remembers you.
              </p>
            </div>
            <div className="rounded-[22px] border border-line bg-paper p-7">
              <h3 className={`${H_SANS} text-xl`}>The nudge</h3>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                We tell you when each customer is due. Your callback list builds itself and
                hands you the name.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Homeowner nod band */}
      <section className="border-t border-line py-10">
        <div className="mx-auto max-w-4xl px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-coralbg border border-coral/20 px-5 py-4">
            <div className="eyebrow text-coraldark">Own a home?</div>
            <Link
              to="/home/signup"
              className="text-[15px] font-bold text-coraldark hover:text-coral transition-colors"
            >
              Your home already has a record. See it. →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
