/* Blog/guides content source. Data-driven for now: add a post here and it
   appears on /blog and gets its own /blog/:slug page with Article JSON-LD.
   Swap for MDX or a CMS later without touching the routes. */

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string; // ISO
  readMinutes: number;
  tag: string;
  /* Simple structured body: h2 sections with paragraphs. */
  sections: { heading?: string; paragraphs: string[] }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-often-should-you-service-a-water-softener",
    title: "How often should you service a water softener?",
    description:
      "The service schedule that actually keeps a softener alive: what to check monthly, yearly, and every few years, and when to call your pro.",
    author: "HomesBrain",
    date: "2026-06-15",
    readMinutes: 5,
    tag: "Water treatment",
    sections: [
      {
        paragraphs: [
          "A water softener is one of those systems that works silently until the day it doesn't, and by then, hard water has usually been chewing on your water heater, fixtures, and skin for months. The good news: keeping one healthy is mostly a matter of rhythm, not expertise.",
        ],
      },
      {
        heading: "Monthly: check the salt",
        paragraphs: [
          "Once a month, lift the brine-tank lid. Salt should fill roughly half the tank and sit above the water line. If it's low, top it up. If it looks like one solid crust, that's a salt bridge: the softener will act like it's working while doing nothing. Break the crust up gently with a broom handle.",
        ],
      },
      {
        heading: "Yearly: a professional service",
        paragraphs: [
          "Once a year, have your water treatment pro test hardness at a tap, inspect the resin bed, clean the venturi valve, and sanitize the system. This is the visit that catches the quiet failures: degraded resin, a misprogrammed regeneration cycle, a control valve on its way out.",
          "It's also the visit where a good record matters. A pro who can see the install date, resin type, and last service in seconds gives you a better answer than one guessing from scratch.",
        ],
      },
      {
        heading: "Every 8–12 years: plan for resin",
        paragraphs: [
          "Softener resin has a working life of roughly a decade, less with iron-heavy or chlorinated water. If your softener is regenerating more often than it used to, or soap won't lather like it did, ask your pro to test resin capacity before replacing the whole unit. A rebed is often the smarter spend.",
        ],
      },
      {
        heading: "The part everyone skips: write it down",
        paragraphs: [
          "The single most valuable maintenance habit costs nothing: knowing what you have and what was done to it. Model, serial, install date, warranty, last service. When the pro who services your softener logs the job on HomesBrain, all of that lands in your home's record automatically, so the next visit starts with answers instead of archaeology.",
        ],
      },
    ],
  },
  {
    slug: "what-to-keep-when-you-buy-a-house",
    title: "What records should you keep when you buy a house?",
    description:
      "Closing day hands you a mountain of paper. Here's the short list worth keeping forever, and the modern way to keep it.",
    author: "HomesBrain",
    date: "2026-05-28",
    readMinutes: 4,
    tag: "Homeownership",
    sections: [
      {
        paragraphs: [
          "In the blur of closing day, every document feels important. Most aren't. Your title company and lender keep the legal core. What nobody keeps for you is the operational memory of the house itself. That's the part that costs you money when it goes missing.",
        ],
      },
      {
        heading: "Keep forever: the house's operating record",
        paragraphs: [
          "The inspection report is the closest thing to a medical chart your house will ever get. Keep it. Alongside it: every appliance and system's make, model, serial, and install date; warranty documents; permits from past renovations; and any service history the seller can give you.",
          "That last one is rare gold. A house that arrives with its service history is a house you can maintain on schedule instead of by surprise.",
        ],
      },
      {
        heading: "Keep for taxes: improvements, not repairs",
        paragraphs: [
          "Receipts for capital improvements (a new roof, an addition, a replaced HVAC system) adjust your cost basis and can matter enormously when you sell. Repairs generally don't. When in doubt, keep the receipt and let your accountant sort it later.",
        ],
      },
      {
        heading: "The modern version of the folder",
        paragraphs: [
          "The traditional answer is a fireproof folder that's out of date within a year. The better answer is a record that maintains itself: every time a pro services the home, the visit, the equipment, and the warranty land in one place. That's exactly what a HomesBrain home record is: started by any pro who works on your home, owned by you free, and handed to the next owner when you sell.",
        ],
      },
    ],
  },
];

export function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function formatPostDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
