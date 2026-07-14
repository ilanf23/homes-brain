import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Merge, Plus, Search } from "lucide-react";
import { Avatar, Btn, Card, Input, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { PlanLock } from "@/components/plan-lock";
import { isProEntitled } from "@/lib/plan";
import { findDuplicateGroups, mergeCustomers, type DuplicateGroup } from "@/lib/customer-merge";

export const Route = createFileRoute("/pro/customers/")({
  head: () => ({ meta: [{ title: "Customers - HomesBrain" }] }),
  component: CustomersList,
});

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  home_id: string | null;
  homes: { address: string; claimed_at: string | null } | null;
  jobs:
    | { id: string; created_at: string; next_service_date: string | null; what_done: string }[]
    | null;
};

type Derived = {
  c: CustomerRow;
  jobCount: number;
  lastJob: string | null;
  claimed: boolean;
};

function derive(c: CustomerRow): Derived {
  const jobs = c.jobs ?? [];
  const lastJob =
    jobs
      .map((j) => j.created_at)
      .sort()
      .at(-1) ?? null;
  return { c, jobCount: jobs.length, lastJob, claimed: Boolean(c.homes?.claimed_at) };
}

function CustomersList() {
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<DuplicateGroup<CustomerRow> | null>(null);
  const [merging, setMerging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id,name,phone,email,created_at,home_id,homes(address,claimed_at),jobs(id,created_at,next_service_date,what_done)",
        )
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

  const derived = useMemo(() => customers.map(derive), [customers]);

  // Same name, same home: the same person logged twice. Anything less certain
  // is left alone rather than risking a merge of two real people.
  const duplicateGroups = useMemo(() => findDuplicateGroups(customers), [customers]);

  async function runMerge(group: DuplicateGroup<CustomerRow>) {
    if (!proId) return;
    setMerging(true);
    const result = await mergeCustomers(proId, group);
    setMerging(false);
    if (!result.ok) {
      setToast("Couldn't merge. Nothing was changed.");
      return;
    }
    const removed = new Set(group.duplicates.map((c) => c.id));
    setCustomers((prev) => prev.filter((c) => !removed.has(c.id)));
    setConfirming(null);
    await logEvent(`pro:${proId}`, "customers_merged", {
      survivor_id: group.survivor.id,
      merged_ids: [...removed],
      moved_jobs: result.movedJobs,
    });
    setToast(`Merged into one ${group.name}.`);
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return derived;
    return derived.filter((d) =>
      [d.c.name, d.c.phone, d.c.email, d.c.homes?.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle)),
    );
  }, [derived, q]);

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="customers">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (!isProEntitled(pro)) {
    return (
      <ProShell pro={pro} active="customers">
        <PlanLock
          title="Customer CRM"
          description="Your full customer + property history in one place — visits, equipment, invoices, notes. Included with Pro."
        />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="customers">
      <ProPageHead
        eyebrow="Customers"
        title="Customers"
        sub={`${customers.length} customer${customers.length === 1 ? "" : "s"} · every homeowner you've logged a job for.`}
        action={
          <Link to="/pro/jobs/new">
            <Btn variant="indigo">
              <Plus size={16} /> Log a job
            </Btn>
          </Link>
        }
      />

      {customers.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No customers yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Customers are added the first time you log a job for them: name, contact, and address,
            with consent captured.
          </p>
        </Card>
      ) : (
        <>
          {duplicateGroups.map((group) => (
            <Card
              key={group.survivor.id}
              className="anim-fade-up mt-4 !bg-amberbg !border-amber/30"
            >
              <div className="flex items-center gap-3">
                <Merge size={18} className="shrink-0 text-amber" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {group.duplicates.length + 1} customers named {group.name} at the same address
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {group.address ?? "No address"} · looks like one person logged more than once
                  </div>
                </div>
                <Btn variant="amber" size="sm" onClick={() => setConfirming(group)}>
                  Merge
                </Btn>
              </div>
            </Card>
          ))}

          <div className="anim-fade-up relative mt-4 mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers"
              className="pl-10 !min-h-11"
              aria-label="Search customers"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="anim-fade-up d-1">
              <p className="text-sm text-muted">
                No customers match.{" "}
                <button
                  onClick={() => setQ("")}
                  className="font-semibold text-indigo hover:underline"
                >
                  Clear search
                </button>
              </p>
            </Card>
          ) : (
            <Card className="anim-fade-up d-1 !p-2">
              <div className="divide-y divide-line">
                {filtered.map((d) => (
                  <Link
                    key={d.c.id}
                    to="/pro/customers/$customerId"
                    params={{ customerId: d.c.id }}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-soft active:bg-line/50 transition-colors duration-150"
                  >
                    <Avatar name={d.c.name} accent="indigo" size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{d.c.name}</div>
                      <div className="text-xs text-muted truncate">
                        {d.c.homes?.address ?? "No address"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted tnum">
                        {d.jobCount} job{d.jobCount === 1 ? "" : "s"}
                        {d.lastJob ? ` · last ${formatDate(d.lastJob)}` : ""}
                      </div>
                      {d.claimed && (
                        <div className="mt-1">
                          <Pill accent="coral">Claimed</Pill>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {confirming && (
        <MergeConfirm
          group={confirming}
          busy={merging}
          onCancel={() => setConfirming(null)}
          onConfirm={() => runMerge(confirming)}
        />
      )}

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}

/* Merging deletes customer records, so say plainly what survives and what goes
   before the pro commits to it. */
function MergeConfirm({
  group,
  busy,
  onCancel,
  onConfirm,
}: {
  group: DuplicateGroup<CustomerRow>;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copies = group.duplicates.length;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm anim-fade-up sm:items-center">
      <div className="w-full rounded-t-3xl border border-line bg-paper p-5 shadow-xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="text-lg font-semibold text-ink">
          Merge {copies + 1} into one {group.name}?
        </div>
        <div className="mt-1 text-sm text-muted">{group.address ?? "No address"}</div>

        <ul className="mt-4 space-y-2 text-sm text-ink">
          <li>
            All {group.jobCount} job{group.jobCount === 1 ? "" : "s"} and any invoices move to the
            original {group.name}.
          </li>
          <li>
            The {copies} duplicate record{copies === 1 ? "" : "s"} {copies === 1 ? "is" : "are"}{" "}
            deleted. This can't be undone.
          </li>
        </ul>

        <Btn variant="amber" size="lg" className="mt-5 w-full" loading={busy} onClick={onConfirm}>
          Merge into one
        </Btn>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="mt-3 w-full py-2 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
