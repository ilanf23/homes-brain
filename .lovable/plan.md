# Make It Last — Local Pros Directory v1

Additive build. Coral homeowner brand. Sample data seeded in code (clearly labeled, replaceable), one new database table for contact capture.

## 1. Sample data — `src/lib/pros.ts` (new)

```ts
export type TradeKey =
  | "plumbing" | "hvac" | "electrical" | "roofing"
  | "pool" | "appliance-repair" | "water-treatment" | "pest";

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
  about?: string;        // verified only
  deals?: string[];      // verified only
  hours?: string;        // verified only
};

export const PROS: Pro[] = [ /* 8 pros, generic names */ ];
export const TRADE_LABELS: Record<TradeKey, string> = { ... };
export function getPro(slug: string): Pro | undefined;
export function prosByTrade(trade: TradeKey): Pro[];  // verified first
```

Seed: `ponte-vedra-plumbing-co`, `first-coast-hvac`, `nocatee-electric`, `st-augustine-roofing`, `first-coast-pool-care`, `ponte-vedra-appliance-repair`, `nocatee-water-solutions`, `first-coast-pest`. 3 verified, 5 listing. All names generic so they don't impersonate real businesses. Big comment header at top: `SAMPLE DATA — replace with real pros before launch`.

Trade → appliance-category map lives here too so guides can look up matching pros:

```ts
export const CATEGORY_TO_TRADES: Record<CategoryId, TradeKey[]>;
// cooling-heating → hvac, water-heating → plumbing + water-treatment, etc.
```

## 2. Directory page — `src/routes/pros.index.tsx` (new, path `/pros`)

- Coral hero: "Find a local pro in St. Johns County."
- Search input filters by name (client-side, debounced).
- Filter chips: All + one per trade.
- Two sections: **Verified** (coral badge) then **Listing**.
- Card: name, trade pills, city, tel: link with phone icon, website link if present, Google rating stars + count linking to `googlePlaceUrl`, coral "Contact pro" button → `/pro/$slug`.
- Mobile: 1-col stack; sm: 2-col; lg: 3-col.
- Head: title "Find a local pro in St. Johns County | HomesBrain", description, canonical.

Add "Find a pro" link to footer in `src/components/marketing.tsx` and a link on `/make-it-last` (near the browse grid or hero secondary CTA).

## 3. Profile page — `src/routes/pro.$slug.tsx` (new, path `/pro/$slug`)

Note: path is `/pro/$slug`, not `/pros/$slug`, per spec. The existing `/pro/*` app tree lives under `/pro/jobs`, `/pro/customers`, etc. — a bare `/pro/$slug` file will match anything under `/pro` that isn't already a fixed route. Safe today (all pro-app routes are fixed), but I'll add a `beforeLoad` `notFound()` when slug matches a reserved word (`jobs`, `customers`, `office`, `settings`, `reviews`, `signup`, `login`) as a guardrail.

Layout:
- Back link to `/pros`.
- Header: name, city, verified coral badge (if verified), trade pills.
- Big coral "Contact this pro" button (opens contact modal, see §5).
- Contact row: click-to-call (tel:), website, socials.
- Google rating card with link out (if present).
- About section (verified only, plain prose).
- Deals section (verified only, coral tint list).
- Hours (verified only).
- Listing pros: subtle indigo link "Are you this pro? Claim your profile" → mailto `hello@homesbrain.com?subject=Claim%20{name}`.

SEO:
- `head()` sets title, description, canonical, og.
- Inline JSON-LD: `LocalBusiness` (name, telephone, url, areaServed "St. Johns County, FL", aggregateRating when present) + `BreadcrumbList` (Home → Find a pro → {name}).
- No invented reviews. `aggregateRating` only when `googleRating` + `googleReviewCount` exist.

## 4. Guide integration — `src/routes/make-it-last.$slug.tsx`

Add a **"Pros who do this work near you"** section, anchor `#pros`, placed after the hero band and above the maintenance steps so it's prominent. For each appliance:

- Look up its category via existing `make-it-last-visuals`, then `CATEGORY_TO_TRADES[category]` → merge & dedupe pro lists → verified first → take top 4.
- Each card: name, trade pills, city, small rating, "See profile" → `/pro/$slug`.
- Footer link: "See all {trade} pros in St. Johns County →" → `/pros?trade={trade}` (first matched trade).

If no matching trade → hide the section (don't render empty state; keeps guides clean).

## 5. Contact flow

**Database migration (needs approval):**

```sql
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_slug text NOT NULL,
  trade text,
  homeowner_name text NOT NULL,
  homeowner_contact text NOT NULL,     -- phone or email
  message text,
  source text,                          -- "pro_profile" | "guide" | "directory"
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.service_requests TO anon, authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit; nobody can read except service_role (admin/edge later).
CREATE POLICY "public can insert requests"
  ON public.service_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(homeowner_name) BETWEEN 1 AND 100
    AND length(homeowner_contact) BETWEEN 3 AND 200
    AND length(coalesce(message, '')) <= 2000
    AND length(pro_slug) BETWEEN 1 AND 100
  );
-- No SELECT policy = no client can read; RLS enforced.
```

Length caps in the CHECK act as a server-side guardrail on top of Zod client validation.

**UI** — `src/components/contact-pro-modal.tsx` (new):
- Trigger prop: `pro: Pro`, `sourceContext?: { trade?: TradeKey; source: string }`.
- Fields: Name, Phone or email, "What do you need?" (optional).
- Zod validation, coral submit button, loading state.
- Insert into `service_requests` via browser `supabase` client.
- On success: swap panel to "Got it. We'll connect you with {name}." with a close button. Log event `service_request_submitted`.
- On failure: inline error, keep form data.
- Used from `/pro/$slug` and (optionally) from a compact CTA on each guide's pro card row.

## Files touched

- **New:** `src/lib/pros.ts`, `src/routes/pros.index.tsx`, `src/routes/pro.$slug.tsx`, `src/components/contact-pro-modal.tsx`, `src/components/pro-card.tsx` (shared card used by directory + guide section).
- **Edit:** `src/components/marketing.tsx` (footer link), `src/routes/make-it-last.index.tsx` (link to `/pros`), `src/routes/make-it-last.$slug.tsx` (Pros section + anchor).
- **Migration:** `service_requests` table + insert-only public policy.

## Explicit non-goals for v1

- No real pro data, no scraping, no Google Places API call — sample only.
- No email/SMS on submit (per spec — capture only).
- No auth on submit (anonymous form; RLS insert-only, no read).
- Directory doesn't paginate (8 pros).
- `?trade=` query on `/pros` is a nice-to-have; will implement client-side param read.

## Assumptions I'm making

- "Contact" capture is anonymous (no login required). Confirm if you'd rather gate it.
- The `hello@homesbrain.com` mailto for "Claim your profile" is fine as a stopgap. Swap for a real claim flow later.
- Sample pro phone numbers will be obvious placeholders like `(904) 555-0100` (555 range is reserved for fiction) so no one gets pranked.

Ready to proceed on approval of the migration (§5) — that runs first, then all code lands in one pass.
