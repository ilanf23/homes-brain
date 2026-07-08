import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Eyebrow } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";
import { ProCard } from "@/components/pro-card";
import { PROS, TRADE_LABELS, type TradeKey } from "@/lib/pros";

type TradeFilter = "all" | TradeKey;

export const Route = createFileRoute("/pros/")({
  head: () =>
    marketingHead({
      title: "Find a local pro in St. Johns County | HomesBrain",
      description:
        "Trusted plumbers, HVAC, electricians, and more across Nocatee, Ponte Vedra, and St. Augustine. Free to browse.",
      path: "/pros",
      geo: true,
    }),
  validateSearch: (search: Record<string, unknown>): { trade?: TradeKey } => {
    const trade = typeof search.trade === "string" ? (search.trade as TradeKey) : undefined;
    if (trade && !(trade in TRADE_LABELS)) return {};
    return trade ? { trade } : {};
  },
  component: ProsDirectory,
});

function ProsDirectory() {
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TradeFilter>(search.trade ?? "all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROS.filter((p) => {
      if (filter !== "all" && !p.trades.includes(filter)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [query, filter]);

  const verified = filtered.filter((p) => p.verified);
  const listing = filtered.filter((p) => !p.verified);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-10 sm:pt-16 pb-6 text-center">
        <Eyebrow accent="coral">Find a pro</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-5xl sm:leading-[1.06] tracking-tight text-ink">
          Local pros in <span className="text-coral">St. Johns County</span>.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted">
          Trusted trades across Nocatee, Ponte Vedra, and St. Augustine. Free to browse, no signup.
        </p>
      </section>

      {/* Search + filters */}
      <section className="mx-auto max-w-5xl px-5 pb-6">
        <div className="relative">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or city"
            aria-label="Search pros"
            className="w-full rounded-full border border-line bg-paper pl-11 pr-4 py-3 text-[16px] sm:text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {(Object.keys(TRADE_LABELS) as TradeKey[]).map((t) => (
            <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {TRADE_LABELS[t]}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-5 pb-20 space-y-10">
        {filtered.length === 0 && (
          <p className="text-center text-muted py-16">
            No pros match. Try clearing the filter or search.
          </p>
        )}

        {verified.length > 0 && (
          <div>
            <SectionHeading label="Verified pros" count={verified.length} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {verified.map((p) => (
                <ProCard key={p.slug} pro={p} source="directory" />
              ))}
            </div>
          </div>
        )}

        {listing.length > 0 && (
          <div>
            <SectionHeading label="Listing" count={listing.length} />
            <p className="text-sm text-muted mt-1">
              These pros are listed publicly but have not claimed their profile yet.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listing.map((p) => (
                <ProCard key={p.slug} pro={p} source="directory" />
              ))}
            </div>
          </div>
        )}
      </section>
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
      className={`pressable rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-coral text-(--on-accent)"
          : "bg-soft text-ink hover:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">{label}</h2>
      <span className="text-sm text-muted tnum">
        {count} pro{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
