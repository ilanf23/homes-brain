# CoreLoopScene — animated hero that tells the HomesBrain story

**Date:** 2026-07-05
**Status:** Approved
**Replaces:** `HouseScene` in `src/components/svg.tsx` (all three call sites)

## Problem

The current homepage hero illustration (`HouseScene`) is a static line-drawn house with three
floating icon nodes that dim/brighten as the core-loop text rotates. It is abstract, mostly
motionless, and does not communicate what HomesBrain does. It is also reused at small sizes on
the claim page and the pro dashboard empty state.

## Goal

Replace it with an animated scene that plays out the core loop — pro logs a job → branded
record is sent → homeowner claims it and the home's history grows — in sync with the existing
rotating hero text, plus quiet static variants for the two small call sites.

## Concept decisions (made with user)

- **Story:** the core loop, played out as a continuous synced animation.
- **Style:** line-art house as the SVG anchor; moving pieces are miniature real-looking HTML UI
  cards (white cards, line borders, KV rows, brand-tinted chips).
- **Scope:** all three `HouseScene` usages — full scene on the homepage hero, compact static
  poses on `/claim/:id` and the `/pro` dashboard empty state.
- **Technique:** state-driven SVG + CSS. No new dependencies. Choreography driven by the same
  `loopStep` React state that rotates the hero text, so text and scene cannot drift.

## The scene

A hybrid component: relative container with an SVG line-art house layer (same sketch language
as today, slightly simplified) and absolutely-positioned HTML overlay cards.

### Choreography (one phase per 3.5s text step)

1. **Pro (teal).** A mini job card slides up beside the house: teal wrench chip, two KV rows
   type in ("Water heater — annual flush", "Next service · Jan 2027"), then a teal
   "Send record" pill pulses once.
2. **Record (indigo).** The job card condenses into a small branded record chip that travels
   along a self-drawing dashed arc over the roof toward a phone outline on the right. The house
   window pulses indigo as it passes.
3. **Homeowner (coral).** The chip lands in the phone, which flips to "Claim your home — free"
   with a coral tap ripple; a checkmark draws itself; a new row stamps into a small history
   timeline anchored under the house.

Each full cycle the timeline gains a row, capped at 3 with the oldest fading out — the idle
animation itself communicates "a Carfax that writes itself."

**Reduced motion:** static tableau showing all three elements at once (job card, record chip
mid-arc, claimed timeline). No movement. Respects the same `prefers-reduced-motion` behavior as
the existing text-rotation guard, via CSS `@media (prefers-reduced-motion: reduce)`.

### Compact variants

`variant="compact"` renders a single static pose, no story loop:

- **`pose="owner"`** (claim page): house + coral claimed-check + two timeline rows. When the
  visitor enters contact info (the moment the page currently sets `active="owner"`), the check
  draws itself once, then stays still.
- **`pose="pro"`** (pro dashboard empty state): house + the teal mini job card, static.

## Technical shape

- New file: `src/components/core-loop-scene.tsx`.
- Keyframes added to the global stylesheet next to the existing `anim-*` utilities.
- API:
  - Hero: `<CoreLoopScene step={active.key} />` where `step` is `"pro" | "record" | "owner"`.
  - Compact: `<CoreLoopScene variant="compact" pose="owner" />` (pose: `"pro" | "owner"`).
- Per-phase choreography via CSS classes keyed on `step`, with keyed sub-elements
  (`key={step}`) so CSS keyframe animations restart cleanly on each phase change.
- Brand color roles per CLAUDE.md are strict: teal = pro, indigo = record/brand,
  coral = homeowner. Never mixed.
- Hero keeps the current responsive behavior (`hidden sm:block`).
- `HouseScene` is deleted from `src/components/svg.tsx` once all three call sites
  (`src/routes/index.tsx`, `src/routes/claim.$recordId.tsx`, `src/routes/pro.index.tsx`) are
  migrated.

## Testing / verification

- Run the dev server and visually verify: homepage hero (all three phases, timeline growth,
  sync with rotating text), claim page pose + one-shot check animation, pro dashboard compact
  pose.
- Verify reduced-motion renders the static tableau (OS setting or DevTools emulation).
- Verify mobile: hero scene hidden below `sm`, compact variants still fit their containers.
- No console errors; no layout shift from the overlay cards.
