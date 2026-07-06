import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Avatar, Btn, Card, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { FilterSelect, SortableTh, UnderlineTabs } from "@/components/crm";
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
  jobs: { id: string; created_at: string; next_service_date: string | null }[] | null;
};

type SortKey =
  | "name"
  | "address"
  | "phone"
  | "jobs"
  | "lastJob"
  | "nextService"
  | "status"
  | "created";
type TabKey = "all" | "claimed" | "unclaimed" | "due";

const DAY = 24 * 3600 * 1000;
const PAGE_SIZE = 25;

type Derived = {
  c: CustomerRow;
  jobCount: number;
  lastJob: string | null;
  nextService: string | null;
  claimed: boolean;
  due: boolean;
};

function derive(c: CustomerRow): Derived {
  const jobs = c.jobs ?? [];
  const lastJob =
    jobs
      .map((j) => j.created_at)
      .sort()
      .at(-1) ?? null;
  const nextService =
    jobs
      .map((j) => j.next_service_date)
      .filter((d): d is string => Boolean(d))
      .sort()[0] ?? null;
  const due = nextService != null && new Date(nextService).getTime() <= Date.now() + 30 * DAY;
  return {
    c,
    jobCount: jobs.length,
    lastJob,
    nextService,
    claimed: Boolean(c.homes?.claimed_at),
    due,
  };
}

function compare(a: Derived, b: Derived, key: SortKey): number {
  const str = (x: string | null | undefined) => (x ?? "").toLowerCase();
  const date = (x: string | null) => (x ? new Date(x).getTime() : Number.NEGATIVE_INFINITY);
  switch (key) {
    case "name":
      return str(a.c.name).localeCompare(str(b.c.name));
    case "address":
      return str(a.c.homes?.address).localeCompare(str(b.c.homes?.address));
    case "phone":
      return str(a.c.phone ?? a.c.email).localeCompare(str(b.c.phone ?? b.c.email));
    case "jobs":
      return a.jobCount - b.jobCount;
    case "lastJob":
      return date(a.lastJob) - date(b.lastJob);
    case "nextService":
      return date(a.nextService) - date(b.nextService);
    case "status":
      return Number(a.claimed) - Number(b.claimed);
    case "created":
      return date(a.c.created_at) - date(b.c.created_at);
  }
}

