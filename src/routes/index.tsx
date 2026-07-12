import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";

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
      {/* Hero: pro first */}
      <section className="mx-auto max-w-3xl px-5 pt-12 sm:pt-16 pb-14 text-center">
        <div className="eyebrow text-teal">For pros in St. Johns County</div>
        <h1 className={`${H_SANS} mt-4 text-4xl sm:text-6xl leading-[1.05]`}>
          Get more Google reviews.
          <br />
          <span className="text-teal">Automatically. Free.</span>
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-lg text-muted">
          Log a job in 30 seconds. We ask your customer for the review, then tell you when it
          is time to go back.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/pro/signup" className="w-full sm:w-auto">
            <Btn variant="teal" size="lg" className="w-full sm:w-auto min-h-12">
              Claim your profile
            </Btn>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          No card. No password. Replaces your $75 to $599 a month review tool.
        </p>

        {/* Proof card */}
        <div className="mt-12 mx-auto max-w-md rounded-[22px] border border-line bg-paper p-6 text-left shadow-[0_20px_50px_-30px_rgba(22,22,15,0.35)]">
          <Stars />
          <p className="mt-3 text-[16px] text-ink leading-snug">
            "Fast, honest, cleaned up after himself. Best plumber in Ponte Vedra."
          </p>
          <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-muted">
            <GoogleGlyph />
            New Google review, posted for you.
          </div>
        </div>

        {/* Callback chip */}
        <div className="mt-5 mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-teal/10 border border-teal/20 px-4 py-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-white font-extrabold">
            K
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-ink">Karen, water softener due</div>
            <div className="text-[12px] text-muted">Serviced 6 months ago</div>
          </div>
          <span className="rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-bold text-white">
            Call
          </span>
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
