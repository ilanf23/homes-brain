## Goal

When a pro speaks/types something like "it cost $145" during AI capture, that amount should automatically populate the "Charge for this job" field in the review section, which drives invoice creation.

## Changes

### 1) `supabase/functions/extract-job/index.ts`
Add a `charge_amount` field (number | null) to both prompts (`SYSTEM_WORK` and `SYSTEM_FULL`):
- Instruct model to extract a dollar amount only when clearly stated as the cost/price/charge/total for the job (e.g. "charged 145", "it was 220 bucks", "$89.50 total"). Never invent. Return as a plain number (no currency symbol), or null.
- Add sanitization: coerce to a finite positive number, else null. Include in both response payloads.

### 2) `src/lib/capture.ts`
Extend `JobExtract` (and inherited `FullJobExtract`) with `charge_amount: number | null`.

### 3) `src/routes/pro.jobs.new.tsx`
Only prefill when the pro hasn't already typed a charge (don't clobber). In both extraction sites:
- `runExtract` (~line 710): if `r.charge_amount` is a positive number and `chargeAmount` is empty, `setChargeAmount(String(r.charge_amount))` and push `"charge"` into the filled list so the "AI filled X" indicator mentions it.
- `extractFullJob` handler (~line 918+): same guard, set `chargeAmount` from `extract.charge_amount`, add to the analytics `logEvent` filled-fields list.

No changes to invoice creation logic itself — it already reads `chargeAmount` state at submit. No DB, RLS, or edge-function-secret changes.

## Out of scope
- Voice/AI capture on the homeowner side (this is the pro's job-logging flow, which the user referred to as "homeowner AI" — the AI that creates the homeowner record).
- Multi-line invoice items. Single line, description = the work performed, amount = extracted charge (existing behavior).
