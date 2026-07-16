# Customers with multiple homes: normalize and dedupe

Date: 2026-07-16. Approved by Ilan.

## Problem

`customers` has a required single `home_id`, so the model says one customer = one home. When the same person has two properties served by the same pro, log-a-job does one of three bad things:

1. Silent dedupe path (phone/email match): adopts the existing customer and files the job under their first home, discarding the address the pro confirmed. The job lands on the wrong house.
2. Selected-customer path with a different confirmed address: updates the old home's address in place, merging two physical houses into one home record and corrupting its history.
3. If neither path triggers (slightly different name, no phone), a duplicate customer row is created. The existing merge tool only groups same-name-at-same-home, so it never offers these.

## Decision

A customer is a person (one row per pro + person). Homes hang off jobs: `jobs` already carry both `customer_id` and `home_id`, so a person's homes are the distinct homes of their jobs, with `customers.home_id` kept as the first/primary home. No new tables.

Product rule (confirmed): when a known customer's confirmed address differs from what is on file, treat it as a second property. "They moved / fix a typo" is an explicit edit on the customer page, never an implicit side effect of logging a job.

## Changes

### 1. Log-a-job (root cause), `src/routes/pro.jobs.new.tsx`

- Dedupe path: stop forcing `homeId = c.home_id`. After the pro confirms the address, if it differs (normalized) from the home on file, call `upsert_home_by_address` and attach the job (and any new equipment) to that home. Geocode it.
- Selected-customer path: same rule. Never mutate `homes.address` from this flow.
- Equipment reuse lists must follow the resolved home, not the customer's primary home.

### 2. Dedupe tooling, `src/lib/customer-merge.ts`

- Extend `findDuplicateGroups` to also group a pro's customers by identical contact identity (normalized phone, or trimmed lowercased email) across different homes. Name-based grouping stays same-home-only.
- The merge itself already repoints `jobs` and `invoices` and backfills contact fields; unchanged. Survivor stays the oldest row; its `home_id` remains the primary home. Group display gains multiple addresses.
- The "possible duplicates" card on `pro.customers.index.tsx` picks this up.

### 3. One-time data dedupe, SQL migration

Per pro, auto-merge the unambiguous cases: identical normalized phone (last 10 digits, at least 7 digits), then identical lowercased email. Survivor = earliest `created_at`. Repoint `jobs.customer_id` and `invoices.customer_id`, backfill missing phone/email onto the survivor, delete the losers. Fuzzy cases stay in the in-app merge card where the pro confirms.

### 4. Pro UI catch-up

- `pro.customers.index.tsx`: derive each customer's homes from their jobs; show all addresses (primary plus "+N more").
- `pro.customers.$customerId.tsx`: list all homes; fetch jobs by `customer_id`; equipment across all their home ids.
- `pro.invoices.new.tsx`: when the customer has more than one home, let the pro pick (default: most recent job's home).
- `pro.office.tsx`: attach customers to jobs via `customer_id`, not a home_id map.

## Known limitation

Jobs already filed under the wrong house by the silent-dedupe bug cannot be auto-repaired: the address the pro typed was never saved. Fixable by hand per job.

## Out of scope

Homeowner-side data (one `homeowners` row per auth user, already correct), payments, real messaging, schema constraints on phone uniqueness.
