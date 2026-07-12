/* =============================================================================
 * Public directory of Northeast Florida home service companies.
 *
 * These are REAL local businesses listed publicly (name, phone, website, and
 * whether they have facebook / twitter presence). None of them have claimed a
 * HomesBrain profile yet, so every entry is verified: false and we do NOT
 * carry googleRating / googleReviewCount here - we won't invent review data.
 * The card and profile hide the rating block when it is absent.
 *
 * Trades map to Make It Last appliance categories via CATEGORY_TO_TRADES.
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
  | "irrigation"
  | "pest";

export const TRADE_LABELS: Record<TradeKey, string> = {
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  roofing: "Roofing",
  pool: "Pool care",
  "appliance-repair": "Appliance repair",
  "water-treatment": "Water treatment",
  irrigation: "Irrigation",
  pest: "Pest & termite",
};

/** St. Johns County communities we organize the public directory around. */
export type ServiceAreaKey =
  | "Nocatee"
  | "Ponte Vedra Beach"
  | "Palm Valley"
  | "World Golf Village"
  | "Fruit Cove"
  | "St. Augustine"
  | "St. Augustine Beach";

export const SERVICE_AREAS: ServiceAreaKey[] = [
  "Nocatee",
  "Ponte Vedra Beach",
  "Palm Valley",
  "World Golf Village",
  "Fruit Cove",
  "St. Augustine",
  "St. Augustine Beach",
];


export type Pro = {
  slug: string;
  name: string;
  trades: TradeKey[];
  /** Free-form city / service area label. */
  city: string;
  /** St. Johns County towns this pro serves (verified pros). */
  serviceAreas?: ServiceAreaKey[];
  phone?: string;
  website?: string;
  socials?: {
    facebook?: string | boolean;
    instagram?: string | boolean;
    twitter?: string | boolean;
  };
  googleRating?: number;
  googleReviewCount?: number;
  googlePlaceUrl?: string;
  verified: boolean;
  about?: string;
  deals?: string[];
  hours?: string;
};

/* Helper to keep the list below terse. `fb` / `tw` mark known social presence
   without a URL - see the type comment on `socials`. */
const site = (domain: string) => `https://${domain}`;

