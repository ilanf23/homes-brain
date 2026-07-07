## The gap

Right now, every time you log a job you type appliance details (type/make/model/serial) and we create a **brand-new `equipment` row**, even if it's the same water heater you serviced three months ago. So the same physical unit ends up as three separate rows with three isolated one-visit histories. There's no "this softener's life story."

The schema already supports what you want — `jobs.equipment_id` links every job to one appliance, and `equipment.home_id` groups them per home. The fix is UX + one detail view. No new tables.

## What changes

### 1. Log-a-job → "The work" step

When the pro has picked an **existing customer** (or typed an address that matches an existing home), load that home's appliances and show them first:

```text
Which appliance?
┌──────────────────────────────────────────┐
│ ◉  Water heater · Rheem XE50 · #4471    │
│    Last serviced Mar 12 · 2 jobs         │
├──────────────────────────────────────────┤
│ ○  Softener · Culligan HE · #22A         │
│    Last serviced Jun 3 · 1 job           │
├──────────────────────────────────────────┤
│ ○  + Add a new appliance                 │
└──────────────────────────────────────────┘
```

- Pick an existing one → new job attaches to that `equipment_id`. Type/make/model/serial fields hide (already known) but stay editable behind a "correct details" toggle.
- Pick "Add new" → current flow (type/make/model/serial + optional scan).
- Brand-new customer/home → skip the picker, go straight to "Add new" (nothing to pick from yet).

### 2. Show the appliance's history inline while logging

Under the picker, once an existing appliance is selected, show a compact timeline so the pro can see what was done last time before writing the new job:

```text
Rheem XE50 · installed unknown · warranty until 2027-04
  Jun 12 2026  Flushed tank, replaced anode rod        (you)
  Mar 12 2026  Annual inspection, replaced T&P valve   (you)
```

### 3. Appliance detail = life story

- **Pro side** (`/pro/customers/:customerId`, and a new `/pro/appliances/:equipmentId`): each appliance shows its own timeline of every job across every visit, plus install date, warranty, recall status, next-service due.
- **Homeowner side**: `/home/items/:itemId` already exists — wire it to show the full job history for that appliance (not just the most recent record). Same timeline component.

### 4. Data model — no new tables

We reuse what's there:
- `equipment` = the appliance (one row per physical unit, keyed by home).
- `jobs.equipment_id` = every visit that touched it.
- The "usage record for the next life" = ordered list of `jobs` filtered by `equipment_id`.

Small additions:
- Deduping helper: when the pro types serial/model on an existing home, if a matching `equipment` row already exists we suggest reusing it instead of creating a duplicate.
- Optional `install_date` column on `equipment` (nullable, edit later) so the timeline can show age. Not required to ship.

## Technical notes

- `src/routes/pro.jobs.new.tsx`: after `existing` customers load, when a customer/home is selected fetch `equipment` for that `home_id` and render the picker above the current appliance fields. Store `selectedEquipmentId | "new"` in state; only insert into `equipment` when `"new"`.
- New tiny query helper `getHomeAppliancesWithLastJob(homeId)` returning `{id, type, make, model, serial, warranty_until, last_job_at, job_count}`.
- New route `src/routes/pro.appliances.$equipmentId.tsx` for the pro-side appliance detail (list of jobs, edit metadata, mark decommissioned).
- Update `src/routes/home.items.$itemId.tsx` to render the full job list for that equipment (data path already exists via `get_home_view` — add jobs-per-equipment there or a dedicated query).
- No migration required to ship the picker + histories. `install_date` column can be added later as an incremental migration.

## What this does not touch

- Send-to-homeowner flow, Resend wiring, claim page — unchanged.
- The mocked-session posture — unchanged.
- Homeowner-added appliances (`source: "homeowner"`) — same table, they show in the picker too if the address matches.
