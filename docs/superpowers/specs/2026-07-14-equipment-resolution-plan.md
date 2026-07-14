# Implementation plan: equipment resolution in log-a-job

Spec: `2026-07-14-equipment-resolution-design.md`

Touches `pro.jobs.new.tsx`, `extract-job`, `capture.ts`, and one new migration. Deliberately avoids `pro.customers.index.tsx` and `customer-merge.ts`, which have uncommitted work from a parallel session.

## Step 1: migration, address-keyed unit roster

New migration adding `home_units_for_address(p_address text)`, security definer, granted to `authenticated` only (never `anon`).

Returns one row per unit on the home matching that address: `id, type, make, model, warranty_until, attributes, last_job_at, job_count`.

Returns unit identity only. No job notes, no pro identity. Guard with `my_pro_id() IS NOT NULL` so only a signed-in pro can call it, and return zero rows rather than erroring when the address is unknown.

This exists because `pro_serves_home` requires an existing customer/job/created-home on the home, which a pro new to the address does not have. A direct `equipment` SELECT returns nothing until after the customer row is inserted.

## Step 2: client roster load keyed on address

In `pro.jobs.new.tsx`, the roster effect at ~:568 currently keys off `selectedCustomerId` and reads `equipment` directly. Rekey it on the **resolved address** (the same expression as `previewAddress` at ~:821: `selectedCustomerId ? locAddress : newCustomer.address`), debounced, calling the RPC.

Keep the existing shape of `ApplianceOpt` so the picker UI needs no changes. Clear `selectedEquipmentId` when the address changes.

## Step 3: `extract-job` resolution contract

Accept an optional `units: [{id, type, make, model}]` in the request body. When present, inject the roster into the system prompt and require an `equipment_ref` in the response:

```
"equipment_ref": { "matched_id": <id or null>, "confidence": "high" | "low", "reason": string }
```

Prompt rules:
- Match only against the supplied ids. Never invent an id.
- One plausible candidate, or a make/model/serial that pins a single unit, is `high`. Anything vaguer, or two candidates of the same type, is `low` and `matched_id` must be null.
- Identify the **durable installed unit**, never the consumable or part worked on. "Replaced the sediment filter on the softener" is the *softener*; the filter is `what_done`.

Validate server-side: drop `matched_id` if it is not in the supplied roster.

## Step 4: `capture.ts` types

`extractFromNotes(note, trade, units?)` passes the roster. `JobExtract` gains `equipment_ref: EquipmentRef | null`. Same for `extractFullJob`.

## Step 5: behavior in `runExtract`

Four rules, in priority order:

1. If `selectedEquipmentId` is set, ignore `equipment_ref` entirely. The tap is ground truth. Keep today's fill-blanks-only behavior.
2. `matched_id` set and `confidence === "high"`: set `selectedEquipmentId`, show a reversible confirmation ("Matched to your Kinetico K5", undo clears it).
3. `matched_id` null but the roster is non-empty and the note described a unit: reveal the picker, no auto-attach.
4. Roster empty or no unit described: today's behavior exactly.

A note that corrects a matched unit does not overwrite. Fills go through the existing `editDetails` drawer.

## Step 6: events

`equipment_matched` with `{ confidence, source: "ai" | "tap", reason }`. Extend `notes_extracted` props with whether a match was proposed.

## Verification

`bun run build`, then drive the flow on the dev server:
- Repeat home, one softener, dictate "serviced the softener" → auto-matched, undo works.
- Two softeners → nothing auto-attached, picker shown.
- New pro at a known address (new customer, existing home) → roster appears.
- "Replaced the sediment filter on the softener" → binds to the softener, mints no "Sediment filter" unit.
