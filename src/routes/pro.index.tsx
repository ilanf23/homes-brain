import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import { formatDate, tradeLabel } from "@/lib/hb";
import { CountUp, HouseScene, LogoMark, ProgressRing, SparkLine } from "@/components/svg";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Dashboard — HomesBrain" }] }),
  component: ProDashboard,
});

type Pro = { id: string; business: string; trade: string; google_rating: number | null };
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
  records: { viewed_at: string | null; sent_sms_at: string | null }[] | null;
};

function ProDashboard() {
  const navigate = useNavigate();
  const [pro, setPro] = useState<Pro | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"due" | "customers">("due");

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "pro") {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data: p } = await supabase
        .from("pros")
        .select("id,business,trade,google_rating")
        .eq("id", s.proId)
        .maybeSingle();
      if (!p) {
        clearSession();
        navigate({ to: "/pro/signup" });
        return;
      }
      setPro(p as Pro);

      const [{ data: c }, { data: j }] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone,email,homes(address)")
          .eq("pro_id", s.proId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select(
            "id,what_done,next_service_date,created_at,customers(name),homes(address),records(viewed_at,sent_sms_at)",
          )
          .eq("pro_id", s.proId)
          .order("created_at", { ascending: false }),
      ]);
      setCustomers((c ?? []) as unknown as CustomerRow[]);
      setJobs((j ?? []) as unknown as JobRow[]);
      setLoading(false);
    })();
  }, [navigate]);

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

  if (loading || !pro) return <PageLoader label="Loading dashboard" />;

  const empty = jobs.length === 0;
  const viewRate = sentCount ? viewedCount / sentCount : 0;

  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <LogoMark className="transition-transform duration-300 group-hover:rotate-[-6deg]" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="teal">Pro</Pill>
            <button
              onClick={() => {
                clearSession();
                navigate({ to: "/" });
              }}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="anim-fade-up flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={pro.business} accent="teal" size={52} />
            <div>
              <Eyebrow accent="teal">Dashboard</Eyebrow>
              <h1 className="text-3xl tracking-tight">{pro.business}</h1>
              <div className="text-sm text-muted">
                {tradeLabel(pro.trade)}
                {pro.google_rating ? ` · ${pro.google_rating} ★ Google` : ""}
              </div>
            </div>
          </div>
          <Link to="/pro/jobs/new">
            <Btn variant="teal" size="lg">
              + Log a job
            </Btn>
          </Link>
        </div>

        {empty ? (
          <Card className="anim-fade-up d-2 mt-10 text-center py-14">
            <HouseScene className="w-56 mx-auto opacity-90" />
            <Eyebrow accent="teal">Get started</Eyebrow>
            <h2 className="mt-3 text-2xl tracking-tight">Log your first job</h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              It takes about 30 seconds. We'll send a branded record to your customer and ask for a
              review.
            </p>
            <div className="mt-6">
              <Link to="/pro/jobs/new">
                <Btn variant="teal" size="lg">
                  Log a job
                </Btn>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card lift className="anim-fade-up d-1">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">
                  Records sent
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-3xl font-semibold font-display">
                    <CountUp value={sentCount} />
                  </div>
                  <SparkLine points={weeklyJobs} color="var(--teal)" />
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
              <Card lift className="anim-fade-up d-3">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">
                  Customers
                </div>
                <div className="mt-2 text-3xl font-semibold font-display">
                  <CountUp value={customers.length} />
                </div>
              </Card>
              <Card lift className="anim-fade-up d-4">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">
                  Due for service
                </div>
                <div className="mt-2 text-3xl font-semibold font-display">
                  <CountUp value={dueSoon.length} />
                </div>
              </Card>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-5 items-start">
              <Card className="anim-fade-up d-3">
                <Eyebrow accent="teal">Recent jobs</Eyebrow>
                <div className="mt-3 divide-y divide-line">
                  {jobs.slice(0, 8).map((j) => {
                    const rec = j.records?.[0];
                    return (
                      <div
                        key={j.id}
                        className="py-3 flex items-start justify-between gap-3 -mx-2 px-2 rounded-lg hover:bg-soft transition-colors duration-200"
                      >
                        <div>
                          <div className="font-semibold text-ink">{j.customers?.name ?? "—"}</div>
                          <div className="text-xs text-muted">{j.homes?.address}</div>
                          <div className="text-sm mt-0.5">{j.what_done}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted font-mono tnum">
                            {formatDate(j.created_at)}
                          </div>
                          {rec?.viewed_at ? (
                            <Pill accent="teal">Viewed</Pill>
                          ) : rec?.sent_sms_at ? (
                            <Pill accent="indigo">Sent</Pill>
                          ) : null}
                        </div>
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
                            k={`${j.customers?.name ?? "—"} · ${j.homes?.address ?? ""}`}
                            v={formatDate(j.next_service_date)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {panel === "customers" && (
                  <div key="customers" className="anim-fade-in mt-4 divide-y divide-line">
                    {customers.slice(0, 8).map((c) => (
                      <div
                        key={c.id}
                        className="py-3 flex items-center justify-between -mx-2 px-2 rounded-lg hover:bg-soft transition-colors duration-200"
                      >
                        <div>
                          <div className="font-semibold text-ink">{c.name}</div>
                          <div className="text-xs text-muted">{c.homes?.address}</div>
                        </div>
                        <div className="text-xs text-muted font-mono tnum">
                          {c.phone ?? c.email ?? ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
