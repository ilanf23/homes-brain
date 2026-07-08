import { useState } from "react";

/* Compact "two lifespans" teaser for the homepage.
   The full picker on /make-it-last uses its own local copy with extra data
   (tasks, buttons, more items); this one is deliberately smaller and
   independent so this component can never break that page. */

type MiniItem = { slug: string; label: string; neglected: number; maintained: number };

const MINI_ITEMS: MiniItem[] = [
  { slug: "water-heater", label: "Water heater", neglected: 10, maintained: 15 },
  { slug: "central-ac", label: "Central AC", neglected: 12, maintained: 18 },
  { slug: "roof", label: "Roof", neglected: 15, maintained: 25 },
  { slug: "dryer", label: "Dryer", neglected: 8, maintained: 13 },
  { slug: "dishwasher", label: "Dishwasher", neglected: 9, maintained: 12 },
];

const MAX_YEARS = Math.max(...MINI_ITEMS.map((i) => i.maintained));

export function MiniLifespansPicker() {
  const [selected, setSelected] = useState<MiniItem>(MINI_ITEMS[0]);
  const gap = selected.maintained - selected.neglected;
  const neglectedPct = (selected.neglected / MAX_YEARS) * 100;
  const maintainedPct = (selected.maintained / MAX_YEARS) * 100;

  return (
    <div className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <div
        role="tablist"
        aria-label="Pick something in your home"
        className="flex flex-wrap gap-1.5"
      >
        {MINI_ITEMS.map((it) => {
          const active = it.slug === selected.slug;
          return (
            <button
              key={it.slug}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(it)}
              className={`pressable rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
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

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold text-ink">{selected.label}</div>
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-coraldark bg-coralbg rounded-full px-2.5 py-1">
          +{gap} years
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Bar
          label="Left alone"
          years={selected.neglected}
          pct={neglectedPct}
          barClass="bg-line"
          labelClass="text-muted"
        />
        <Bar
          label="Maintained"
          years={selected.maintained}
          pct={maintainedPct}
          barClass="bg-coral"
          labelClass="text-coraldark"
          trackClass="bg-coralbg"
        />
      </div>
    </div>
  );
}

function Bar({
  label,
  years,
  pct,
  barClass,
  labelClass,
  trackClass = "bg-soft",
}: {
  label: string;
  years: number;
  pct: number;
  barClass: string;
  labelClass: string;
  trackClass?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className={`font-semibold ${labelClass}`}>{label}</span>
        <span className={`tnum font-semibold ${labelClass}`}>{years} years</span>
      </div>
      <div className={`mt-1.5 h-2 rounded-full overflow-hidden ${trackClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
