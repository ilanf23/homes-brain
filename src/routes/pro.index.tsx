import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { CountUp, ProgressRing, SparkLine } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Dashboard - HomesBrain" }] }),
  component: ProDashboard,
});

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  homes: { address: string } | null;
};
type JobRow = {
  id: string;
  what_done: string;
  next_service_date: string | null;
  created_at: string;
  customers: { name: string } | null;
  homes: { address: string } | null;
  records: { id: string; viewed_at: string | null; sent_sms_at: string | null }[] | null;
};
type RebookEvent = {
  id: string;
  created_at: string;
  props: { job_id?: string; pro_id?: string; home_id?: string };
};
type ReviewEvent = { id: string; created_at: string; props: { customer_id?: string } };
type ClaimedHome = { id: string; address: string; claimed_at: string };

function ProDashboard() {
  const { proId, pro } = useProGuard();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [rebooks, setRebooks] = useState<RebookEvent[]>([]);
  const [reviewAsks, setReviewAsks] = useState<ReviewEvent[]>([]);
  const [claimedHomes, setClaimedHomes] = useState<ClaimedHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"due" | "customers">("due");

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const [{ data: c }, { data: j }, { data: rb }, { data: rv }, { data: ch }] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id,name,phone,email,homes(address)")
            .eq("pro_id", proId)
            .order("created_at", { ascending: false }),
          supabase
            .from("jobs")
            .select(
              "id,what_done,next_service_date,created_at,customers(name),homes(address),records(id,viewed_at,sent_sms_at)",
            )
            .eq("pro_id", proId)
            .order("created_at", { ascending: false }),
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
          supabase
            .from("homes")
            .select("id,address,claimed_at")
            .eq("created_by_pro", proId)
            .not("claimed_at", "is", null)
            .order("claimed_at", { ascending: false }),
        ]);
      setCustomers((c ?? []) as unknown as CustomerRow[]);
      setJobs((j ?? []) as unknown as JobRow[]);
      setRebooks((rb ?? []) as unknown as RebookEvent[]);
      setReviewAsks((rv ?? []) as unknown as ReviewEvent[]);
      setClaimedHomes((ch ?? []) as unknown as ClaimedHome[]);
      setLoading(false);
    })();
  }, [proId]);

  const sentCount = jobs.length;
  const viewedCount = jobs.filter((j) => j.records?.[0]?.viewed_at).length;
  const dueSoon = jobs
    .filter((j) => j.next_service_date)
    .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))
    .slice(0, 5);

  // Jobs per week over the last 8 weeks, for the sparkline.
  const weeklyJobs = useMemo(() => {
    const buckets = new Array(8).fill(0);
    const now = Date.now();
    for (const j of jobs) {
      const weeksAgo = Math.floor(
        (now - new Date(j.created_at).getTime()) / (7 * 24 * 3600 * 1000),
      );
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

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="dashboard">
        <ProPageSkeleton variant="dashboard" />
      </ProShell>
    );
  }

  const empty = jobs.length === 0;
  const viewRate = sentCount ? viewedCount / sentCount : 0;

  return (
    <ProShell pro={pro} active="dashboard">
      <ProPageHead
        eyebrow="Dashboard"
        title={pro.business}
        sub={pro.google_rating ? `${pro.google_rating} ★ on Google` : undefined}
      />

      {empty && (
        <Card className="anim-fade-up mb-5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <CoreLoopScene variant="compact" pose="pro" className="w-28 shrink-0 opacity-90" />
          <div className="flex-1 min-w-[200px]">
            <Eyebrow accent="indigo">Get started</Eyebrow>
            <div className="mt-1 font-semibold text-ink">Log your first job (about 30 seconds)</div>
            <p className="text-sm text-muted mt-0.5">
              We'll send a branded record to your customer and ask for a Google review.
            </p>
          </div>
          <Link to="/pro/jobs/new" className="shrink-0">
            <Btn variant="indigo">Log a job</Btn>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card lift className="anim-fade-up d-1">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Records sent</div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-3xl font-semibold font-display">
              <CountUp value={sentCount} />
            </div>
            <SparkLine points={weeklyJobs} color="var(--indigo)" />
          </div>
        </Card>
        <Card lift className="anim-fade-up d-2">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">
            Records viewed
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-3xl font-semibold font-display">
              <CountUp value={viewedCount} />
            </div>
            <ProgressRing
              value={viewRate}
              size={52}
              strokeWidth={5}
              label={`${Math.round(viewRate * 100)}% of records viewed`}
            />
          </div>
        </Card>
        <Link to="/pro/customers" className="block">
          <Card lift className="anim-fade-up d-3 h-full">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">Customers</div>
            <div className="mt-2 text-3xl font-semibold font-display">
              <CountUp value={customers.length} />
            </div>
          </Card>
        </Link>
        <Link to="/pro/due" className="block">
          <Card lift className="anim-fade-up d-4 h-full">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">
              Due for service
            </div>
            <div className="mt-2 text-3xl font-semibold font-display">
              <CountUp value={dueSoon.length} />
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <Card lift className="anim-fade-up d-2 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">
              Rebooked via HomesBrain
            </div>
            {rebooks.length > 0 && <Pill accent="coral">Payoff</Pill>}
          </div>
          {rebooks.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              When homeowners rebook from their HomesBrain reminders, wins land here.
            </p>
          ) : (
            <div className="mt-2 flex items-end gap-8">
              <div>
                <div className="text-3xl font-semibold font-display text-coral">
                  <CountUp value={rebooksThisMonth} />
                </div>
                <div className="text-xs text-muted mt-0.5">this month</div>
              </div>
              <div>
                <div className="text-3xl font-semibold font-display">
                  <CountUp value={rebooks.length} />
                </div>
                <div className="text-xs text-muted mt-0.5">all time</div>
              </div>
            </div>
          )}
        </Card>
        <Link to="/pro/reviews" className="block">
          <Card lift className="anim-fade-up d-3 h-full">
            <div className="text-xs uppercase tracking-wider text-muted font-bold">Reviews</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-3xl font-semibold font-display tnum">
                {pro.google_place_id && pro.google_rating ? pro.google_rating : "-"}
              </div>
              {!!pro.google_place_id && <Star size={18} className="text-coral fill-coralbg" />}
            </div>
            <div className="text-xs text-muted mt-1">
              {reviewAsks.length} review {reviewAsks.length === 1 ? "ask" : "asks"} sent
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-5 items-start">
        <Card className="anim-fade-up d-3">
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

        <Card className="anim-fade-up d-4">
          <div
            className="flex items-center gap-1 rounded-full bg-soft p-1 w-fit"
            role="tablist"
            aria-label="Dashboard panel"
          >
            {(
              [
                ["due", "Due for service"],
                ["customers", "Customers"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={panel === key}
                onClick={() => setPanel(key)}
                className={`pressable rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  panel === key ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === "due" && (
            <div key="due" className="anim-fade-in mt-4">
              {dueSoon.length === 0 ? (
                <p className="text-sm text-muted">Nothing scheduled yet.</p>
              ) : (
                <div>
                  {dueSoon.map((j) => (
                    <KV
                      key={j.id}
                      k={`${j.customers?.name ?? "-"} · ${j.homes?.address ?? ""}`}
                      v={formatDate(j.next_service_date)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === "customers" && (
            <div key="customers" className="anim-fade-in mt-4 divide-y divide-line">
              {customers.length === 0 && (
                <p className="text-sm text-muted">
                  No customers yet. They're added when you log a job.
                </p>
              )}
              {customers.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  to="/pro/customers/$customerId"
                  params={{ customerId: c.id }}
                  className="py-3 flex items-center justify-between -mx-2 px-2 rounded-lg hover:bg-soft transition-colors duration-200"
                >
                  <div>
                    <div className="font-semibold text-ink">{c.name}</div>
                    <div className="text-xs text-muted">{c.homes?.address}</div>
                  </div>
                  <div className="text-xs text-muted font-mono tnum">
                    {c.phone ?? c.email ?? ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ProShell>
  );
}
