# Partners page redesign: "The record follows the home"

Date: 2026-07-05
Route: `/partners` (`src/routes/partners.tsx`)
Status: approved design, pending implementation plan

## Goal

Rebuild the partners page from a thin hero + six cards + form into a full narrative marketing page at the same depth and craft as the reworked landing (`index.tsx`) and for-homeowners pages. Follow the new brand principles in CLAUDE.md (single-indigo brand, coral for payoff moments only, warm paper neutrals, system font on marketing) and the section rhythm established on the other marketing pages.

## Story spine

Homes change hands, and every handoff wipes the home's memory. Pros write the record day to day, but partners (builders, realtors, inspectors, insurers, home-watch firms) sit at exactly the moments the record is born, transferred, or judged. HomesBrain makes them part of a record that survives the sale, with their name on it.

## Page structure (in order)

### 1. Hero (white)

- Eyebrow (indigo): FOR EVERYONE WHO TOUCHES THE HOME
- H1: "Every home you touch keeps a memory." One keyword underlined with the hand-drawn `Scribble` SVG (reuse from landing or a page-local equivalent).
- Sub (muted): If your business touches the home, you can start its record and stay part of its story for as long as the home stands.
- CTAs: `Become a partner` (Btn indigo lg, anchor `#become-a-partner`) and `See how it works` (Btn secondary lg, anchor `#how-it-works`).
- Trust row: small ShieldCheck line with dot separators (free to start, homeowner owns the record, verified at the source).
- Right column (hidden on mobile, `grid lg:grid-cols-[1.1fr_1fr]`): new page-local animated SVG scene, `HandoffScene`. A record card passing through hands: builder starts it, owner holds it, next owner receives it. Uses `draw-path`, `dash-flow` arrows, `pulse-dot` on the record. Entrance `anim-scale-in d-2`. Respect reduced motion via existing hooks.
- Standard hero stagger: `anim-fade-up` with `d-1` to `d-4` down the stack.

### 2. The handoff problem (soft band, `bg-soft border-y border-line py-24`)

- SectionHead: eyebrow THE HANDOFF PROBLEM, H2 "Every closing wipes the home's memory."
- Body: the builder's binder gets lost in a garage. The inspection PDF dies in a download folder. The insurer underwrites blind. The new owner starts from zero.
- Visual: page-local `HandoffTimeline` SVG inside an `InView`. A home passing between owners on a horizontal timeline; the paper record dies (fades/breaks) at each sale marker; below it, the HomesBrain line continues unbroken through the same markers. Draws on scroll with `draw-path`.
- Stat strip over a photo: reuse the landing treatment (`public/images/landing/problem-homes.jpg`, `bg-ink/60` overlay, three divided cells, white extrabold numbers). Stats are illustrative and labeled as such in fine print: ~$15B forgetting tax per year, ~6M homes change hands per year, 0 service records survive the sale today.

### 3. Who we work with (white, the core section)

SectionHead: eyebrow WHO WE WORK WITH, H2 "Five doors into the same record."

Five zig-zag payoff blocks following the for-homeowners "what you get" pattern: alternating alignment (`md:ml-auto` on even blocks), each block is Pill (indigo) + H3 + body + payoff line + a visual. Inside one `InView` per block with `.reveal` staggering.

1. **Builders**. Copy: hand over every new home with its record already alive: equipment, serials, and warranties from day one. Visual: `Phone` mockup with PhoneRow/PhoneKV rows (HVAC, water heater, warranty dates) and a "Day one record" tinted callout.
2. **Realtors**. Copy: list homes with a verified history attached. Visual: photo `public/images/homeowners/sold-home.jpg` (`rounded-[22px]`, ink bottom gradient, lazy) with floating PhotoChips: "Verified record", "42 jobs · 6 yrs". One coral payoff chip: "A documented home closes faster." (coral moment 1 of 2).
3. **Inspectors**. Copy: the inspection becomes the seed of a living record instead of a PDF that dies in a download folder. Visual: `Phone` mockup showing inspection findings landing as record rows.
4. **Insurers**. Copy: maintained homes are lower-risk homes. Verified service history you can actually underwrite against. Visual: Card with KV rows styled as a risk view (last service, equipment age, maintenance cadence).
5. **Home-watch firms**. Copy: log every visit to the homes you watch. Owners see the proof, you keep the contract. Visual: `Phone` mockup with a visit log ("All clear" rows, dated).

Close the section with a sixth, lighter "Someone else?" line (property managers, warranty companies, utilities) pointing at the form anchor, replacing the old dashed card.

### 4. Stat band (soft)

