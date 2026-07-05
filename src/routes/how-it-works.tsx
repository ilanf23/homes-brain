import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow, KV, Pill, SectionHead } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead } from "@/components/marketing";
import { ShieldCheck } from "@/components/svg";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    marketingHead({
      title: "How HomesBrain works — a home record that writes itself.",
      description:
        "A pro logs the job in 30 seconds. The homeowner gets a branded service record, claims it free, and owns it for life. One loop, everyone wins.",
      path: "/how-it-works",
    }),
  component: HowItWorks,
});

const STEPS = [
  {
    n: "01",
    accent: "teal" as const,
    pill: "The pro",
    title: "Log the job in 30 seconds",
    body: "Customer, equipment, what was done, next service date. Snap the nameplate, add a photo if you like. That's the whole job.",
  },
  {
    n: "02",
    accent: "indigo" as const,
    pill: "Automatic",
    title: "A branded record is sent",
    body: "The homeowner gets a clean, branded service record by text and email — with a recall check and a review link built in.",
  },
  {
    n: "03",
    accent: "coral" as const,
    pill: "The homeowner",
    title: "Claim, invite, rebook",
    body: "One tap to claim the home, free. Invite the other pros who work on it, and rebook the ones who already do.",
  },
];

const DIFFERENT = [
  {
    title: "Verified at the source",
    body: "Every entry comes from the pro who did the work, on the day they did it. Not memories, not a shoebox of receipts.",
  },
  {
    title: "Owned by the homeowner",
    body: "The record belongs to the home and the person who lives in it — free, forever, and it moves with the house when it sells.",
  },
  {
    title: "Portable across every pro",
    body: "One record, every trade. The plumber sees what the softener installer left behind. Nobody starts from zero.",
  },
];

function HowItWorks() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-16 pb-14 text-center">
        <div className="anim-fade-up">
          <Eyebrow accent="indigo">How it works</Eyebrow>
        </div>
        <h1 className="anim-fade-up d-1 mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          The job creates the record. The record keeps the customer.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-2xl mx-auto">
          One 30-second log starts a loop: the pro's work becomes the homeowner's record, and the
          record brings the pro back for the next visit.
        </p>
      </section>

      {/* The 3-step loop */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead accent="indigo" eyebrow="The loop" title="Three steps. Everyone wins." />
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <Card key={s.n} lift className={`anim-fade-up d-${i + 1}`}>
                <div className="flex items-center justify-between">
                  <Pill accent={s.accent}>{s.pill}</Pill>
                  <span className="font-mono text-xs tnum text-muted">{s.n}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight font-display">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
                <div className="mt-4 h-1 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full w-full rounded-full"
                    style={{ backgroundColor: `var(--${s.accent})` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Split panel: same job, two sides */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="One job, two wins"
            title="The same visit, from both sides"
            sub="A softener service in Austin. Here's what each side walks away with."
          />
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {/* Pro POV */}
            <Card className="border-t-4 border-t-teal">
              <Pill accent="teal">The pro's side</Pill>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                Aqua Works logs the job
              </h3>
              <div className="mt-4">
                <KV k="Time to log" v="28 seconds" />
                <KV k="Record sent" v="Text + email, branded" />
                <KV k="Review ask" v="Sent automatically" />
                <KV k="Next service" v="Mar 2027 — reminder set" />
              </div>
              <p className="mt-4 text-sm text-muted">
                The customer now carries Aqua Works in their pocket. When the resin needs checking
                in two years, the rebook comes back to them — not to a search result.
              </p>
            </Card>
            {/* Homeowner POV */}
            <Card className="border-t-4 border-t-coral">
              <Pill accent="coral">The homeowner's side</Pill>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
                Dana claims the record
              </h3>
              <div className="mt-4">
                <KV k="Effort" v="One tap, no login" />
                <KV k="On file" v="Make, model, serial, warranty" />
                <KV
                  k="Recall status"
                  v={
                    <span className="inline-flex items-center gap-1.5 text-teal font-semibold text-sm">
                      <ShieldCheck size={16} animate={false} /> No known recalls
                    </span>
                  }
                />
                <KV k="Cost" v="Free, forever" />
              </div>
              <p className="mt-4 text-sm text-muted">
                Dana never typed a thing. The home now remembers its own equipment — and every pro
                she invites deepens the record.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why it's different */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Why it's different"
            title="A record you can actually trust"
          />
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {DIFFERENT.map((d, i) => (
              <Card key={d.title} className={`anim-fade-up d-${i + 1}`}>
                <span className="w-9 h-9 rounded-xl bg-indigobg text-indigo flex items-center justify-center font-mono text-sm font-semibold tnum">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight font-display">
                  {d.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{d.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dual CTA band */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-6">
          <Card className="text-center py-10">
            <Pill accent="teal">For pros</Pill>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
              Never lose a customer again.
            </h3>
            <p className="mt-2 text-sm text-muted max-w-xs mx-auto">
              Log a job in 30 seconds. Free to start, no card.
            </p>
            <div className="mt-6">
              <Link to="/pro/signup">
                <Btn variant="teal" size="lg">
                  I'm a pro — start free
                </Btn>
              </Link>
            </div>
          </Card>
          <Card className="text-center py-10">
            <Pill accent="coral">For homeowners</Pill>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight font-display">
              Your home, finally remembered.
            </h3>
            <p className="mt-2 text-sm text-muted max-w-xs mx-auto">
              Free forever. It fills itself every time a pro does the work.
            </p>
            <div className="mt-6">
              <Link to="/for-homeowners">
                <Btn variant="coral" size="lg">
                  I own a home — see how
                </Btn>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <CtaBand
        eyebrow="Every home remembers"
        accent="indigo"
        title="Start the loop with one job."
        sub="It takes a pro 30 seconds to give a home its memory."
      >
        <Link to="/pro/signup">
          <Btn variant="teal" size="lg">
            Start free — no card
          </Btn>
        </Link>
        <Link to="/pricing">
          <Btn variant="secondary" size="lg">
            See pricing
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}
