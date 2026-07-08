/* =============================================================================
 * SAMPLE DATA - replace with real, verified pros before launch.
 *
 * The pro names below are deliberately generic ("Ponte Vedra Plumbing Co",
 * "First Coast HVAC", etc.) so they do not impersonate real local businesses.
 * Phone numbers use the 555-01xx range reserved for fiction. No claim in this
 * file should be presented to homeowners as a real endorsement.
 *
 * When real data replaces this, keep the same shape and helpers - the routes
 * that consume it (/pros, /pro/$slug, and the guide "Pros who do this work"
 * section) all read from PROS and prosByTrade().
 * ========================================================================== */

import type { CategoryId } from "@/lib/make-it-last-visuals";

export type TradeKey =
  | "plumbing"
  | "hvac"
  | "electrical"
  | "roofing"
  | "pool"
  | "appliance-repair"
  | "water-treatment"
  | "pest";

export const TRADE_LABELS: Record<TradeKey, string> = {
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  roofing: "Roofing",
  pool: "Pool care",
  "appliance-repair": "Appliance repair",
  "water-treatment": "Water treatment",
  pest: "Pest & termite",
};

export type Pro = {
  slug: string;
  name: string;
  trades: TradeKey[];
  city: "Nocatee" | "Ponte Vedra" | "St. Augustine";
  phone: string;
  website?: string;
  socials?: { facebook?: string; instagram?: string };
  googleRating?: number;
  googleReviewCount?: number;
  googlePlaceUrl?: string;
  verified: boolean;
  /** Verified pros only. */
  about?: string;
  /** Verified pros only. */
  deals?: string[];
  /** Verified pros only. */
  hours?: string;
};

export const PROS: Pro[] = [
  {
    slug: "ponte-vedra-plumbing-co",
    name: "Ponte Vedra Plumbing Co",
    trades: ["plumbing", "water-treatment"],
    city: "Ponte Vedra",
    phone: "(904) 555-0110",
    website: "https://example.com",
    googleRating: 4.9,
    googleReviewCount: 214,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: true,
    about:
      "Family-run plumbing shop serving Ponte Vedra and Nocatee since 2011. Water heaters, softeners, repipes, leak repair, and whole-home filtration. Same-week appointments and clear, upfront pricing.",
    deals: [
      "Free water hardness test with any service call",
      "$50 off tankless water heater install for HomesBrain homeowners",
    ],
    hours: "Mon-Fri 7a-6p, Sat 8a-2p",
  },
  {
    slug: "first-coast-hvac",
    name: "First Coast HVAC",
    trades: ["hvac"],
    city: "St. Augustine",
    phone: "(904) 555-0120",
    website: "https://example.com",
    googleRating: 4.8,
    googleReviewCount: 187,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: true,
    about:
      "AC and heat pump specialists across St. Johns County. Annual maintenance plans, coil cleanings, and full system replacement with 10-year parts warranty.",
    deals: ["$79 tune-up special (limit one per home per year)"],
    hours: "Mon-Sat 7a-7p, emergency service 24/7",
  },
  {
    slug: "nocatee-electric",
    name: "Nocatee Electric",
    trades: ["electrical"],
    city: "Nocatee",
    phone: "(904) 555-0130",
    website: "https://example.com",
    googleRating: 5.0,
    googleReviewCount: 96,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: true,
    about:
      "Licensed electrical contractor focused on residential panel upgrades, whole-home surge protection, EV chargers, and standby generator installs.",
    deals: [
      "Complimentary panel safety inspection for HomesBrain homeowners",
      "10% off Level 2 EV charger install",
    ],
    hours: "Mon-Fri 8a-6p",
  },

  // Listing (unclaimed) - factual only, no about/deals/hours.
  {
    slug: "st-augustine-roofing",
    name: "St. Augustine Roofing",
    trades: ["roofing"],
    city: "St. Augustine",
    phone: "(904) 555-0140",
    googleRating: 4.6,
    googleReviewCount: 132,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: false,
  },
  {
    slug: "first-coast-pool-care",
    name: "First Coast Pool Care",
    trades: ["pool"],
    city: "Ponte Vedra",
    phone: "(904) 555-0150",
    googleRating: 4.7,
    googleReviewCount: 88,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: false,
  },
  {
    slug: "ponte-vedra-appliance-repair",
    name: "Ponte Vedra Appliance Repair",
    trades: ["appliance-repair"],
    city: "Ponte Vedra",
    phone: "(904) 555-0160",
    googleRating: 4.5,
    googleReviewCount: 63,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: false,
  },
  {
    slug: "nocatee-water-solutions",
    name: "Nocatee Water Solutions",
    trades: ["water-treatment", "plumbing"],
    city: "Nocatee",
    phone: "(904) 555-0170",
    verified: false,
  },
  {
    slug: "first-coast-pest",
    name: "First Coast Pest & Termite",
    trades: ["pest"],
    city: "St. Augustine",
    phone: "(904) 555-0180",
    googleRating: 4.4,
    googleReviewCount: 51,
    googlePlaceUrl: "https://www.google.com/maps",
    verified: false,
  },
];

/**
 * Map a Make It Last appliance category to the trades that typically service
 * it. Used by the guide pages to surface matching pros.
 */
export const CATEGORY_TO_TRADES: Record<CategoryId, TradeKey[]> = {
  "cool-heat": ["hvac"],
  "water-heating": ["plumbing"],
  plumbing: ["plumbing", "water-treatment"],
  "kitchen-laundry": ["appliance-repair"],
  electrical: ["electrical"],
  structure: ["roofing"],
  outdoor: ["pool", "pest"],
};

export function getPro(slug: string): Pro | undefined {
  return PROS.find((p) => p.slug === slug);
}

/** Verified first, then listing. */
export function prosByTrade(trade: TradeKey): Pro[] {
  return PROS.filter((p) => p.trades.includes(trade)).sort(
    (a, b) => Number(b.verified) - Number(a.verified),
  );
}

/** Combine trades and dedupe by slug. Verified first. */
export function prosByTrades(trades: TradeKey[]): Pro[] {
  const seen = new Set<string>();
  const list: Pro[] = [];
  for (const p of PROS) {
    if (p.trades.some((t) => trades.includes(t)) && !seen.has(p.slug)) {
      seen.add(p.slug);
      list.push(p);
    }
  }
  return list.sort((a, b) => Number(b.verified) - Number(a.verified));
}

export function prosForCategory(categoryId: CategoryId): Pro[] {
  return prosByTrades(CATEGORY_TO_TRADES[categoryId] ?? []);
}
