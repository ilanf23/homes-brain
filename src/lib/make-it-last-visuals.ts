import { useEffect, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { GUIDE_ORDER, getGuide, type Guide } from "@/lib/make-it-last";

/**
 * Category registry. Each category owns a soft tint (bg + fg) used consistently
 * across the browse grid, guide hero medallions, and section headings. Coral
 * stays the primary brand action color (buttons, maintained bar); tints here
 * are for identification only, they intentionally look calm and premium.
 */
export type CategoryId =
  | "cool-heat"
  | "water-heating"
  | "plumbing"
  | "kitchen-laundry"
  | "electrical"
  | "structure"
  | "outdoor";

export type Category = {
  id: CategoryId;
  label: string;
  /** Tailwind arbitrary color pair for medallions and cards. */
  bg: string;
  fg: string;
};

export const CATEGORIES: Category[] = [
  { id: "cool-heat", label: "Cooling and heating", bg: "bg-[#e0f2fe]", fg: "text-[#075985]" },
  { id: "water-heating", label: "Water heating", bg: "bg-[#fee2e2]", fg: "text-[#9a1e13]" },
  { id: "plumbing", label: "Plumbing and water", bg: "bg-[#dbeafe]", fg: "text-[#1e3a8a]" },
  { id: "kitchen-laundry", label: "Kitchen and laundry", bg: "bg-[#fef3c7]", fg: "text-[#78350f]" },
  { id: "electrical", label: "Electrical", bg: "bg-[#fef9c3]", fg: "text-[#713f12]" },
  { id: "structure", label: "Structure and exterior", bg: "bg-[#e7e5e4]", fg: "text-[#44403c]" },
  { id: "outdoor", label: "Outdoor", bg: "bg-[#dcfce7]", fg: "text-[#14532d]" },
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/**
 * Per-slug metadata. Adding a new guide? Add its slug here so the browse grid
 * and hero medallion pick up an icon and category tint automatically.
 */
export const SLUG_META: Record<string, { Icon: LucideIcon; categoryId: CategoryId }> = {
  "central-ac": { Icon: Wind, categoryId: "cool-heat" },
  "heat-pump": { Icon: Thermometer, categoryId: "cool-heat" },
  furnace: { Icon: Flame, categoryId: "cool-heat" },

  "water-heater": { Icon: Flame, categoryId: "water-heating" },
  "tankless-water-heater": { Icon: Zap, categoryId: "water-heating" },

  "water-softener": { Icon: Droplets, categoryId: "plumbing" },
  "well-pump": { Icon: Droplet, categoryId: "plumbing" },
  "sump-pump": { Icon: ArrowDownToLine, categoryId: "plumbing" },
  "garbage-disposal": { Icon: Trash2, categoryId: "plumbing" },
  faucets: { Icon: Wrench, categoryId: "plumbing" },
  toilet: { Icon: Bath, categoryId: "plumbing" },

  refrigerator: { Icon: Refrigerator, categoryId: "kitchen-laundry" },
  dishwasher: { Icon: Utensils, categoryId: "kitchen-laundry" },
  "range-oven": { Icon: ChefHat, categoryId: "kitchen-laundry" },
  microwave: { Icon: Microwave, categoryId: "kitchen-laundry" },
  washer: { Icon: WashingMachine, categoryId: "kitchen-laundry" },
  dryer: { Icon: Shirt, categoryId: "kitchen-laundry" },

  "electrical-panel": { Icon: PlugZap, categoryId: "electrical" },
  "standby-generator": { Icon: Power, categoryId: "electrical" },

  roof: { Icon: HomeIcon, categoryId: "structure" },
  gutters: { Icon: CloudRain, categoryId: "structure" },
  "garage-door": { Icon: DoorOpen, categoryId: "structure" },
  windows: { Icon: PanelsTopLeft, categoryId: "structure" },

  "pool-equipment": { Icon: Waves, categoryId: "outdoor" },
  irrigation: { Icon: Sprout, categoryId: "outdoor" },
  "pest-termite": { Icon: Bug, categoryId: "outdoor" },
};

export function getSlugMeta(slug: string) {
  return SLUG_META[slug] ?? { Icon: HomeIcon, categoryId: "structure" as CategoryId };
}

/** Payoff shown on browse cards and hero. */
export type Payoff =
  | { kind: "gain"; years: number } // +N years
  | { kind: "life"; label: string } // "Built to last"
  | { kind: "protect"; label: string }; // "Protect it"

export function payoffFor(g: Guide): Payoff {
  if (g.expectedLifeOnly) return { kind: "life", label: "Built to last" };
  if (g.cadenceOnly) return { kind: "protect", label: "Protect it" };
  return { kind: "gain", years: Math.max(0, g.maintained - g.neglected) };
}

export type BrowseEntry = {
  slug: string;
  label: string;
  Icon: LucideIcon;
  category: Category;
  payoff: Payoff;
  guide: Guide;
};

/** All guides in canonical order, enriched with visuals + payoff. */
export function allBrowseEntries(): BrowseEntry[] {
  return GUIDE_ORDER.map((slug) => {
    const g = getGuide(slug)!;
    const meta = getSlugMeta(slug);
    return {
      slug,
      label: g.label,
      Icon: meta.Icon,
      category: getCategory(meta.categoryId),
      payoff: payoffFor(g),
      guide: g,
    };
  });
}

/** Ease-out cubic count-up. Animates on mount and whenever `key` changes. */
export function useCountUp(target: number, key: string, ms = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, target]);
  return value;
}
