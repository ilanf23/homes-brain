import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Card, Eyebrow, Pill } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";
import { ProCard } from "@/components/pro-card";
import {
  PROS,
  SERVICE_AREAS,
  TRADE_LABELS,
  type ServiceAreaKey,
  type TradeKey,
} from "@/lib/pros";

type AreaFilter = "all" | ServiceAreaKey;

/** Total Charter slots per trade per town. Frame open slots as exclusive. */
const CHARTER_SLOTS_PER_TRADE = 3;

export const Route = createFileRoute("/pros/")({
  head: () =>
    marketingHead({
      title: "Find a local pro in St. Johns County | HomesBrain",
      description:
        "The top few Charter Pros per trade across Nocatee, Ponte Vedra, St. Augustine, and Fruit Cove. Free to browse.",
      path: "/pros",
      geo: true,
    }),
  component: ProsDirectory,
});

function ProsDirectory() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<AreaFilter>("all");

  // Public directory: verified pros only. Unclaimed businesses stay in PROS
  // for internal outreach but never render here.
  const verifiedAll = useMemo(() => PROS.filter((p) => p.verified), []);

  const inArea = (p: (typeof verifiedAll)[number]) =>
    area === "all" ? true : (p.serviceAreas ?? []).includes(area);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verifiedAll.filter((p) => {
      if (!inArea(p)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [verifiedAll, query, area]);

  const trades = Object.keys(TRADE_LABELS) as TradeKey[];

  const tradeCounts = useMemo(() => {
    return trades.map((trade) => {
      const filled = verifiedAll.filter(
        (p) => p.trades.includes(trade) && inArea(p),
      ).length;
      const open = Math.max(0, CHARTER_SLOTS_PER_TRADE - filled);
      return { trade, filled, open };
    });
  }, [verifiedAll, area]);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-10 sm:pt-16 pb-6 text-center">
        <Eyebrow accent="teal">Find a pro</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-5xl sm:leading-[1.06] tracking-tight text-ink font-sans font-extrabold">
          The top few pros in <span className="text-teal">St. Johns County</span>.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted">
          Charter Pros, curated by trade and town. Nocatee, Ponte Vedra, St. Augustine, Fruit Cove.
        </p>
      </section>

      {/* Town selector */}
      <section className="mx-auto max-w-5xl px-5 pb-4">
        <div className="text-sm font-semibold text-ink mb-2">
          Where is your home?
        </div>
        <div className="flex flex-wrap gap-2">
          <AreaChip active={area === "all"} onClick={() => setArea("all")}>
            All of St. Johns County
          </AreaChip>
          {SERVICE_AREAS.map((a) => (
            <AreaChip key={a} active={area === a} onClick={() => setArea(a)}>
              {a}
            </AreaChip>
          ))}
        </div>
      </section>

      {/* Focus map */}
      <section className="mx-auto max-w-3xl px-5 pb-6">
        <Card className="!p-4 sm:!p-5">
          <CountyMap selected={area === "all" ? null : area} />
          <div className="mt-3 text-center text-xs text-muted">
            Serving all of St. Johns County.
          </div>
        </Card>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-5xl px-5 pb-4">
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
            placeholder="Search by name"
            aria-label="Search pros"
            className="w-full rounded-full border border-line bg-paper pl-11 pr-4 py-3 text-[16px] sm:text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </div>
      </section>

      {/* Trust rule */}
      <section className="mx-auto max-w-3xl px-5 pb-6">
        <p className="text-center text-sm text-muted italic">
          We show the top few pros per trade, never everyone. If just one meets
          the standard, only one appears. Nobody buys their way on.
        </p>
      </section>

      {/* Charter Class per trade */}
      <section className="mx-auto max-w-5xl px-5 pb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-sans font-extrabold tracking-tight text-ink">
            Charter Class {area === "all" ? "" : `· ${area}`}
          </h2>
          <span className="text-sm text-muted">Class of 2027</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tradeCounts.map(({ trade, filled, open }) => (
            <div
              key={trade}
              className="rounded-2xl border border-line bg-paper px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">
                  {TRADE_LABELS[trade]}
                </div>
                <div className="text-xs text-muted tnum mt-0.5">
                  {filled} of {CHARTER_SLOTS_PER_TRADE} filled
                </div>
              </div>
              {open > 0 ? (
                <Pill accent="teal">
                  {open} spot{open === 1 ? "" : "s"} filling
                </Pill>
              ) : (
                <Pill accent="teal">
                  <ShieldCheck size={11} strokeWidth={2.5} />
                  <span className="ml-0.5">Full</span>
                </Pill>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Verified results */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-teal/40 bg-tealbg/40 p-6 sm:p-8 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-teal/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tealdark">
              <ShieldCheck size={12} strokeWidth={2.5} />
              Charter Class of 2027
            </div>
            <h3 className="mt-3 text-2xl font-sans font-extrabold tracking-tight text-ink">
              Charter spots are filling now.
            </h3>
            <p className="mt-2 text-sm text-muted">
              We hand-verify each pro before listing.{" "}
              {area === "all"
                ? "The first spots across St. Johns County are open."
                : `The first spots in ${area} are open.`}{" "}
              If you know a great local pro, tell them to claim theirs.
            </p>
            <a
              href="/pro/signup"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-teal text-(--on-accent) font-semibold px-5 py-2.5 text-sm hover:bg-tealdark transition-colors"
            >
              Claim your Charter spot
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProCard key={p.slug} pro={p} source="directory" />
            ))}
          </div>
        )}
      </section>
    </MarketingShell>
  );
}

