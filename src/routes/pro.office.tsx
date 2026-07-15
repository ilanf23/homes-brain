import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Eyebrow, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { backfillHomeGeocodes, fetchProHomes, formatDate, type ProHome } from "@/lib/hb";
import { isOverdue, listInvoicesForPro, type ProInvoice } from "@/lib/invoices";
import { CountUp, ProgressRing, SparkLine } from "@/components/svg";

import { MoneyRow } from "@/components/money-row";
import { ActionQueue, type QueueJob, type QueueStaleHome } from "@/components/action-queue";
import { CustomerMap, type MapPin } from "@/components/customer-map";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { PlanLockCompact } from "@/components/plan-lock";
import { isProEntitled } from "@/lib/plan";
import { ProSetupChecklist } from "@/components/pro-setup-checklist";

export const Route = createFileRoute("/pro/office")({
  head: () => ({ meta: [{ title: "Office - HomesBrain" }] }),
  component: ProDashboard,
});

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  home_id: string;
  homes: { address: string } | null;
};
type JobRow = {
  id: string;
  home_id: string;
  what_done: string;
  next_service_date: string | null;
  created_at: string;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
  homes: { address: string } | null;
  records: { id: string; viewed_at: string | null; sent_sms_at: string | null }[] | null;
};
type RebookEvent = {
  id: string;
  created_at: string;
  props: { job_id?: string; pro_id?: string; home_id?: string };
};
type ReviewEvent = { id: string; created_at: string; props: { customer_id?: string } };
type Win = {
  key: string;
  ts: string;
  label: string;
  detail?: string;
  kind: "viewed" | "claimed" | "rebooked" | "review";
};

const DAY = 24 * 3600 * 1000;
const DUE_WINDOW = 14 * DAY;
const STALE_UNCLAIMED = 7 * DAY;

