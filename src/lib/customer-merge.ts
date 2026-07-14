/* Cleaning up customers that were already duplicated.

   Prevention lives in customer-match.ts; this is the mop for records created
   before it, or by hand. Merging is destructive, so it is deliberately narrow:
   only customers with the same name AT THE SAME HOME are ever offered as
   duplicates. Two different Bobs at two addresses are two people, and this will
   not touch them. */
import { supabase } from "@/integrations/supabase/client";
import { normalizedName } from "@/lib/customer-match";

export type MergeableCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  home_id: string | null;
  homes: { address: string } | null;
  jobs: { id: string }[] | null;
};

export type DuplicateGroup<T> = {
  /* The record everything is merged into: the oldest, i.e. the original. */
  survivor: T;
  duplicates: T[];
  name: string;
  address: string | null;
  jobCount: number;
};

/* Group a pro's customers into sets that are unmistakably one person. A group
   only forms with 2+ members, so the caller can show nothing when all is well. */
export function findDuplicateGroups<T extends MergeableCustomer>(
  customers: T[],
): DuplicateGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const c of customers) {
    const name = normalizedName(c.name);
    // No name or no home means we cannot be sure it is the same person.
    if (!name || !c.home_id) continue;
    const key = `${c.home_id}::${name}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  }

  const groups: DuplicateGroup<T>[] = [];
  for (const members of buckets.values()) {
    if (members.length < 2) continue;
    // Oldest first: the original record survives, later copies fold into it.
    const ordered = [...members].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const [survivor, ...duplicates] = ordered;
    groups.push({
      survivor,
      duplicates,
      name: survivor.name,
      address: survivor.homes?.address ?? null,
      jobCount: ordered.reduce((sum, c) => sum + (c.jobs?.length ?? 0), 0),
    });
  }
  return groups;
}

export type MergeResult = { ok: true; movedJobs: number } | { ok: false; error: string };

/* Fold the duplicates into the survivor.

   Order matters: every row that points at a duplicate is repointed BEFORE the
   duplicate is deleted. If a step fails we stop and report, leaving the jobs
   attached to a customer that still exists. The failure mode is a merge that
   did not finish, never a job that lost its customer. */
export async function mergeCustomers<T extends MergeableCustomer>(
  proId: string,
  group: DuplicateGroup<T>,
): Promise<MergeResult> {
  const survivorId = group.survivor.id;
  const loserIds = group.duplicates.map((c) => c.id);
  if (loserIds.length === 0) return { ok: true, movedJobs: 0 };

  const { data: moved, error: jobsErr } = await supabase
    .from("jobs")
    .update({ customer_id: survivorId })
    .eq("pro_id", proId)
    .in("customer_id", loserIds)
    .select("id");
  if (jobsErr) return { ok: false, error: jobsErr.message };

  const { error: invoicesErr } = await supabase
    .from("invoices")
    .update({ customer_id: survivorId })
    .eq("pro_id", proId)
    .in("customer_id", loserIds);
  if (invoicesErr) return { ok: false, error: invoicesErr.message };

  // Keep contact details the duplicates picked up along the way.
  const patch: { phone?: string; email?: string } = {};
  if (!group.survivor.phone?.trim()) {
    const phone = group.duplicates.find((c) => c.phone?.trim())?.phone;
    if (phone) patch.phone = phone;
  }
  if (!group.survivor.email?.trim()) {
    const email = group.duplicates.find((c) => c.email?.trim())?.email;
    if (email) patch.email = email;
  }
  if (Object.keys(patch).length) {
    const { error: patchErr } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", survivorId)
      .eq("pro_id", proId);
    if (patchErr) return { ok: false, error: patchErr.message };
  }

  // Safe now: the duplicates own nothing.
  const { error: deleteErr } = await supabase
    .from("customers")
    .delete()
    .eq("pro_id", proId)
    .in("id", loserIds);
  if (deleteErr) return { ok: false, error: deleteErr.message };

  return { ok: true, movedJobs: moved?.length ?? 0 };
}