3-up count-up grid (`CountUp` gated on viewport entry, `text-indigo tnum`, rounded-2xl white cells). Do not repeat section 2's problem-scale numbers; this band is the partner-side cut: 30 seconds for a pro to log a job, 1 link handed over at closing, "life of the home" as the duration the record (and the partner's name on it) persists. Keep any market-size figures in section 2 only, marked illustrative there.

### 5. How partnering works (white, `id="how-it-works"`)

- SectionHead: eyebrow HOW IT WORKS, H2 "Three steps, and the record starts working for you."
- Three columns with StepBadge numerals (indigo, indigo, coral: coral moment 2 of 2):
  1. Tell us where you fit. A short note through the form below.
  2. We wire it into your workflow: closing, inspection, or handover.
  3. Every home you touch remembers you. Your name stays on the record.
- Visuals: keep this section lighter than the landing's three-phone row; simple cards or small inline illustrations are fine. Steps fill in with `.seq` timing.

### 6. FAQ (soft)

Landing-style `dl` of `.liftable` rows, each with a `?` badge in an indigobg circle. Five Q/As, terse:

- Does it cost anything? Free to start. We win when the record proves useful.
- Who owns the record? The homeowner, always. Partners contribute to it and stay visible on it.
- What do we get out of it? Your name on a living record, in front of the owner for years, plus a professional handover artifact.
- Do you sell homeowner data? Never. The record belongs to the homeowner.
- Where do you operate? Starting with St. Johns County, Florida. Tell us where you are anyway.

### 7. Become a partner (white, `id="become-a-partner"`) + closing band

- Split layout `grid md:grid-cols-[1fr_1.1fr]`: left column is persuasion copy (SectionHead left-aligned, short checklist with DrawnCheck-style rows: a reply within a couple of days, no contracts to start, you keep your workflow); right column is the form Card.
- Form: keep the existing working behavior exactly. Fields: name, company, partner type Select (Builders, Realtors, Inspectors, Insurers, Home-watch firms, Other), work email. Submit logs `logEvent(null, "partner_lead", { ...form })`. Loading state on Btn, error line in red on failure, CheckBurst done state with the submitted email echoed.
- After the form section, a final `CtaBand`: eyebrow PARTNERS, title "Give every home a memory from day one." (the old H1 lives on here), sub optional, one indigo button anchoring back to the form. If CtaBand + form adjacency feels redundant at build time, the band may use `See how it works` routing instead; builder's judgment.

## Technical notes

- Everything page-local in `src/routes/partners.tsx`: `HandoffScene`, `HandoffTimeline`, and any small helpers live in the route file, matching how how-it-works and for-homeowners keep their scenes page-local.
- Reuse existing primitives only: `MarketingShell`, `marketingHead`, `SectionHead`, `Eyebrow`, `Pill`, `Card`, `KV`, `Btn`, `Field`/`Input`/`Select`, `Phone`/`PhoneRow`/`PhoneKV`/`PhoneBtn`, `CtaBand`, `CheckBurst`, `InView` pattern, `.reveal`/`.seq`/`.draw-path`/`anim-*` utilities. No new dependencies, no new npm packages, no edits to `src/lib/ui.tsx` or `src/components/marketing.tsx` unless a strictly additive export is unavoidable.
- No new images. Reuse `sold-home.jpg` and `problem-homes.jpg`. All non-hero images `loading="lazy"`.
- `marketingHead`: title "HomesBrain partners: the record follows the home." Description updated to match the new story. Path `/partners`.
- MobileCta: pass `mobileCta={null}` as today unless MarketingShell's mobile CTA supports anchor targets cleanly; do not modify the shell for this.
- Color discipline: indigo everywhere; coral appears exactly twice (realtor payoff chip, step-3 badge); amber and red unused except form error (red).
- Accessibility: AA contrast (use `*-dark` text on tint backgrounds), `role="alert"` on the form error, reduced-motion respected by the existing CSS gates and `useReducedMotion` for any SMIL.
- Copy rules: no em dashes anywhere. Eyebrows uppercase indigo. H2s declarative two-beat sentences. Stats marked illustrative.
- Events: `partner_lead` is the only event; unchanged.

## Out of scope

- No partner-specific product surfaces, dashboards, or auth.
- No new database tables or migrations.
- No real email/SMS follow-up (compliance gate stands).
- No changes to nav or footer (both already link `/partners`).

## Verification

No test suite. Run `bun dev`, walk the full page at mobile and desktop widths, confirm scroll animations fire once, submit the form and confirm the `partner_lead` event logs and the done state renders, run `bun run lint` and `bun run build`. Update the Notion Screen inventory status for the Partners page after shipping.
