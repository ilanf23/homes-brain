import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Mail, Search, Sparkles, ArrowDown } from "lucide-react";
import { InteractiveHouse } from "@/components/interactive-house";
import { Btn, Card, Eyebrow, SectionHead } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";
import {
  CATEGORIES,
  allBrowseEntries,
  useCountUp,
  type BrowseEntry,
  type CategoryId,
} from "@/lib/make-it-last-visuals";

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

type FilterId = "all" | CategoryId;

function PayoffBadge({ entry }: { entry: BrowseEntry }) {
  const p = entry.payoff;
  if (p.kind === "gain") {
    return (
      <div className="mt-4 flex items-baseline gap-1">
        <span className="tnum text-3xl sm:text-4xl font-bold text-coral leading-none">
          +{p.years}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-coraldark">
          years
        </span>
      </div>
    );
  }
  return (
    <div className="mt-4 inline-flex items-center rounded-full bg-coralbg text-coraldark px-3 py-1 text-xs font-bold uppercase tracking-wider">
      {p.label}
    </div>
  );
}

function BrowseCard({ entry }: { entry: BrowseEntry }) {
  const { slug, label, Icon, category } = entry;
  return (
    <Link to="/make-it-last/$slug" params={{ slug }} className="group">
      <Card
        lift
        className="flex flex-col items-start text-left p-6 h-full transition-transform"
      >
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full ${category.bg} ${category.fg} group-hover:scale-105 transition-transform`}
        >
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <div className="mt-4 text-base font-semibold text-ink leading-snug">{label}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {category.label}
        </div>
        <PayoffBadge entry={entry} />
      </Card>
    </Link>
  );
}

function MakeItLast() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");

  const allEntries = useMemo(() => allBrowseEntries(), []);

  // Total years of extra life across every two-lifespans guide. Derived so it
  // stays honest as guides are added or numbers change in the source data.
  const totalYearsGained = useMemo(
    () =>
      allEntries.reduce(
        (sum, e) => (e.payoff.kind === "gain" ? sum + e.payoff.years : sum),
        0,
      ),
    [allEntries],
  );
  const heroCount = useCountUp(totalYearsGained, "hero-total", 1400);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (filter !== "all" && e.category.id !== filter) return false;
      if (q && !e.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allEntries, filter, query]);

  function scrollToBrowse(e: React.MouseEvent) {
    e.preventDefault();
    document
      .getElementById("browse")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <MarketingShell mobileCta={null}>
      {/* Hero: one big honest number, calm emotional hook, then the house. */}
      <section className="mx-auto max-w-3xl px-5 pt-10 sm:pt-16 pb-6 text-center">
        <Eyebrow accent="coral">Make it last</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-6xl sm:leading-[1.06] tracking-tight text-ink">
          Everything in your home has two lifespans.
          <span className="block text-coral">We show you the longer one.</span>
        </h1>
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-muted">
          Your home is aging faster than it has to.
        </p>

        {/* Big number moment */}
        <div className="mt-8 sm:mt-10">
          <div
            className="relative mx-auto max-w-xl rounded-3xl bg-coralbg border border-coral/25 px-5 py-8 sm:px-8 sm:py-10 overflow-hidden"
            aria-label={`${totalYearsGained} plus years of extra life`}
          >
            {/* subtle radial coral wash, decorative only */}
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(80% 60% at 50% 0%, rgba(194,70,31,0.14), transparent 70%)",
              }}
              aria-hidden="true"
            />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-coraldark">
                <Sparkles size={13} /> Hidden in your home
              </div>
              <div className="mt-3 flex items-baseline justify-center gap-2 sm:gap-3">
                <span className="tnum text-6xl sm:text-8xl font-bold text-coral leading-none tabular-nums">
                  {heroCount}
                </span>
                <span className="text-3xl sm:text-5xl font-bold text-coral leading-none">
                  +
                </span>
                <span className="text-lg sm:text-2xl font-semibold text-coraldark">
                  years
                </span>
              </div>
              <p className="mt-4 text-base sm:text-lg text-ink leading-snug">
                of extra life hiding in your home right now.
              </p>
              <p className="mt-2 text-xs sm:text-sm text-muted">
                Add up every system below. That is what maintenance buys you back.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 hidden sm:flex items-center justify-center gap-2 text-xs text-muted">
          <ArrowDown size={14} />
          <span>Tap the house to see where the years are hiding.</span>
        </div>
      </section>

      {/* Interactive house */}
      <section className="pb-14 sm:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <InteractiveHouse />
          <div className="mt-8 hidden sm:flex flex-wrap justify-center gap-3">
            <Link to="/home/pros">
              <Btn variant="coral">Book a pro</Btn>
            </Link>
            <a href="#browse" onClick={scrollToBrowse}>
              <Btn variant="ghost">Browse all systems</Btn>
            </a>
          </div>
        </div>
      </section>


      {/* Browse: filterable, stat-forward grid */}
      <section id="browse" className="border-t border-line bg-soft py-20 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="coral"
            eyebrow="Browse the wins"
            title="Spot the years you can add"
          />

          {/* Filter chips + search */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  active={filter === c.id}
                  onClick={() => setFilter(c.id)}
                >
                  {c.label}
                </FilterChip>
              ))}
            </div>
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find your appliance"
                aria-label="Find your appliance"
                className="w-full rounded-full border border-line bg-white pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral transition"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((entry) => (
              <BrowseCard key={entry.slug} entry={entry} />
            ))}

            {/* Catch-all card, always shown at the end */}
            <a
              href="mailto:hello@homesbrain.com?subject=Make%20It%20Last%20guide%20request"
              className="group"
            >
              <Card
                lift
                className="flex flex-col items-start text-left p-6 h-full border-dashed"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-coralbg text-coraldark group-hover:scale-105 transition-transform">
                  <Plus size={22} strokeWidth={1.75} />
                </div>
                <div className="mt-4 text-base font-semibold text-ink leading-snug">
                  Do not see yours?
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  More coming
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-coraldark">
                  <Mail size={13} /> Suggest a guide
                </div>
              </Card>
            </a>
          </div>

          {filtered.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
              <p className="text-sm text-muted">
                No matches. Try a different filter or check the spelling.
              </p>
            </div>
          )}
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

      {/* Closing CTA. Extra bottom padding on mobile so the sticky bar never covers it. */}
      <section className="border-t border-line bg-soft pb-28 min-[880px]:pb-0">
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

      {/* Sticky bottom action bar, mobile only. Primary always one thumb away. */}
      <div
        className="min-[880px]:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-background/95 backdrop-blur-md px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <Link to="/home/signup" className="block">
          <Btn variant="coral" size="lg" className="w-full">
            Start your free record
          </Btn>
        </Link>
        <div className="mt-1.5 text-center">
          <a
            href="#browse"
            onClick={scrollToBrowse}
            className="inline-block px-3 py-1.5 text-xs font-semibold text-coraldark hover:text-coral transition-colors"
          >
            Explore systems
          </a>
        </div>
      </div>
    </MarketingShell>
  );
}


function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "bg-coral text-white"
          : "bg-white text-muted border border-line hover:text-ink hover:border-coral/40"
      }`}
    >
      {children}
    </button>
  );
}
