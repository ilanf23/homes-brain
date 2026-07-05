import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow, KV, SectionHead } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead } from "@/components/marketing";
import { ShieldCheck } from "@/components/svg";

/* Plain-English trust explainer, NOT the legal privacy policy (that's /privacy). */

export const Route = createFileRoute("/security")({
  head: () =>
    marketingHead({
      title: "Security & privacy at HomesBrain.",
      description:
        "What data HomesBrain holds, who can see what, and how it's protected, in plain English. Your record is yours; pros see only their own customers; Stripe handles payments.",
      path: "/security",
    }),
  component: Security,
});

const WHO_SEES = [
  {
    who: "You (homeowner)",
    sees: "Everything about your claimed home: equipment, full service history, every pro who worked on it.",
  },
  {
    who: "Your pros",
    sees: "Only the customers and jobs they created themselves. Your plumber never sees your HVAC pro's records.",
  },
  {
    who: "Anyone with a record link",
    sees: "One service record: the one that was sent. Not your whole home, not your contact details.",
  },
  {
    who: "HomesBrain staff",
    sees: "Access is limited, logged, and only for support you ask for or operations that keep the service running.",
  },
];

function Security() {
  return (
    <MarketingShell mobileCta={null}>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-14 text-center">
        <div className="anim-fade-up flex justify-center text-indigo">
          <ShieldCheck size={44} />
        </div>
        <h1 className="anim-fade-up d-1 mt-5 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Your record. Your rules.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted">
          The plain-English version of how HomesBrain handles your data. The full legal document
          lives in our{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      {/* What we hold */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-4xl px-5">
          <SectionHead accent="indigo" eyebrow="What we hold" title="Only what the record needs" />
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-lg font-semibold tracking-tight font-display">About the home</h3>
              <p className="mt-2 text-sm text-muted">
                Address, equipment (make, model, serial, warranty), service history, and photos a
                pro attaches to a job.
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold tracking-tight font-display">About people</h3>
              <p className="mt-2 text-sm text-muted">
                The contact details used to send records and sign in (phone and email), plus a
                pro's business profile. No passwords exist to steal: sign-in is by one-time code.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Who can see what */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Who sees what"
            title="Access follows ownership"
            sub="The database enforces this row by row. It's not an honor system."
          />
          <Card className="mt-10">
            {WHO_SEES.map((w) => (
              <KV
                key={w.who}
                k={w.who}
                v={
                  <span className="font-sans font-medium text-sm text-ink/85 text-right block max-w-[24rem]">
                    {w.sees}
                  </span>
                }
                mono={false}
              />
            ))}
          </Card>
        </div>
      </section>

      {/* How it's protected + payments + portability */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead accent="indigo" eyebrow="Protection" title="The boring, important parts" />
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            <Card>
              <h3 className="text-lg font-semibold tracking-tight font-display">Locked down</h3>
              <p className="mt-2 text-sm text-muted">
                Encrypted in transit and at rest, with row-level security in the database deciding
                who can read each record. Sign-in codes expire fast and work once.
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold tracking-tight font-display">
                Payments by Stripe
              </h3>
              <p className="mt-2 text-sm text-muted">
                Cards are handled end-to-end by Stripe, the payments provider behind millions of
                businesses. HomesBrain never stores card numbers. We never even see them.
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold tracking-tight font-display">
                Portable, always
              </h3>
              <p className="mt-2 text-sm text-muted">
                Your home's history is exportable whenever you want it. Leaving should be as easy as
                staying. That's what "owned by you" means.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Trust"
        accent="indigo"
        title="Questions we didn't answer?"
        sub="Read the full policy, or just ask a human."
      >
        <Link to="/privacy">
          <Btn variant="indigo" size="lg">
            Read the Privacy Policy
          </Btn>
        </Link>
        <a href="mailto:privacy@homesbrain.com">
          <Btn variant="secondary" size="lg">
            Email privacy@homesbrain.com
          </Btn>
        </a>
      </CtaBand>
    </MarketingShell>
  );
}