function AreaChip({
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
      className={`pressable rounded-full px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${
        active
          ? "bg-teal text-(--on-accent)"
          : "bg-soft text-ink hover:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

/* Stylized focus map of St. Johns County. Hand-drawn silhouette, not
   geographically precise - a calm marker of place, not a mapping tool.
   Coordinates are tuned to the 400x300 viewBox. */
const TOWN_POINTS: Record<ServiceAreaKey, { x: number; y: number; label: string }> = {
  "Fruit Cove": { x: 110, y: 70, label: "Fruit Cove" },
  Nocatee: { x: 235, y: 105, label: "Nocatee" },
  "Ponte Vedra": { x: 305, y: 75, label: "Ponte Vedra" },
  "St. Augustine": { x: 290, y: 215, label: "St. Augustine" },
};

function CountyMap({ selected }: { selected: ServiceAreaKey | null }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className="w-full h-auto"
      role="img"
      aria-label="St. Johns County towns we serve"
    >
      {/* County silhouette (stylized) */}
      <path
        d="M60,80 C90,50 150,40 200,55 C260,45 320,55 350,90 C365,130 355,180 335,215 C310,255 260,275 210,268 C160,275 110,260 80,225 C55,190 45,130 60,80 Z"
        fill="var(--tealbg, #e6f5f3)"
        stroke="var(--teal, #0f8a86)"
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Coastline hint */}
      <path
        d="M340,80 C355,140 350,210 320,255"
        fill="none"
        stroke="var(--teal, #0f8a86)"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.5"
      />

      {/* Town dots */}
      {(Object.keys(TOWN_POINTS) as ServiceAreaKey[]).map((key) => {
        const p = TOWN_POINTS[key];
        const isSelected = selected === key;
        return (
          <g key={key}>
            {isSelected && (
              <circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill="var(--teal, #0f8a86)"
                opacity="0.18"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isSelected ? 6 : 4.5}
              fill={isSelected ? "var(--teal, #0f8a86)" : "var(--ink, #16160f)"}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={isSelected ? "var(--tealdark, #0a5f5c)" : "var(--ink, #16160f)"}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      <text
        x="200"
        y="290"
        textAnchor="middle"
        fontSize="10"
        fill="var(--muted, #73706a)"
        fontStyle="italic"
      >
        St. Johns County, Florida
      </text>
    </svg>
  );
}
