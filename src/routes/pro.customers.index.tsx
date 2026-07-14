import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Merge, Search } from "lucide-react";
import { Btn, Card, Input, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
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
  jobs: { id: string }[] | null;
};

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
        .select("id,name,phone,email,created_at,home_id,homes(address,claimed_at),jobs(id)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

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
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.homes?.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle)),
    );
  }, [customers, q]);

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
          description="Your full customer + property history in one place: visits, equipment, invoices, notes. Included with Pro."
        />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="customers">
      <ProPageHead
        eyebrow="Customers"
        title="Your customers"
        sub={`${customers.length} customer${customers.length === 1 ? "" : "s"}. Tap a card to open it.`}
      />

      {customers.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No customers yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Log your first job and your customer shows up here.
          </p>
          <div className="mt-6">
            <Link to="/pro/jobs/new">
              <Btn variant="indigo" size="lg">
                Log a job
              </Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {duplicateGroups.length > 0 && (
            <div className="anim-fade-up mb-6 space-y-3">
              {duplicateGroups.map((group) => (
                <Card key={group.survivor.id} className="!border-amber/30 !bg-amberbg !p-5">
                  <div className="flex items-center gap-4">
                    <Merge size={20} className="shrink-0 text-amber" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">Possible duplicate</div>
                      <div className="mt-0.5 truncate text-sm text-muted">{group.name}</div>
                    </div>
                    <Btn variant="amber" size="sm" onClick={() => setConfirming(group)}>
                      Review
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="anim-fade-up relative mb-6">
            <label htmlFor="customer-search" className="sr-only">
              Find a customer
            </label>
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              id="customer-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a customer by name or address"
              className="!pl-11"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="anim-fade-up d-1 text-center py-14">
              <h2 className="text-2xl tracking-tight">No customers found</h2>
              <p className="mt-2 text-sm text-muted max-w-md mx-auto">
                Nothing matches "{q.trim()}". Try a different name or address.
              </p>
              <div className="mt-6">
                <Btn variant="ghost" onClick={() => setQ("")}>
                  Clear search
                </Btn>
              </div>
            </Card>
          ) : (
            <div className="anim-fade-up d-1 space-y-3">
              {filtered.map((customer) => {
                const claimed = Boolean(customer.homes?.claimed_at);
                return (
                  <Link
                    key={customer.id}
                    to="/pro/customers/$customerId"
                    params={{ customerId: customer.id }}
                    className="block"
                  >
                    <Card
                      lift
                      className="!p-5 hover:bg-soft active:bg-line/50 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-[17px] font-bold text-ink truncate">
                            {customer.name}
                          </div>
                          <div className="mt-1 text-sm text-muted truncate">
                            {customer.homes?.address ?? "No address added"}
                          </div>
                        </div>
                        {claimed && (
                          <div className="shrink-0">
                            <Pill accent="coral">Claimed</Pill>
                          </div>
                        )}
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-muted"
                          aria-hidden="true"
                        />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
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
