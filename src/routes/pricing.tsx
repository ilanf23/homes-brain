import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Eyebrow, Pill, SectionHead } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead } from "@/components/marketing";

export const Route = createFileRoute("/pricing")({
  head: () =>
    marketingHead({
      title: "HomesBrain pricing — free to start.",
      description:
        "Free: 30-second job logging, branded records, automatic Google reviews, and getting paid. Pro ($99/mo): reminders, one-tap rebooking, and lead lists. One saved rebook covers the year.",
      path: "/pricing",
    }),
  component: Pricing,
});

const FREE_FEATURES = [
  "30-second job logging",
  "Branded service record, sent for you",
  "Get paid (tap-to-pay)",
  "Automatic Google reviews",
  "Appliance summary + recall check",
  "Customer list",
  "QuickBooks / Jobber sync",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Automated service reminders",
  "One-tap rebooking",
  "Recall-driven lead lists",
  "New-owner leads at resale",
  "Analytics",
  "Lower payment rate",
];

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan is genuinely free — sign up, log jobs, send records, and collect reviews without entering a card.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is month-to-month. Downgrade whenever you like and keep everything on the Free plan — your records and customers stay yours.",
  },
  {
    q: "I already pay for a review tool. How do I switch?",
    a: "There's nothing to migrate — HomesBrain sends the review ask with every record automatically. Most pros run both for a month, then cancel the old tool.",
  },
  {
    q: "What does it cost my customers?",
    a: "Nothing, ever. Homeowners claim and keep their home record free, forever. That's what makes them happy to receive it.",
  },
];

function CheckItem({ children, muted = false }: { children: string; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      >
        <circle cx="8" cy="8" r="8" fill={muted ? "var(--soft)" : "var(--tealbg)"} />
        <path
          d="m4.8 8.3 2.1 2.1 4.3-4.6"
          fill="none"
          stroke={muted ? "var(--muted)" : "var(--teal)"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-sm text-ink">{children}</span>
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="pressable group w-full min-h-12 flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-ink group-hover:text-teal transition-colors duration-150">
          {q}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        >
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      {open && <p className="anim-fade-in pb-5 pr-8 text-sm text-muted">{a}</p>}
    </div>
  );
}

function Pricing() {
  return (
    <MarketingShell
      mobileCta={{ label: "Start free — no card", to: "/pro/signup", variant: "teal" }}
    >
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-12 text-center">
        <div className="anim-fade-up">
          <Eyebrow accent="teal">Pricing</Eyebrow>
        </div>
        <h1 className="anim-fade-up d-1 mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Free to start. Pro when it pays for itself.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted">
          One saved rebook covers the year.
        </p>
      </section>

      {/* Plans */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-5 grid md:grid-cols-2 gap-5 items-start">
          <Card className="anim-fade-up d-1">
            <div className="flex items-center justify-between">
              <Pill accent="ink">Free</Pill>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold font-display tracking-tight text-ink">
                $0
              </span>
              <span className="text-sm text-muted">forever</span>
            </div>
            <p className="mt-2 text-sm text-muted">Everything you need to stop losing customers.</p>
            <ul className="mt-5">
              {FREE_FEATURES.map((f) => (
                <CheckItem key={f} muted>
                  {f}
                </CheckItem>
              ))}
            </ul>
            <div className="mt-6">
              <Link to="/pro/signup" className="block">
                <Btn variant="secondary" size="lg" className="w-full">
                  Start free
                </Btn>
              </Link>
            </div>
          </Card>

          <Card className="anim-fade-up d-2 border-teal/50 shadow-[0_24px_60px_-30px_rgba(15,110,86,0.35)]">
            <div className="flex items-center justify-between">
              <Pill accent="teal">Pro</Pill>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal">
                Best for growing shops
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold font-display tracking-tight text-ink">
                $99
              </span>
              <span className="text-sm text-muted">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              The rebook machine: reminders, leads, and analytics.
            </p>
            <ul className="mt-5">
              {PRO_FEATURES.map((f) => (
                <CheckItem key={f}>{f}</CheckItem>
              ))}
            </ul>
            <div className="mt-6">
              <Link to="/pro/signup" className="block">
                <Btn variant="teal" size="lg" className="w-full">
                  Start free, upgrade anytime
                </Btn>
              </Link>
            </div>
          </Card>
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Homeowners never pay.{" "}
          <span className="font-semibold text-ink">Free for homeowners, forever.</span>
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-soft border-t border-line py-20">
        <div className="mx-auto max-w-2xl px-5">
          <SectionHead accent="teal" eyebrow="Questions" title="The short answers" />
          <Card className="mt-10 px-6 py-2">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </Card>
        </div>
      </section>

      <CtaBand
        eyebrow="Pricing"
        accent="teal"
        title="Start free, upgrade anytime."
        sub="No card, no contract. Your first record goes out today."
      >
        <Link to="/pro/signup">
          <Btn variant="teal" size="lg">
            Start free — no card
          </Btn>
        </Link>
        <Link to="/for-pros">
          <Btn variant="secondary" size="lg">
            Why pros switch
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}
