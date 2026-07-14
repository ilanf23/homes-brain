# Equipment resolution in log-a-job

**Date:** 2026-07-14
**Status:** Approved, ready for implementation plan

## Problem

When a pro logs a job on a unit that HomesBrain already knows about, the app does not reliably attach the job to that unit. Two failures, one of them structural:

1. **The unit roster is keyed on the customer, not the home.** `pro.jobs.new.tsx:568` loads equipment only when the pro picks an *existing customer*. But a home is keyed by address and is shared across pros. A plumber invited by a homeowner types the address as a new customer and never sees the water softener the water-treatment pro logged. They retype it, and a duplicate `equipment` row lands on a home that already knew that unit. This is the `second_pro_added` moment, and today it is the one place the unit history is invisible.

2. **HomesBrain AI cannot resolve which appliance the pro means.** `extract-job` receives only `(note, trade)`. It never sees what is on the home, so "replaced the sediment filter on the softener" can only come back as free-text `type: "Water softener"` and become a *new* unit, even when a Kinetico K5 is already on file.

## Principle

The AI does not need certainty, because the pro is standing at the unit. The existing "Which unit did you service?" picker is already the confirmation surface. So the goal is not "make the AI infer the appliance"; it is "the AI narrows to a proposal, the pro confirms with a tap."

This sets the safety bar: a wrong silent bind corrupts the service history, which is the product asset. One extra tap is cheap. A poisoned record is not. **Never auto-attach on weak evidence.**

## Design

### Part 1: roster keyed on the home

Existing units must be available as soon as the app knows the *address*, not only when an existing customer is picked.

- Add a security-definer RPC `home_units_for_address(p_address text)` returning a thin roster for the matching home: `id, type, make, model, warranty_until, attributes, last_job_at, job_count`.
- It returns **unit identity only**. Never the other pro's job notes, never their business name or identity. A pro learns *what is in the home*, not *who worked on it or what they wrote*.
- The RPC is needed because of a chicken-and-egg in RLS: `pro_serves_home` (migration `20260708132724`) requires the pro to already have a customer, job, or created-home on that home. A pro new to the home fails all three, so a direct `equipment` SELECT returns nothing until *after* the customer row is inserted. The RPC is the deliberate, narrow exception.
- Client: drive the roster load off the resolved address (existing customer's home, Places pick, or typed address), not off `selectedCustomerId`. The "Which unit did you service?" picker then appears for repeat homes *and* for new-customer-at-known-address.

### Part 2: entity resolution in `extract-job`

Pass the roster into the prompt. A home has a handful of units, so this is a short-list match in-prompt. No embeddings, no vector store.

**Request** gains an optional `units` array: `[{ id, type, make, model }]`.

**Response** gains a resolution block:

```
"equipment_ref": {
  "matched_id": <id from the supplied units array> | null,
  "confidence": "high" | "low",
  "reason": short human string, e.g. "only softener on file"
}
```

`type` / `make` / `model` keep their current meaning: the details of the unit being described, whether matched or new. When `matched_id` is null the caller treats them as a new unit, exactly as today.

Confidence mostly falls out of cardinality. One softener on file and the pro says "the softener" is `high`. Two softeners and a bare "the softener" is `low`, and the AI must return `matched_id: null` rather than guess. When the note names a make, model, or serial that pins a single unit, that is `high` regardless of cardinality.

### Part 3: behavior

Four rules, in priority order:

1. **The tap is ground truth.** If the pro already picked a unit, resolution is done. The AI fills blank detail fields *within that unit* and must never propose a different unit or a new one. Suppress `equipment_ref` handling entirely when `selectedEquipmentId` is set.
2. **Confident match, nothing picked:** pre-select the unit in the picker and show a reversible confirmation, e.g. "Matched to your Kinetico K5, last serviced Mar 12" with an undo. The record is right by default and the pro can override with one tap.
3. **Ambiguous (`low` confidence, or several candidates):** open the picker with the best guess visually highlighted but **not** selected. No auto-attach. The pro taps.
4. **No candidate:** new unit, extract into the equipment fields exactly as today.

### Part 4: two prompt traps

- **Consumables are not units.** "Replaced the sediment filter on the softener" must bind to the *softener*. The sediment filter is `what_done`. Naive type extraction will happily mint a "Sediment filter" equipment row. The prompt must instruct the model to identify the durable installed unit, never the part or consumable that was worked on.
- **A correction must not clobber.** "It's actually the K5 Plus" on a matched unit proposes a change through "Correct unit details" (open the drawer, prefill the new value, let the pro confirm). It never silently overwrites the `equipment` row. This respects the existing `editDetails` gate at `pro.jobs.new.tsx:1383`.

## Out of scope

- Provenance on unit edits (who changed the serial, when). Real gap, tracked separately.
- Dedupe of units the pro types by hand while skipping the picker. The roster fix removes most of the cause; a matching safety net can follow if duplicates persist.
- Serial-based auto-match from the nameplate scan. Natural follow-on once `equipment_ref` exists.

## Events

- `equipment_matched` with props `{ confidence, source: "ai" | "tap", reason }` on a resolved attach.
- Extend the existing `notes_extracted` props to record whether a match was proposed.

## Success criteria

- A pro new to a claimed home sees the units already on file, before they have logged anything there.
- Dictating "serviced the softener" on a home with one softener attaches the job to that `equipment_id`, with a visible, reversible confirmation.
- Dictating the same on a home with two softeners attaches nothing automatically and asks.
- No new `equipment` row is created for a unit already on the home unless the pro explicitly chooses "new unit".
