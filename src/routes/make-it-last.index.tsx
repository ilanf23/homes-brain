import { createFileRoute, Link } from "@tanstack/react-router";
import { InteractiveHouse } from "@/components/interactive-house";
import {
  Flame,
  Wind,
  Home as HomeIcon,
  Shirt,
  Utensils,
  Droplets,
  Droplet,
  Refrigerator,
  Waves,
  Zap,
  Thermometer,
  ArrowDownToLine,
  Trash2,
  Wrench,
  Bath,
  ChefHat,
  Microwave,
  WashingMachine,
  PlugZap,
  Power,
  CloudRain,
  DoorOpen,
  PanelsTopLeft,
  Sprout,
  Bug,
  Plus,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { Btn, Card, Eyebrow, SectionHead } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";

export const Route = createFileRoute("/make-it-last/")({
  head: () =>
    marketingHead({
      title: "Make It Last, how to make your home last longer",
      description:
        "Everything in your home has two lifespans, the neglected one and the maintained one. See how many years you're leaving on the table, backed by real maintenance data.",
      path: "/make-it-last",
      geo: true,
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

type BrowseItem = { slug: string; label: string; Icon: LucideIcon };
type BrowseGroup = { title: string; items: BrowseItem[] };

const BROWSE_GROUPS: BrowseGroup[] = [
  {
    title: "Cooling and heating",
    items: [
      { slug: "central-ac", label: "Central AC", Icon: Wind },
      { slug: "heat-pump", label: "Heat pump", Icon: Thermometer },
      { slug: "furnace", label: "Furnace", Icon: Flame },
    ],
  },
  {
    title: "Water heating",
    items: [
      { slug: "water-heater", label: "Water heater", Icon: Flame },
      { slug: "tankless-water-heater", label: "Tankless water heater", Icon: Zap },
    ],
  },
  {
    title: "Plumbing and water",
    items: [
      { slug: "water-softener", label: "Water softener", Icon: Droplets },
      { slug: "well-pump", label: "Well pump", Icon: Droplet },
      { slug: "sump-pump", label: "Sump pump", Icon: ArrowDownToLine },
      { slug: "garbage-disposal", label: "Garbage disposal", Icon: Trash2 },
      { slug: "faucets", label: "Faucets and fixtures", Icon: Wrench },
      { slug: "toilet", label: "Toilet", Icon: Bath },
    ],
  },
  {
    title: "Kitchen and laundry",
    items: [
      { slug: "refrigerator", label: "Refrigerator", Icon: Refrigerator },
      { slug: "dishwasher", label: "Dishwasher", Icon: Utensils },
      { slug: "range-oven", label: "Range or oven", Icon: ChefHat },
      { slug: "microwave", label: "Microwave", Icon: Microwave },
      { slug: "washer", label: "Washing machine", Icon: WashingMachine },
      { slug: "dryer", label: "Dryer", Icon: Shirt },
    ],
  },
  {
    title: "Electrical",
    items: [
      { slug: "electrical-panel", label: "Electrical panel", Icon: PlugZap },
      { slug: "standby-generator", label: "Standby generator", Icon: Power },
    ],
  },
  {
    title: "Structure and exterior",
    items: [
      { slug: "roof", label: "Roof", Icon: HomeIcon },
      { slug: "gutters", label: "Gutters", Icon: CloudRain },
      { slug: "garage-door", label: "Garage door", Icon: DoorOpen },
      { slug: "windows", label: "Windows", Icon: PanelsTopLeft },
    ],
  },
  {
    title: "Outdoor",
    items: [
      { slug: "pool-equipment", label: "Pool equipment", Icon: Waves },
      { slug: "irrigation", label: "Irrigation and sprinklers", Icon: Sprout },
      { slug: "pest-termite", label: "Pest and termite protection", Icon: Bug },
    ],
  },
];

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
          <div className="mt-10 space-y-12">
            {BROWSE_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-coraldark mb-4">
                  {group.title}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {group.items.map(({ slug, label, Icon }) => (
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
            ))}

            {/* Catch-all card */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-coraldark mb-4">
                Do not see yours?
              </h3>
              <a
                href="mailto:hello@homesbrain.com?subject=Make%20It%20Last%20guide%20request"
                className="group block"
              >
                <Card lift className="flex flex-col sm:flex-row items-center gap-5 py-8 px-6 text-center sm:text-left">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-coralbg text-coraldark shrink-0 group-hover:scale-105 transition-transform">
                    <Plus size={22} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-ink">
                      More guides are on the way
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Tell us what to cover next and we will build it. Every founding pro and homeowner shapes the list.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-coraldark group-hover:text-coral transition-colors">
                    <Mail size={16} />
                    Suggest a guide
                  </div>
                </Card>
              </a>
            </div>
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
