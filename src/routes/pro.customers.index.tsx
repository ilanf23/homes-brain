import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import { Avatar, Btn, Card, Input, KV, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPhone, logEvent, mockSend } from "@/lib/hb";
import { FilterSelect, SlideOver, SortableTh, UnderlineTabs } from "@/components/crm";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { PlanLock } from "@/components/plan-lock";

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
  jobs:
    | { id: string; created_at: string; next_service_date: string | null; what_done: string }[]
    | null;
};

type SortKey =
  | "name"
  | "address"
  | "phone"
  | "email"
  | "jobs"
  | "lastJob"
  | "nextService"
  | "status"
  | "created";

type ColKey = "address" | "phone" | "email" | "jobs" | "lastJob" | "nextService" | "status";

const ALL_COLUMNS: { key: ColKey; label: string; sortKey: SortKey }[] = [
  { key: "address", label: "Home address", sortKey: "address" },
  { key: "phone", label: "Phone", sortKey: "phone" },
  { key: "email", label: "Email", sortKey: "email" },
  { key: "jobs", label: "Jobs", sortKey: "jobs" },
  { key: "lastJob", label: "Last job", sortKey: "lastJob" },
  { key: "nextService", label: "Next service", sortKey: "nextService" },
  { key: "status", label: "Status", sortKey: "status" },
];
const DEFAULT_COLUMNS: ColKey[] = ["address", "phone", "jobs", "lastJob", "nextService", "status"];
const COLS_KEY = "hb_customers_columns";

type SavedView = {
  id: string;
  name: string;
  claimedFilter: string;
  lastJobFilter: string;
  q: string;
  sort: { key: SortKey; dir: "asc" | "desc" };
};
const VIEWS_KEY = "hb_customers_views";

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
    case "email":
      return str(a.c.email).localeCompare(str(b.c.email));
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

