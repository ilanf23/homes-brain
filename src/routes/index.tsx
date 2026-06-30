import { createFileRoute, Link } from "@tanstack/react-router";
import { Eyebrow, Pill, Card, Btn, KV } from "@/lib/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomesBrain — A Carfax for homes that writes itself" },
      { name: "description", content: "Log a 30-second job. Send a branded service record. Homeowners claim it free and own it for life." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-indigo" />
            <span className="font-extrabold tracking-tight text-ink">HomesBrain</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/pro/signup"><Btn variant="teal" size="sm">For pros</Btn></Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 text-center">
        <Eyebrow accent="indigo">HomesBrain</Eyebrow>
        <h1 className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">
          A Carfax for homes <br className="hidden sm:block" />
          that writes itself.
        </h1>
        <p className="mt-5 text-lg text-muted max-w-2xl mx-auto">
          Home-service pros log a job in 30 seconds. We send a branded service record to the homeowner —
          they claim it free and own their home's history for life.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/pro/signup"><Btn variant="teal" size="lg">Start free — for pros</Btn></Link>
          <a href="#how"><Btn variant="secondary" size="lg">How it works</Btn></a>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-soft py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow accent="indigo">The core loop</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">Three steps. Everyone wins.</h2>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <Card>
              <Pill accent="teal">For pros</Pill>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight">Log a job in 30 seconds</h3>
              <p className="mt-2 text-sm text-muted">
                Customer, equipment, what you did, next service date. Photo optional. Done.
              </p>
            </Card>
            <Card>
              <Pill accent="indigo">Automatic</Pill>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight">Branded record is sent</h3>
              <p className="mt-2 text-sm text-muted">
                Your logo, your work, a recall check, and a Google review ask. Sent by text and email.
              </p>
            </Card>
            <Card>
              <Pill accent="coral">For homeowners</Pill>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight">Claim your home, free</h3>
              <p className="mt-2 text-sm text-muted">
                Own the full history. Add the other pros who work on your home and keep one source of truth.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Sample record preview */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Eyebrow accent="coral">What the homeowner sees</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              A record they're proud to keep.
            </h2>
            <p className="mt-3 text-muted">
              Compliant, calm, premium. Looks like a fintech statement, not a contractor invoice.
              The homeowner taps once to claim — and your business comes with them.
            </p>
          </div>
          <Card className="shadow-[0_24px_60px_-30px_rgba(20,20,15,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tealbg text-teal flex items-center justify-center font-extrabold">AW</div>
              <div>
                <div className="font-extrabold text-ink">Aqua Works</div>
                <div className="text-xs text-muted">Water treatment · Austin, TX</div>
              </div>
            </div>
            <h3 className="mt-5 text-xl font-extrabold tracking-tight">Service record</h3>
            <div className="mt-3">
              <KV k="Equipment" v="Whole-house softener" />
              <KV k="Make / Model" v="EcoWater · EVR3700R30" />
              <KV k="Warranty until" v="Mar 2030" />
              <KV k="Recall status" v={<Pill accent="teal">No known recalls</Pill>} />
              <KV k="Work done" v="Annual service, resin check" />
              <KV k="Next service" v="Mar 2027" />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Btn variant="coral" size="lg">Claim your home, free</Btn>
              <Btn variant="secondary">Leave Aqua Works a review</Btn>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-8 flex items-center justify-between text-sm text-muted">
          <div>© HomesBrain</div>
          <div>v0 demo</div>
        </div>
      </footer>
    </div>
  );
}