function ProDashboard() {
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<ProInvoice[]>([]);
  const [homes, setHomes] = useState<ProHome[]>([]);
  const [rebooks, setRebooks] = useState<RebookEvent[]>([]);
  const [reviewAsks, setReviewAsks] = useState<ReviewEvent[]>([]);
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const backfillStarted = useRef(false);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const [{ data: c }, { data: j }, inv, hs, { data: rb }, { data: rv }] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone,email,home_id,homes(address)")
          .eq("pro_id", proId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select(
            "id,home_id,what_done,next_service_date,created_at,customers(id,name,phone,email),homes(address),records(id,viewed_at,sent_sms_at)",
          )
          .eq("pro_id", proId)
          .order("created_at", { ascending: false }),
        listInvoicesForPro(proId),
        fetchProHomes(proId),
        supabase
          .from("events")
          .select("id,created_at,props")
          .eq("type", "rebooked")
          .eq("props->>pro_id", proId)
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id,created_at,props")
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .order("created_at", { ascending: false }),
      ]);
      setCustomers((c ?? []) as unknown as CustomerRow[]);
      setJobs((j ?? []) as unknown as JobRow[]);
      setInvoices(inv);
      setHomes(hs);
      setRebooks((rb ?? []) as unknown as RebookEvent[]);
      setReviewAsks((rv ?? []) as unknown as ReviewEvent[]);
      setLoading(false);
    })();
  }, [proId]);

  // Lazy geocode backfill: up to 5 ungeocoded homes per visit, 1s apart.
  useEffect(() => {
    if (loading || backfillStarted.current) return;
    const pending = homes.filter((h) => !h.geocoded_at);
    if (pending.length === 0) return;
    backfillStarted.current = true;
    setGeocodingCount(Math.min(pending.length, 5));
    void backfillHomeGeocodes(homes, (updated) => {
      setHomes((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setGeocodingCount((n) => Math.max(0, n - 1));
    });
  }, [loading, homes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const sentCount = jobs.length;
  const viewedCount = jobs.filter((j) => j.records?.[0]?.viewed_at).length;

  const weeklyJobs = useMemo(() => {
    const buckets = new Array(8).fill(0);
    const now = Date.now();
    for (const j of jobs) {
      const weeksAgo = Math.floor((now - new Date(j.created_at).getTime()) / (7 * DAY));
      if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += 1;
    }
    return buckets;
  }, [jobs]);

  const rebooksThisMonth = useMemo(() => {
    const now = new Date();
    return rebooks.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [rebooks]);

  // Queue source 1: jobs due within 14 days or overdue, most overdue first.
  const dueQueue = useMemo<QueueJob[]>(
    () =>
      jobs
        .filter(
          (j) =>
            j.next_service_date &&
            new Date(j.next_service_date).getTime() - Date.now() <= DUE_WINDOW,
        )
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))
        .map((j) => ({
          id: j.id,
          what_done: j.what_done,
          next_service_date: j.next_service_date!,
          customer: j.customers,
          address: j.homes?.address ?? null,
        })),
    [jobs],
  );

  // Queue source 2: open invoices past due, most overdue first.
  const overdueInvoices = useMemo(
    () => invoices.filter((i) => isOverdue(i)).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [invoices],
  );

  // Queue source 3: unclaimed homes whose latest record went out 7+ days ago.
  const staleHomes = useMemo<QueueStaleHome[]>(() => {
    const customerByHome = new Map(customers.map((c) => [c.home_id, c]));
    const latestSentByHome = new Map<string, string>();
    for (const j of jobs) {
      const sent = j.records?.[0]?.sent_sms_at;
      if (!sent) continue;
      const prev = latestSentByHome.get(j.home_id);
      if (!prev || sent > prev) latestSentByHome.set(j.home_id, sent);
    }
    return homes
      .filter((h) => !h.claimed_at)
      .flatMap((h) => {
        const sentAt = latestSentByHome.get(h.id);
        if (!sentAt || Date.now() - new Date(sentAt).getTime() < STALE_UNCLAIMED) return [];
        const c = customerByHome.get(h.id);
        return [
          {
            homeId: h.id,
            address: h.address,
            customer: c ? { id: c.id, name: c.name, phone: c.phone, email: c.email } : null,
            sentAt,
          },
        ];
      })
      .sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));
  }, [homes, jobs, customers]);

  // Map pins: status priority owes > due > unclaimed > active.
  const pins = useMemo<MapPin[]>(() => {
    const customerByHome = new Map(customers.map((c) => [c.home_id, c]));
    const owesHomes = new Set(invoices.filter((i) => i.status === "open").map((i) => i.home_id));
    const dueHomes = new Set(
      jobs
        .filter(
          (j) =>
            j.next_service_date &&
            new Date(j.next_service_date).getTime() - Date.now() <= DUE_WINDOW,
        )
        .map((j) => j.home_id),
    );
    return homes
      .filter((h) => h.lat !== null && h.lng !== null)
      .map((h) => {
        const c = customerByHome.get(h.id);
        const status = owesHomes.has(h.id)
          ? ("owes" as const)
          : dueHomes.has(h.id)
            ? ("due" as const)
            : !h.claimed_at
              ? ("unclaimed" as const)
              : ("active" as const);
        return {
          homeId: h.id,
          customerId: c?.id ?? null,
          name: c?.name ?? "Customer",
          address: h.address,
          lat: h.lat!,
          lng: h.lng!,
          status,
        };
      });
  }, [homes, customers, invoices, jobs]);

  const wins = useMemo<Win[]>(() => {
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const list: Win[] = [];
    for (const j of jobs) {
      const viewedAt = j.records?.[0]?.viewed_at;
      if (viewedAt) {
        list.push({
          key: `viewed-${j.id}`,
          ts: viewedAt,
          label: `${j.customers?.name ?? "A homeowner"} viewed their service record`,
          detail: j.homes?.address ?? undefined,
          kind: "viewed",
        });
      }
    }
    for (const h of homes) {
      if (!h.claimed_at) continue;
      list.push({
        key: `claimed-${h.id}`,
        ts: h.claimed_at,
        label: `${h.address} was claimed by the homeowner`,
        kind: "claimed",
      });
    }
    for (const r of rebooks) {
      const job = r.props.job_id ? jobById.get(r.props.job_id) : undefined;
      list.push({
        key: `rebooked-${r.id}`,
        ts: r.created_at,
        label: `${job?.customers?.name ?? "A homeowner"} rebooked from their reminder`,
        detail: job?.what_done,
        kind: "rebooked",
      });
    }
    for (const r of reviewAsks) {
      const cust = r.props.customer_id ? customerById.get(r.props.customer_id) : undefined;
      list.push({
        key: `review-${r.id}`,
        ts: r.created_at,
        label: `Review requested from ${cust?.name ?? "a customer"}`,
        kind: "review",
      });
    }
    return list.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 5);
  }, [jobs, customers, homes, rebooks, reviewAsks]);

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="office">
        <ProPageSkeleton variant="dashboard" />
      </ProShell>
    );
  }

  
  const viewRate = sentCount ? viewedCount / sentCount : 0;

  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = pro.owner_first_name?.trim();
  const businessName = pro.business?.trim();
  const greetingName =
    (firstName && firstName.length > 0 && firstName) ||
    (businessName && businessName.length > 0 && businessName) ||
    "there";

  return (
    <ProShell pro={pro} active="office">
      <ProPageHead
        eyebrow="Dashboard"
        title={`${timeOfDay}, ${greetingName}`}
        sub={pro.google_rating ? `${pro.google_rating} ★ on Google` : undefined}
      />


      <ProSetupChecklist proId={proId} />



      <ActionQueue
        proId={proId!}
        proBusiness={pro.business}
        dueJobs={dueQueue}
        overdueInvoices={overdueInvoices}
        staleHomes={staleHomes}
        onInvoicePaid={(invoiceId) =>
          setInvoices((prev) =>
            prev.map((i) =>
              i.id === invoiceId
                ? { ...i, status: "paid" as const, paid_at: new Date().toISOString() }
                : i,
            ),
          )
        }
        onToast={setToast}
      />

      {isProEntitled(pro) ? (
        <>
          <MoneyRow
            invoices={invoices}
            rebooksThisMonth={rebooksThisMonth}
            rebooksAllTime={rebooks.length}
          />

          <CustomerMap pins={pins} geocodingCount={geocodingCount} />
        </>
      ) : (
        <div className="space-y-4">
          <PlanLockCompact
            title="Money dashboard"
            description="Revenue, paid invoices, and rebook value at a glance."
          />
          <PlanLockCompact
            title="Automated rebooking & win-backs"
            description="We work your whole book: seasonal, overdue, and win-back outreach, automatically."
          />
          <PlanLockCompact
            title="Customer map"
            description="See every home you serve, color-coded by who owes, who's due, and who's unclaimed."
          />
        </div>
      )}


      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="anim-fade-up d-4">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Records sent</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="text-xl font-semibold font-display">
              <CountUp value={sentCount} />
            </div>
            <SparkLine points={weeklyJobs} color="var(--indigo)" width={64} height={22} />
          </div>
        </Card>
        <Card className="anim-fade-up d-4">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">View rate</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <ProgressRing
              value={viewRate}
              size={40}
              strokeWidth={4}
              label={`${Math.round(viewRate * 100)}% of records viewed`}
            />
            <div className="text-xs text-muted tnum">
              {viewedCount} of {sentCount} viewed
            </div>
          </div>
        </Card>
        <Link to="/pro/customers" className="block">
          <Card lift className="anim-fade-up d-4 h-full">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">Customers</div>
            <div className="mt-1.5 text-xl font-semibold font-display">
              <CountUp value={customers.length} />
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-5 items-start">
        <Card className="anim-fade-up d-5">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">Recent jobs</Eyebrow>
            <Link to="/pro/records" className="text-xs font-semibold text-indigo hover:underline">
              All records →
            </Link>
          </div>
          {jobs.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              No jobs yet. The jobs you log will show here with their record status.
            </p>
          )}
          <div className="mt-3 divide-y divide-line">
            {jobs.slice(0, 8).map((j) => {
              const rec = j.records?.[0];
              const inner = (
                <>
                  <div>
                    <div className="font-semibold text-ink">{j.customers?.name ?? "-"}</div>
                    <div className="text-xs text-muted">{j.homes?.address}</div>
                    <div className="text-sm mt-0.5">{j.what_done}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted font-mono tnum">
                      {formatDate(j.created_at)}
                    </div>
                    {rec?.viewed_at ? (
                      <Pill accent="indigo">Viewed</Pill>
                    ) : rec?.sent_sms_at ? (
                      <Pill accent="indigo">Sent</Pill>
                    ) : null}
                  </div>
                </>
              );
              const rowCls =
                "py-3 flex items-start justify-between gap-3 -mx-2 px-2 rounded-lg hover:bg-soft active:bg-line/50 transition-colors duration-150";
              return rec ? (
                <Link
                  key={j.id}
                  to="/pro/records/$recordId"
                  params={{ recordId: rec.id }}
                  className={rowCls}
                >
                  {inner}
                </Link>
              ) : (
                <div key={j.id} className={rowCls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="anim-fade-up d-5">
          <Eyebrow accent="indigo">Wins</Eyebrow>
          {wins.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Wins from your records (views, claims, rebooks) will show up here.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {wins.map((w) => (
                <div key={w.key} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{w.label}</div>
                    {w.detail && <div className="text-xs text-muted">{w.detail}</div>}
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-xs text-muted font-mono tnum">{formatDate(w.ts)}</div>
                    {w.kind === "rebooked" ? (
                      <Pill accent="coral">Rebooked</Pill>
                    ) : (
                      <Pill accent="indigo">
                        {w.kind === "viewed"
                          ? "Viewed"
                          : w.kind === "claimed"
                            ? "Claimed"
                            : "Review ask"}
                      </Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