function loadCols(): ColKey[] {
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((k): k is ColKey => ALL_COLUMNS.some((c) => c.key === k));
    return valid.length > 0 ? valid : DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function CustomersList() {
  const navigate = useNavigate();
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [claimedFilter, setClaimedFilter] = useState("any");
  const [lastJobFilter, setLastJobFilter] = useState("any");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "created",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  /* Prefs hydrate in an effect (not useState initializers) to avoid an
     SSR/client hydration mismatch; nothing persists until hydrated. */
  const [cols, setCols] = useState<ColKey[]>(DEFAULT_COLUMNS);
  const [views, setViews] = useState<SavedView[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [addingView, setAddingView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [editCols, setEditCols] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [nudgingBulk, setNudgingBulk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCols(loadCols());
    setViews(loadViews());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(COLS_KEY, JSON.stringify(cols));
  }, [cols, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  }, [views, hydrated]);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id,name,phone,email,created_at,homes(address,claimed_at),jobs(id,created_at,next_service_date,what_done)",
        )
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [activeTab, claimedFilter, lastJobFilter, q, sort]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
    if (activeTab === "claimed") rows = rows.filter((d) => d.claimed);
    if (activeTab === "unclaimed") rows = rows.filter((d) => !d.claimed);
    if (activeTab === "due") rows = rows.filter((d) => d.due);
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
  }, [derived, activeTab, claimedFilter, lastJobFilter, q]);

  const sorted = useMemo(() => {
    const rows = [...filtered].sort((a, b) => compare(a, b, sort.key));
    if (sort.dir === "desc") rows.reverse();
    return rows;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const filtersActive = claimedFilter !== "any" || lastJobFilter !== "any" || q.trim() !== "";
  const pageAllSelected = pageRows.length > 0 && pageRows.every((d) => selected.has(d.c.id));
  const previewRow = previewId ? (derived.find((d) => d.c.id === previewId) ?? null) : null;
  const visibleColumns = cols
    .map((k) => ALL_COLUMNS.find((c) => c.key === k))
    .filter((c): c is (typeof ALL_COLUMNS)[number] => Boolean(c));

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

  function onTabChange(k: string) {
    if (k === "__add") {
      setAddingView(true);
      return;
    }
    setActiveTab(k);
    const v = views.find((x) => x.id === k);
    if (v) {
      setClaimedFilter(v.claimedFilter);
      setLastJobFilter(v.lastJobFilter);
      setQ(v.q);
      setSort(v.sort);
    }
  }

  function onTabClose(k: string) {
    if (!window.confirm("Delete this view?")) return;
    setViews((vs) => vs.filter((v) => v.id !== k));
    if (activeTab === k) setActiveTab("all");
  }

  function saveView() {
    const name = viewName.trim();
    if (!name) return;
    const v: SavedView = { id: `v-${Date.now()}`, name, claimedFilter, lastJobFilter, q, sort };
    setViews((vs) => [...vs, v]);
    setActiveTab(v.id);
    setAddingView(false);
    setViewName("");
  }

  function toggleCol(k: ColKey) {
    setCols((cs) =>
      cs.includes(k) ? (cs.length > 1 ? cs.filter((x) => x !== k) : cs) : [...cs, k],
    );
  }

  function moveCol(k: ColKey, dir: -1 | 1) {
    setCols((cs) => {
      const i = cs.indexOf(k);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((s) => {
      const next = new Set(s);
      if (pageAllSelected) pageRows.forEach((d) => next.delete(d.c.id));
      else pageRows.forEach((d) => next.add(d.c.id));
      return next;
    });
  }

  async function bulkNudge() {
    if (!proId || !pro || nudgingBulk) return;
    setNudgingBulk(true);
    let sent = 0;
    let skipped = 0;
    for (const d of derived.filter((x) => selected.has(x.c.id))) {
      const to = d.c.phone ?? d.c.email;
      if (!to) {
        skipped++;
        continue;
      }
      const nextJob = (d.c.jobs ?? []).find((j) => j.next_service_date);
      const first = d.c.name.split(" ")[0];
      const body = nextJob
        ? `Hi ${first}, it's ${pro.business}. Your ${nextJob.what_done.toLowerCase()} is due for service around ${formatDate(nextJob.next_service_date!)}. Reply here or book a time and we'll take care of it.`
        : `Hi ${first}, it's ${pro.business}. It's a good time for a service check at ${d.c.homes?.address ?? "your home"}. Reply here and we'll set it up.`;
      await mockSend({ channel: d.c.phone ? "sms" : "email", to, body, kind: "other" });
      await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
        job_id: nextJob?.id ?? null,
        customer_id: d.c.id,
      });
      sent++;
    }
    setNudgingBulk(false);
    setSelected(new Set());
    setToast(
      `Nudges sent to ${sent} customer${sent === 1 ? "" : "s"} (mock)${
        skipped > 0 ? `, ${skipped} skipped (no contact)` : ""
      }`,
    );
  }

  function exportCsv() {
    const rows = derived.filter((d) => selected.has(d.c.id));
    const header = [
      "Name",
      "Address",
      "Phone",
      "Email",
      "Jobs",
      "Last job",
      "Next service",
      "Status",
    ];
    const lines = [header.join(",")];
    for (const d of rows) {
      lines.push(
        [
          d.c.name,
          d.c.homes?.address ?? "",
          d.c.phone ?? "",
          d.c.email ?? "",
          String(d.jobCount),
          d.lastJob ? formatDate(d.lastJob) : "",
          d.nextService ? formatDate(d.nextService) : "",
          d.claimed ? "Claimed" : "Unclaimed",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${rows.length} customer${rows.length === 1 ? "" : "s"} to CSV`);
  }

  function renderCell(d: Derived, col: ColKey, last: boolean) {
    const base = `px-3 py-3 ${last ? "pr-5" : ""}`;
    switch (col) {
      case "address":
        return (
          <td key={col} className={`${base} text-muted max-w-56`}>
            <span className="block truncate">{d.c.homes?.address ?? "-"}</span>
          </td>
        );
      case "phone":
        return (
          <td
            key={col}
            className={`${base} text-muted font-mono text-[13px] tnum whitespace-nowrap`}
          >
            {d.c.phone ? formatPhone(d.c.phone) : (d.c.email ?? "-")}
          </td>
        );
      case "email":
        return (
          <td
            key={col}
            className={`${base} text-muted font-mono text-[13px] tnum whitespace-nowrap`}
          >
            {d.c.email ?? "-"}
          </td>
        );
      case "jobs":
        return (
          <td key={col} className={`${base} text-ink font-semibold tnum`}>
            {d.jobCount}
          </td>
        );
      case "lastJob":
        return (
          <td key={col} className={`${base} text-muted tnum whitespace-nowrap`}>
            {d.lastJob ? formatDate(d.lastJob) : "-"}
          </td>
        );
      case "nextService":
        return (
          <td key={col} className={`${base} whitespace-nowrap`}>
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
        );
      case "status":
        return (
          <td key={col} className={base}>
            {d.claimed ? <Pill accent="coral">Claimed</Pill> : <Pill accent="ink">Unclaimed</Pill>}
          </td>
        );
    }
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="customers">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (pro.plan !== "pro") {
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
                ...views.map((v) => ({ key: v.id, label: v.name, closable: true })),
                { key: "__add", label: "+ Add view" },
              ]}
              active={activeTab}
              onChange={onTabChange}
              onClose={onTabClose}
            />
            {addingView && (
              <div className="mt-3">
                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="View name"
                    autoFocus
                    aria-label="View name"
                    className="!min-h-9 !py-1.5"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveView();
                      if (e.key === "Escape") setAddingView(false);
                    }}
                  />
                  <Btn size="sm" variant="indigo" onClick={saveView}>
                    Save
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingView(false);
                      setViewName("");
                    }}
                  >
                    Cancel
                  </Btn>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Saves the current filters, search, and sort as a view.
                </p>
              </div>
            )}
          </div>

          {selected.size > 0 ? (
            <div className="anim-fade-up mt-4 mb-4 flex items-center gap-3 flex-wrap rounded-2xl border border-line bg-paper px-4 py-2.5">
              <span className="text-sm font-bold text-ink tnum">{selected.size} selected</span>
              <Btn variant="coral" size="sm" loading={nudgingBulk} onClick={bulkNudge}>
                Send rebook nudge
              </Btn>
              <Btn variant="secondary" size="sm" onClick={exportCsv}>
                Export CSV
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Btn>
            </div>
          ) : (
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
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, contact, or address"
                  className="pl-9 !min-h-10"
                  aria-label="Search customers"
                />
              </div>
              <button
                onClick={() => setEditCols(true)}
                className="hidden md:inline text-xs font-semibold text-indigo hover:underline"
              >
                Edit columns
              </button>
            </div>
          )}

          {pageAllSelected && sorted.length > pageRows.length && selected.size < sorted.length && (
            <div className="mb-3 text-sm text-muted">
              All {pageRows.length} on this page selected.{" "}
              <button
                onClick={() => setSelected(new Set(sorted.map((d) => d.c.id)))}
                className="font-semibold text-indigo hover:underline"
              >
                Select all {sorted.length} in this view
              </button>
            </div>
          )}

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
                        <th className="pl-5 pr-1 py-2.5 w-10">
                          <input
                            type="checkbox"
                            checked={pageAllSelected}
                            onChange={togglePage}
                            aria-label="Select all on this page"
                            className="w-4 h-4 accent-[var(--indigo)] cursor-pointer align-middle"
                          />
                        </th>
                        <SortableTh label="Name" sortKey="name" sort={sort} onSort={onSort} />
                        {visibleColumns.map((c) => (
                          <SortableTh
                            key={c.key}
                            label={c.label}
                            sortKey={c.sortKey}
                            sort={sort}
                            onSort={onSort}
                          />
                        ))}
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
                          className="group cursor-pointer hover:bg-soft transition-colors"
                        >
                          <td className="pl-5 pr-1 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(d.c.id)}
                              onChange={() => toggleRow(d.c.id)}
                              aria-label={`Select ${d.c.name}`}
                              className="w-4 h-4 accent-[var(--indigo)] cursor-pointer align-middle"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Link
                                to="/pro/customers/$customerId"
                                params={{ customerId: d.c.id }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2.5 min-w-0"
                              >
                                <Avatar name={d.c.name} accent="indigo" size={36} />
                                <span className="font-semibold text-ink truncate">{d.c.name}</span>
                              </Link>
                              <Btn
                                variant="secondary"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity !py-1 !px-2.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewId(d.c.id);
                                }}
                              >
                                Preview
                              </Btn>
                            </div>
                          </td>
                          {visibleColumns.map((c, i) =>
                            renderCell(d, c.key, i === visibleColumns.length - 1),
                          )}
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

      {/* Row preview panel */}
      <SlideOver
        open={Boolean(previewRow)}
        onClose={() => setPreviewId(null)}
        title="Customer preview"
      >
        {previewRow && (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={previewRow.c.name} accent="indigo" size={48} />
              <div className="min-w-0">
                <div className="text-lg font-bold text-ink truncate">{previewRow.c.name}</div>
                <div className="text-sm text-muted truncate">
                  {previewRow.c.homes?.address ?? "No address"}
                </div>
              </div>
            </div>
            <div className="mt-3">
              {previewRow.claimed ? (
                <Pill accent="coral">Claimed</Pill>
              ) : (
                <Pill accent="ink">Unclaimed</Pill>
              )}
            </div>
            <div className="mt-4">
              <KV k="Phone" v={previewRow.c.phone ?? "-"} />
              <KV k="Email" v={previewRow.c.email ?? "-"} />
              <KV k="Jobs" v={String(previewRow.jobCount)} />
              <KV
                k="Next service"
                v={previewRow.nextService ? formatDate(previewRow.nextService) : "-"}
              />
            </div>
            <div className="mt-5">
              <div className="eyebrow text-indigo">Recent jobs</div>
              {(previewRow.c.jobs ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted">No jobs logged yet.</p>
              ) : (
                <div className="mt-1 divide-y divide-line">
                  {[...(previewRow.c.jobs ?? [])]
                    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                    .slice(0, 3)
                    .map((j) => (
                      <div key={j.id} className="py-2.5">
                        <div className="text-sm font-semibold text-ink truncate">{j.what_done}</div>
                        <div className="text-xs text-muted tnum">{formatDate(j.created_at)}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Btn
                variant="indigo"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/pro/customers/$customerId",
                    params: { customerId: previewRow.c.id },
                  })
                }
              >
                Open full record
              </Btn>
              <Link
                to="/pro/jobs/new"
                className="text-sm font-semibold text-indigo hover:underline"
              >
                Log a job
              </Link>
            </div>
          </>
        )}
      </SlideOver>

      {/* Edit columns panel */}
      <SlideOver open={editCols} onClose={() => setEditCols(false)} title="Edit columns">
        <p className="text-sm text-muted">
          Choose which columns show and their order. Name always stays first.
        </p>
        <div className="mt-3">
          {[
            ...cols.map((k) => ALL_COLUMNS.find((c) => c.key === k)!),
            ...ALL_COLUMNS.filter((c) => !cols.includes(c.key)),
          ].map((c) => {
            const visible = cols.includes(c.key);
            const idx = cols.indexOf(c.key);
            return (
              <div
                key={c.key}
                className="flex items-center justify-between py-2.5 border-b border-line last:border-b-0"
              >
                <label className="flex items-center gap-2.5 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleCol(c.key)}
                    className="w-4 h-4 accent-[var(--indigo)] cursor-pointer"
                  />
                  {c.label}
                </label>
                {visible && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveCol(c.key, -1)}
                      aria-label={`Move ${c.label} up`}
                      className="pressable p-1 rounded-lg text-muted hover:text-ink hover:bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      disabled={idx === cols.length - 1}
                      onClick={() => moveCol(c.key, 1)}
                      aria-label={`Move ${c.label} down`}
                      className="pressable p-1 rounded-lg text-muted hover:text-ink hover:bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SlideOver>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