export const PROS: Pro[] = [
  {
    slug: "touchton-plumbing",
    name: "Touchton Plumbing Contractors",
    trades: ["plumbing"],
    city: "Northeast Florida",
    phone: "904-389-9299",
    website: site("touchtonplumbing.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "a1-plumbing-air",
    name: "A1 Plumbing, Heating & Air",
    trades: ["plumbing", "hvac"],
    city: "Northeast Florida",
    phone: "904-475-0093",
    website: site("a1plumbingandac.com"),
    verified: false,
  },
  {
    slug: "premier-plumbing",
    name: "Premier Plumbing & Mechanical",
    trades: ["plumbing"],
    city: "Northeast Florida",
    phone: "904-738-9927",
    website: site("wearepremierplumbing.com"),
    verified: false,
  },
  {
    slug: "floridian-plumbing",
    name: "Floridian Plumbing",
    trades: ["plumbing"],
    city: "Northeast Florida",
    phone: "904-933-0300",
    website: site("floridianpl.com"),
    verified: false,
  },
  {
    slug: "duck-duck-rooter",
    name: "Duck Duck Rooter Plumbing, Septic & A/C",
    trades: ["plumbing", "hvac"],
    city: "Northeast Florida",
    phone: "904-206-8512",
    website: site("duckduckrooter.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "hall-and-sons-plumbing",
    name: "Hall and Sons Plumbing",
    trades: ["plumbing"],
    city: "Northeast Florida",
    phone: "904-429-9747",
    website: site("hallandsonsplbg.com"),
    verified: false,
  },
  {
    slug: "turner-plumbing",
    name: "Turner Plumbing Co",
    trades: ["plumbing"],
    city: "Northeast Florida",
    phone: "904-396-7044",
    website: site("turnerplumbingco.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "nolan-plumbing-irrigation",
    name: "Nolan Plumbing & Irrigation",
    trades: ["plumbing", "irrigation"],
    city: "Northeast Florida",
    phone: "904-783-4321",
    website: site("nolanplumbingandirrigation.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "lickety-split",
    name: "Lickety Split AC, Plumbing & Electric",
    trades: ["hvac", "plumbing", "electrical"],
    city: "Northeast Florida",
    phone: "904-217-6218",
    website: site("licketysplitfl.com"),
    verified: false,
  },
  {
    slug: "jw-heating-air",
    name: "J&W Heating and Air + Plumbing",
    trades: ["hvac", "plumbing"],
    city: "Northeast Florida",
    phone: "904-647-3292",
    website: site("jandwheatingandair.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "mcgowans-hvac",
    name: "McGowan's Heating and Air Conditioning",
    trades: ["hvac"],
    city: "Northeast Florida",
    phone: "904-278-0339",
    website: site("mcgowansac.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "weather-engineers",
    name: "Weather Engineers",
    trades: ["hvac"],
    city: "Northeast Florida",
    phone: "904-356-3963",
    website: site("weatherengineers.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "thigpen-hvac",
    name: "Thigpen Heating and Cooling",
    trades: ["hvac"],
    city: "Northeast Florida",
    phone: "904-448-1962",
    website: site("thigpenhvac.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "reliable-ducts",
    name: "Reliable Ducts Heating & Cooling",
    trades: ["hvac"],
    city: "Northeast Florida",
    phone: "904-551-7132",
    website: site("reliableductsac.com"),
    verified: false,
  },
  {
    slug: "griffin-service",
    name: "Griffin Service",
    trades: ["hvac", "plumbing"],
    city: "Northeast Florida",
    website: site("griffinservice.com"),
    socials: { twitter: true },
    verified: false,
  },
  {
    slug: "david-gray",
    name: "David Gray Electrical, Plumbing, Heating & Air",
    trades: ["electrical", "plumbing", "hvac"],
    city: "Northeast Florida",
    phone: "904-385-5920",
    website: site("davidgrayonline.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "hubbard-electrical",
    name: "Hubbard Electrical Contracting",
    trades: ["electrical"],
    city: "Northeast Florida",
    phone: "904-351-9722",
    website: site("hubbardelectricalcontracting.com"),
    verified: false,
  },
  {
    slug: "tenax-electrical",
    name: "Tenax Electrical Company",
    trades: ["electrical"],
    city: "Northeast Florida",
    phone: "904-604-6100",
    website: site("tenaxelectrical.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "performance-electrical",
    name: "Performance Electrical Contracting",
    trades: ["electrical"],
    city: "Northeast Florida",
    phone: "904-726-7966",
    website: site("pecjax.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "gt-electrical",
    name: "GT Electrical Contractors",
    trades: ["electrical"],
    city: "Northeast Florida",
    phone: "904-852-0058",
    website: site("gtelectricaljax.com"),
    verified: false,
  },
  {
    slug: "nexgen-roofing",
    name: "NEXGEN Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-802-7150",
    website: site("nexgenfl.com"),
    verified: false,
  },
  {
    slug: "reliant-roofing",
    name: "Reliant Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-657-0880",
    website: site("reliantroofing.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "register-roofing",
    name: "Register Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-215-8533",
    website: site("registerroofing.com"),
    verified: false,
  },
  {
    slug: "excel-roofing",
    name: "Excel Roofing Contractors",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-631-7663",
    website: site("excel-roofing.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "prime-roofing",
    name: "Prime Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-530-1446",
    website: site("primeroofingfl.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "coastal-edge-roofing",
    name: "Coastal Edge Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-910-3121",
    website: site("coastaledgeroofing.com"),
    socials: { facebook: true },
    verified: false,
  },
  {
    slug: "hw-roofing",
    name: "HW Roofing",
    trades: ["roofing"],
    city: "Northeast Florida",
    phone: "904-217-0227",
    website: site("hwcontracting.net"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "florida-bonded-pools",
    name: "Florida Bonded Pools",
    trades: ["pool"],
    city: "Northeast Florida",
    phone: "904-641-5265",
    website: site("floridabondedpools.com"),
    socials: { facebook: true, twitter: true },
    verified: false,
  },
  {
    slug: "kerry-martin-pools",
    name: "Kerry Martin Pool Builders",
    trades: ["pool"],
    city: "Northeast Florida",
    phone: "904-262-2384",
    website: site("jacksonvillepoolcontractor.com"),
    verified: false,
  },
  {
    slug: "premier-water",
    name: "Premier Water & Energy Technology",
    trades: ["water-treatment"],
    city: "Northeast Florida",
    phone: "904-268-1152",
    website: site("premierwater.com"),
    socials: { twitter: true },
    verified: false,
  },
  {
    slug: "udi-water",
    name: "UDI Water",
    trades: ["water-treatment"],
    city: "Northeast Florida",
    phone: "800-741-4426",
    website: site("udiwater.com"),
    socials: { facebook: true },
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
  outdoor: ["pool", "irrigation", "pest"],
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
