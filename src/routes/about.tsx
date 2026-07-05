import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow, Pill, SectionHead } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead } from "@/components/marketing";
import { LogoMark } from "@/components/svg";

export const Route = createFileRoute("/about")({
  head: () =>
    marketingHead({
      title: "About HomesBrain.",
      description:
        "Every home remembers. We're building the verified, owned, portable record of the home, written by the pros who do the work.",
      path: "/about",
    }),
  component: About,
});

const BELIEFS = [
  {
    title: "Verified",
    body: "A record is only worth what its source is worth. Ours is written by the pro who did the work, on the day they did it.",
  },
  {
    title: "Owned",
    body: "The record belongs to the homeowner: free, forever. Not rented from a platform, not locked to a contractor.",
  },
  {
    title: "Portable",
    body: "It moves with the home: across pros, across trades, and to the next owner when the house sells.",
  },
];

function About() {
  return (
    <MarketingShell mobileCta={{ label: "Start free", to: "/start", variant: "indigo" }}>
      {/* Mission */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-14 text-center">
        <div className="anim-fade-up flex justify-center">
          <LogoMark size={48} />
        </div>
        <h1 className="anim-fade-up d-1 mt-6 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Every home remembers.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted">
          Your car has a Carfax. Your health has a chart. Your home, the biggest thing most people
          ever own, has a junk drawer. We're fixing that.
        </p>
      </section>

      {/* Origin */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-3xl px-5">
          <Eyebrow accent="indigo">Where it started</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight">The missing-record wall</h2>
          <div className="mt-5 space-y-4 text-muted">
            <p>
              HomesBrain started the way most homeowners meet the problem: a system failed, and the
              paper trail didn't exist. What model? When was it installed? Was it under warranty?
              Who put it in? Nobody knew, not because nobody cared, but because nobody's job was to
              remember.
            </p>
            <p>
              The insight came from the other side of the visit: the pro standing in that basement
              already knows every answer. They just have nowhere to put it that survives. So we
              built the thirty-second habit that turns a pro's workday into a home's permanent
              memory, and gives the pro their customer back for life.
            </p>
          </div>
        </div>
      </section>

      {/* Beliefs */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="What we believe"
            title="Three words we won't compromise on"
          />
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {BELIEFS.map((b, i) => (
              <Card key={b.title} className={`anim-fade-up d-${i + 1}`}>
                <Pill accent="indigo">{b.title}</Pill>
                <p className="mt-4 text-sm text-muted">{b.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-3xl px-5">
          <Eyebrow accent="indigo">Where it goes</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight">
            First the record. Then the rest.
          </h2>
          <div className="mt-5 space-y-4 text-muted">
            <p>
              We're deliberately unglamorous about sequencing. Step one is to own the record: make
              it effortless for pros to write and impossible for homeowners to lose. That alone
              saves people real money: warranties honored, recalls caught, rebooks kept.
            </p>
            <p>
              Once a home has a memory, it can start being smart about itself: what needs service,
              what a repair should cost, what to ask the next pro. That's the long road, and it only
              works if the record underneath is verified, owned, and portable. So that's what we're
              building first.
            </p>
          </div>
        </div>
      </section>

      {/* Team placeholder */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5">
          <SectionHead accent="indigo" eyebrow="Team" title="Small team, long view" />
          <Card className="mt-10 text-center py-10 border-dashed">
            <p className="text-muted max-w-md mx-auto">
              Team bios land here soon. Until then: we're builders who've spent time on both sides
              of the service visit.
            </p>
            <p className="mt-3 text-sm text-muted">
              Want to talk?{" "}
              <a
                href="mailto:hello@homesbrain.com"
                className="font-semibold text-indigo hover:underline"
              >
                hello@homesbrain.com
              </a>
            </p>
          </Card>
        </div>
      </section>

      <CtaBand
        eyebrow="Join in"
        accent="indigo"
        title="Help a home remember."
        sub="Pros start the record. Homeowners keep it. Either way, it starts with one job."
      >
        <Link to="/pro/signup">
          <Btn variant="indigo" size="lg">
            I'm a pro, start free
          </Btn>
        </Link>
        <Link to="/login">
          <Btn variant="indigo" size="lg">
            I own a home
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}
