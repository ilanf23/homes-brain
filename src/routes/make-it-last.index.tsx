import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Wind,
  Home as HomeIcon,
  Shirt,
  Utensils,
  Droplets,
  Refrigerator,
  Waves,
} from "lucide-react";
import { Btn, Card, Eyebrow, Pill, SectionHead } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";

export const Route = createFileRoute("/make-it-last/")({
  head: () =>
    marketingHead({
      title: "Make It Last, how to make your home last longer",
      description:
        "Everything in your home has two lifespans, the neglected one and the maintained one. See how many years you're leaving on the table, backed by real maintenance data.",
      path: "/make-it-last",
    }),
  component: MakeItLast,
});

type Item = {
  slug: string;
  label: string;
  neglected: number;
  maintained: number;
  task: string;
};

const ITEMS: Item[] = [
  {
    slug: "water-heater",
    label: "Water heater",
    neglected: 10,
    maintained: 15,
    task: "Flush the tank yearly and replace the anode rod every 3 to 5 years. Florida hard water makes this matter more.",
  },
  {
    slug: "central-ac",
    label: "Central AC",
    neglected: 12,
    maintained: 18,
    task: "Service twice a year, keep the coils clean, change filters. Florida heat and humidity are hard on it.",
  },
  {
    slug: "roof",
    label: "Roof",
    neglected: 15,
    maintained: 25,
    task: "Inspect annually and after storms, and keep attic ventilation good.",
  },
  {
    slug: "dryer",
    label: "Dryer",
    neglected: 8,
    maintained: 13,
    task: "Clean the full vent line yearly, not just the lint trap. It is also a fire risk.",
  },
  {
    slug: "dishwasher",
    label: "Dishwasher",
    neglected: 9,
    maintained: 12,
    task: "Clean the filter monthly and run a descaler in hard water.",
  },
  {
    slug: "water-softener",
    label: "Water softener",
    neglected: 10,
    maintained: 15,
    task: "Keep the salt topped up and service the resin bed.",
  },
];

const BROWSE = [
  { slug: "water-heater", label: "Water heater", Icon: Flame },
  { slug: "central-ac", label: "Central AC", Icon: Wind },
  { slug: "roof", label: "Roof", Icon: HomeIcon },
  { slug: "dryer", label: "Dryer", Icon: Shirt },
  { slug: "dishwasher", label: "Dishwasher", Icon: Utensils },
  { slug: "water-softener", label: "Water softener", Icon: Droplets },
  { slug: "refrigerator", label: "Refrigerator", Icon: Refrigerator },
  { slug: "pool-equipment", label: "Pool equipment", Icon: Waves },
] as const;

function MakeItLast() {
  const [selected, setSelected] = useState<Item>(ITEMS[0]);
  const gap = selected.maintained - selected.neglected;
  const maxYears = Math.max(...ITEMS.map((i) => i.maintained));
  const neglectedPct = (selected.neglected / maxYears) * 100;
  const maintainedPct = (selected.maintained / maxYears) * 100;

  return (
    <MarketingShell mobileCta={{ label: "Start free record", to: "/home/signup", variant: "coral" }}>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-14 text-center">
        <Eyebrow accent="coral">Make it last</Eyebrow>
        <h1 className="mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Everything in your home has two lifespans.
          <span className="block text-coral">We show you the longer one.</span>
        </h1>
        <p className="mt-6 text-lg text-muted">
          Pick something in your home and see how many years you're leaving on the table, backed by
          real maintenance data.
        </p>
      </section>

      {/* Interactive picker */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-5">
          <div
            role="tablist"
            aria-label="Pick something in your home"
            className="flex flex-wrap justify-center gap-2"
          >
            {ITEMS.map((it) => {
              const active = it.slug === selected.slug;
              return (
                <button
                  key={it.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(it)}
                  className={`pressable rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                    active
                      ? "bg-coral text-(--on-accent) border-coral"
                      : "bg-paper text-ink border-line hover:border-coral/40"
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>

          <Card className="mt-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{selected.label}</h2>
              <Pill accent="coral">+{gap} years</Pill>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted font-semibold">Left alone</span>
                  <span className="tnum font-semibold text-ink">{selected.neglected} years</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-soft overflow-hidden">
                  <div
                    className="h-full rounded-full bg-line transition-all duration-500"
                    style={{ width: `${neglectedPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-coraldark font-semibold">Maintained</span>
                  <span className="tnum font-semibold text-coraldark">
                    {selected.maintained} years
                  </span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-coralbg overflow-hidden">
                  <div
                    className="h-full rounded-full bg-coral transition-all duration-500"
                    style={{ width: `${maintainedPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-soft p-4">
              <div className="eyebrow text-coral">The one thing that matters most</div>
              <p className="mt-2 text-sm text-ink">{selected.task}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/home/pros">
                <Btn variant="coral">Book a pro</Btn>
              </Link>
              <Link to="/home/signup">
                <Btn variant="ghost">Add to my home record</Btn>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Browse by system */}
      <section className="border-t border-line bg-soft py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="coral"
            eyebrow="Browse by system"
            title="Pick a system to see its maintained lifespan"
          />
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {BROWSE.map(({ slug, label, Icon }) => (
              <Link
                key={slug}
                to="/make-it-last/$slug"
                params={{ slug }}
                className="group"
              >
                <Card lift className="flex flex-col items-center text-center py-8 h-full">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-coralbg text-coraldark group-hover:scale-105 transition-transform">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-ink">{label}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Data strip */}
      <section className="bg-soft border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center">
          <p className="text-base text-muted">
            Our numbers come from how homes and equipment actually age, and get sharper as more
            Florida homes join.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <Eyebrow accent="coral">Start free</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">
            Every home remembers.
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">
            Start your free record and get maintenance reminders for your real appliances.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/home/signup">
              <Btn variant="coral" size="lg">
                Start your free record
              </Btn>
            </Link>
          </div>
          <p className="mt-10 text-xs text-muted max-w-2xl mx-auto">
            Lifespans and maintenance guidance are general estimates from cited public sources and
            vary by product, use, and climate. Always follow your manufacturer's instructions.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
