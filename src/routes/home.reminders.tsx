import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Eyebrow, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, NoHomeYet, useHomeownerGuard } from "@/components/home-shell";

export const Route = createFileRoute("/home/reminders")({
  head: () => ({ meta: [{ title: "Reminders — HomesBrain" }] }),
  component: Reminders,
});

type DueJob = {
  id: string;
  what_done: string;
  next_service_date: string;
  pro_id: string;
};
type ProRow = { id: string; business: string; trade: string };

const DAY = 24 * 3600 * 1000;

function bucketOf(dateIso: string): "overdue" | "soon" | "later" {
  const diff = new Date(dateIso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 30 * DAY) return "soon";
  return "later";
}

const BUCKETS = [
  { key: "overdue", title: "Overdue", sub: "Past due — worth a call." },
  { key: "soon", title: "Due in the next 30 days", sub: "Coming up." },
  { key: "later", title: "Later", sub: "On the schedule." },
] as const;

function Reminders() {
  const { homeownerId, home, loading: guardLoading } = useHomeownerGuard();
  const [jobs, setJobs] = useState<DueJob[]>([]);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const { data: jb } = await supabase
        .from("jobs")
        .select("id,what_done,next_service_date,pro_id")
        .eq("home_id", home.id)
        .not("next_service_date", "is", null)
        .order("next_service_date", { ascending: true });
      setJobs((jb ?? []) as DueJob[]);
      const proIds = Array.from(new Set((jb ?? []).map((j) => j.pro_id)));
      if (proIds.length) {
        const { data: pr } = await supabase
          .from("pros")
          .select("id,business,trade")
          .in("id", proIds);
        setPros((pr ?? []) as ProRow[]);
      }
      setLoading(false);
    })();
  }, [home]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);

  async function rebook(j: DueJob) {
    const p = proById.get(j.pro_id);
    setBusy(j.id);
    await logEvent(`homeowner:${homeownerId}`, "rebooked", {
      job_id: j.id,
      pro_id: j.pro_id,
      home_id: home?.id,
    });
    setBooked((prev) => new Set(prev).add(j.id));
    setBusy(null);
    setToast(`Rebook request sent to ${p?.business ?? "your pro"} (mock)`);
  }

  if (guardLoading) return <PageLoader label="Loading reminders" />;
  if (!home) return <NoHomeYet />;
  if (loading) return <PageLoader label="Loading reminders" />;

  const byBucket = {
    overdue: jobs.filter((j) => bucketOf(j.next_service_date) === "overdue"),
    soon: jobs.filter((j) => bucketOf(j.next_service_date) === "soon"),
    later: jobs.filter((j) => bucketOf(j.next_service_date) === "later"),
  };

  return (
    <HomeShell active="reminders">
      <HomePageHead
        eyebrow="Reminders"
        title="Service that's due"
        sub="Set by your pros when they log a job. One tap rebooks the pro who already knows the house."
      />

      {jobs.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">Nothing due</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            When a pro sets a next-service date on a job, it shows up here — no calendar to keep.
          </p>
          <div className="mt-6">
            <Link to="/home">
              <Btn variant="secondary">Back to my home</Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {BUCKETS.map(({ key, title, sub }, bi) => {
            const list = byBucket[key];
            if (list.length === 0) return null;
            return (
              <Card key={key} className={`anim-fade-up d-${bi + 1}`}>
                <div className="flex items-center gap-2">
                  <Eyebrow accent={key === "overdue" ? "red" : "coral"}>{title}</Eyebrow>
                  <span className="text-xs text-muted tnum">
                    {list.length} · {sub}
                  </span>
                </div>
                <div className="mt-2 divide-y divide-line">
                  {list.map((j) => {
                    const p = proById.get(j.pro_id);
                    return (
                      <div
                        key={j.id}
                        className="py-3.5 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{j.what_done}</div>
                          {p && (
                            <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                              <TradeIcon trade={p.trade} size={12} className="text-teal" />
                              {p.business} · {tradeLabel(p.trade)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Pill accent={key === "overdue" ? "red" : "indigo"}>
                            {formatDate(j.next_service_date)}
                          </Pill>
                          {booked.has(j.id) ? (
                            <Pill accent="teal">Request sent</Pill>
                          ) : (
                            <Btn
                              variant="coral"
                              size="sm"
                              disabled={busy === j.id}
                              onClick={() => rebook(j)}
                            >
                              {busy === j.id ? "Sending…" : "Rebook"}
                            </Btn>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