function CustomersList() {
  const navigate = useNavigate();
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [claimedFilter, setClaimedFilter] = useState("any");
  const [lastJobFilter, setLastJobFilter] = useState("any");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "created",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id,name,phone,email,created_at,homes(address,claimed_at),jobs(id,created_at,next_service_date)",
        )
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

  useEffect(() => {
    setPage(0);
  }, [tab, claimedFilter, lastJobFilter, q, sort]);

  const derived = useMemo(() => customers.map(derive), [customers]);

  const tabCounts = useMemo(
    () => ({
      all: derived.length,
      claimed: derived.filter((d) => d.claimed).length,
      unclaimed: derived.filter((d) => !d.claimed).length,
      due: derived.filter((d) => d.due).length,
    }),
    [derived],
  );

  const filtered = useMemo(() => {
    let rows = derived;
    if (tab === "claimed") rows = rows.filter((d) => d.claimed);
    if (tab === "unclaimed") rows = rows.filter((d) => !d.claimed);
    if (tab === "due") rows = rows.filter((d) => d.due);
    if (claimedFilter !== "any")
      rows = rows.filter((d) => d.claimed === (claimedFilter === "claimed"));
    if (lastJobFilter !== "any") {
      const days = Number(lastJobFilter);
      rows = rows.filter(
        (d) => d.lastJob != null && Date.now() - new Date(d.lastJob).getTime() <= days * DAY,
      );
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((d) =>
        [d.c.name, d.c.phone, d.c.email, d.c.homes?.address]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle)),
      );
    }
    return rows;
  }, [derived, tab, claimedFilter, lastJobFilter, q]);

  const sorted = useMemo(() => {
    const rows = [...filtered].sort((a, b) => compare(a, b, sort.key));
    if (sort.dir === "desc") rows.reverse();
    return rows;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const filtersActive = claimedFilter !== "any" || lastJobFilter !== "any" || q.trim() !== "";

  function clearAll() {
    setClaimedFilter("any");
    setLastJobFilter("any");
    setQ("");
    setPage(0);
  }

  function onSort(key: string) {
    setSort((s) =>
      s.key === key
        ? { key: s.key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key: key as SortKey, dir: "asc" },
    );
  }

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
          <div className="anim-fade-up">
            <UnderlineTabs
              tabs={[
                { key: "all", label: "All", count: tabCounts.all },
                { key: "claimed", label: "Claimed", count: tabCounts.claimed },
                { key: "unclaimed", label: "Unclaimed", count: tabCounts.unclaimed },
                { key: "due", label: "Due for service", count: tabCounts.due },
              ]}
              active={tab}
              onChange={(k) => setTab(k as TabKey)}
            />
          </div>

          <div className="anim-fade-up d-1 mt-4 mb-4 flex items-center gap-4 flex-wrap">
            <FilterSelect
              label="Claimed"
              value={claimedFilter}
              onChange={setClaimedFilter}
              options={[
                { value: "any", label: "Any" },
                { value: "claimed", label: "Claimed" },
                { value: "unclaimed", label: "Unclaimed" },
              ]}
            />
            <FilterSelect
              label="Last job"
              value={lastJobFilter}
              onChange={setLastJobFilter}
              options={[
                { value: "any", label: "Any time" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "365", label: "Last year" },
              ]}
            />
            {filtersActive && (
              <button
                onClick={clearAll}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                Clear all
              </button>
            )}
            <div className="relative ml-auto w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, contact, or address"
                className="pl-9 !min-h-10"
                aria-label="Search customers"
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <Card className="anim-fade-up d-1">
              <p className="text-sm text-muted">
                No customers match.{" "}
                <button onClick={clearAll} className="font-semibold text-indigo hover:underline">
                  Clear all
                </button>
              </p>
            </Card>
          ) : (
            <>
              {/* Desktop: CRM table */}
              <Card className="anim-fade-up d-1 !p-0 overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-line">
                      <tr>
                        <SortableTh
                          label="Name"
                          sortKey="name"
                          sort={sort}
                          onSort={onSort}
                          className="pl-5"
                        />
                        <SortableTh
                          label="Home address"
                          sortKey="address"
                          sort={sort}
                          onSort={onSort}
                        />
                        <SortableTh label="Phone" sortKey="phone" sort={sort} onSort={onSort} />
                        <SortableTh label="Jobs" sortKey="jobs" sort={sort} onSort={onSort} />
                        <SortableTh
                          label="Last job"
                          sortKey="lastJob"
                          sort={sort}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Next service"
                          sortKey="nextService"
                          sort={sort}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Status"
                          sortKey="status"
                          sort={sort}
                          onSort={onSort}
                          className="pr-5"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((d) => (
                        <tr
                          key={d.c.id}
                          onClick={() =>
                            navigate({
                              to: "/pro/customers/$customerId",
                              params: { customerId: d.c.id },
                            })
                          }
                          className="cursor-pointer hover:bg-soft transition-colors"
                        >
                          <td className="pl-5 pr-3 py-3">
                            <Link
                              to="/pro/customers/$customerId"
                              params={{ customerId: d.c.id }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2.5 min-w-0"
                            >
                              <Avatar name={d.c.name} accent="indigo" size={36} />
                              <span className="font-semibold text-ink truncate">{d.c.name}</span>
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-muted max-w-56">
                            <span className="block truncate">{d.c.homes?.address ?? "-"}</span>
                          </td>
                          <td className="px-3 py-3 text-muted font-mono text-[13px] tnum whitespace-nowrap">
                            {d.c.phone ?? d.c.email ?? "-"}
                          </td>
                          <td className="px-3 py-3 text-ink font-semibold tnum">{d.jobCount}</td>
                          <td className="px-3 py-3 text-muted tnum whitespace-nowrap">
                            {d.lastJob ? formatDate(d.lastJob) : "-"}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {d.nextService ? (
                              d.due ? (
                                <Pill accent="amber">{formatDate(d.nextService)}</Pill>
                              ) : (
                                <span className="text-muted tnum">{formatDate(d.nextService)}</span>
                              )
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-3 pr-5 py-3">
                            {d.claimed ? (
                              <Pill accent="coral">Claimed</Pill>
                            ) : (
                              <Pill accent="ink">Unclaimed</Pill>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-3 border-t border-line px-5 py-3">
                    <Btn
                      variant="ghost"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      Prev
                    </Btn>
                    <span className="text-xs text-muted tnum">
                      Page {safePage + 1} of {pageCount}
                    </span>
                    <Btn
                      variant="ghost"
                      size="sm"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next
                    </Btn>
                  </div>
                )}
              </Card>

              {/* Mobile: card list */}
              <Card className="anim-fade-up d-1 !p-2 md:hidden">
                <div className="divide-y divide-line">
                  {sorted.map((d) => (
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
            </>
          )}
        </>
      )}
    </ProShell>
  );
}
