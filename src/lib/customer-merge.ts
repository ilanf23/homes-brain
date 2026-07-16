/* Cleaning up customers that were already duplicated.

   Prevention lives in customer-match.ts and the log-a-job silent dedupe; this
   is the mop for records created before them, or by hand. Merging is
   destructive, so a group only forms where the rows are unmistakably one
   person:

   - the same phone or email, at any address: contact details are identity in
     this app (the silent dedupe already treats them that way), and one person
     can hold several properties, so these groups span homes.
   - the same name AT THE SAME HOME: two different Bobs at two addresses are
     two people, and this will not touch them. */
import { supabase } from "@/integrations/supabase/client";
import { normalizedName, normalizedPhone } from "@/lib/customer-match";

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
  /* Every distinct address across the group, survivor's first. More than one
     means the same person with several properties. */
  addresses: string[];
  jobCount: number;
};

/* Group a pro's customers into sets that are unmistakably one person. A group
   only forms with 2+ members, so the caller can show nothing when all is well.

   Union-find over shared identity keys: a row that matches one sibling by
   phone and another by name-at-home lands in a single group, not two. */
export function findDuplicateGroups<T extends MergeableCustomer>(
  customers: T[],
): DuplicateGroup<T>[] {
  const parent = customers.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  const owners = new Map<string, number>();
  customers.forEach((c, i) => {
    const keys: string[] = [];
    const phone = normalizedPhone(c.phone);
    if (phone) keys.push(`phone::${phone}`);
    const email = c.email?.trim().toLowerCase();
    if (email) keys.push(`email::${email}`);
    const name = normalizedName(c.name);
    // Name alone only counts at the same home; without one we cannot be sure
    // it is the same person.
    if (name && c.home_id) keys.push(`home-name::${c.home_id}::${name}`);
    for (const key of keys) {
      const owner = owners.get(key);
      if (owner === undefined) owners.set(key, i);
      else union(owner, i);
    }
  });

  const components = new Map<number, T[]>();
  customers.forEach((c, i) => {
    const root = find(i);
    const bucket = components.get(root);
    if (bucket) bucket.push(c);
    else components.set(root, [c]);
  });

  const groups: DuplicateGroup<T>[] = [];
  for (const members of components.values()) {
    if (members.length < 2) continue;
    // Oldest first: the original record survives, later copies fold into it.
    const ordered = [...members].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const [survivor, ...duplicates] = ordered;
    const addresses = [
      ...new Set(ordered.map((c) => c.homes?.address).filter((a): a is string => !!a)),
    ];
    groups.push({
      survivor,
      duplicates,
      name: survivor.name,
      addresses,
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
   did not finish, never a job that lost its customer.

   Jobs keep their own home_id, so a cross-home merge preserves which house
   each visit happened at; the survivor's home_id stays their primary home. */
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
