import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar, Btn, Card, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

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
  homes: { address: string; claimed_at: string | null } | null;
  jobs: { id: string; created_at: string }[] | null;
};

function CustomersList() {
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,name,phone,email,created_at,homes(address,claimed_at),jobs(id,created_at)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.email, c.homes?.address]
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

  return (
    <ProShell pro={pro} active="customers">
      <ProPageHead
        eyebrow="Customers"
        title="Customers"
        sub="Every homeowner you've logged a job for. Their home records live here."
      />

      {customers.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No customers yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Customers are added the first time you log a job for them: name, contact, and address,
            with consent captured.
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
          <div className="anim-fade-up relative mb-4 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, contact, or address"
              className="pl-9"
              aria-label="Search customers"
            />
          </div>

          <Card className="anim-fade-up d-1 !p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted p-4">No customers match "{q.trim()}".</p>
            ) : (
              <div className="divide-y divide-line">
                {filtered.map((c) => {
                  const jobCount = c.jobs?.length ?? 0;
                  const lastJob = c.jobs
                    ?.map((j) => j.created_at)
                    .sort()
                    .at(-1);
                  return (
                    <Link
                      key={c.id}
                      to="/pro/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-soft active:bg-line/50 transition-colors duration-150"
                    >
                      <Avatar name={c.name} accent="indigo" size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{c.name}</div>
                        <div className="text-xs text-muted truncate">
                          {c.homes?.address ?? "No address"}
                        </div>
                      </div>
                      <div className="hidden sm:block text-xs text-muted font-mono tnum">
                        {c.phone ?? c.email ?? ""}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted tnum">
                          {jobCount} job{jobCount === 1 ? "" : "s"}
                          {lastJob ? ` · last ${formatDate(lastJob)}` : ""}
                        </div>
                        {c.homes?.claimed_at && (
                          <div className="mt-1">
                            <Pill accent="coral">Claimed</Pill>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </ProShell>
  );
}
