import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { CalendarCheck } from "lucide-react";
import { Btn, Card, Eyebrow, PageLoader, Pill } from "@/lib/ui";
import { formatDate, tradeLabel } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";

export const Route = createFileRoute("/home/reminders")({
  head: () => ({ meta: [{ title: "Reminders - HomesBrain" }] }),
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
  { key: "overdue", title: "Overdue", sub: "Past due, worth a call." },
  { key: "soon", title: "Due in the next 30 days", sub: "Coming up." },
  { key: "later", title: "Later", sub: "On the schedule." },
] as const;

function Reminders() {
  const navigate = useNavigate();
  const {
    homeowner,
    home,
    jobs: allJobs,
    pros: allPros,
    loading: guardLoading,
  } = useHomeownerGuard();
  const jobs = (allJobs as unknown as DueJob[]).filter((j) => j.next_service_date);
  const pros = allPros as unknown as ProRow[];

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);

  if (guardLoading) return <PageLoader label="Loading reminders" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  const byBucket = {
    overdue: jobs.filter((j) => bucketOf(j.next_service_date) === "overdue"),
    soon: jobs.filter((j) => bucketOf(j.next_service_date) === "soon"),
    later: jobs.filter((j) => bucketOf(j.next_service_date) === "later"),
  };

  return (
    <HomeShell active="reminders" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Reminders"
        title="Service that's due"
        sub="Set by your pros when they log a job. One tap rebooks the pro who already knows the house."
      />

      {jobs.length === 0 ? (
        <Card className="anim-fade-up text-center !py-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-indigobg text-indigo">
            <CalendarCheck size={28} />
          </span>
          <h2 className="mt-4 text-2xl tracking-tight">Nothing due</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            When a pro sets a next-service date on a job, it shows up here. No calendar to keep.
          </p>
          <div className="mt-6">
            <Link to="/home">
              <Btn variant="secondary">Back to my home</Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {BUCKETS.map(({ key, title, sub }, bi) => {
            const list = byBucket[key];
            if (list.length === 0) return null;
            return (
              <Card key={key} className={`anim-fade-up d-${bi + 1} !p-4 sm:!p-5`}>
                <div className="flex items-center justify-between gap-2">
                  <Eyebrow accent={key === "overdue" ? "red" : "indigo"}>{title}</Eyebrow>
                  <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-muted tnum">
                    {list.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{sub}</p>
                <div className="mt-3 divide-y divide-line border-t border-line">
                  {list.map((j) => {
                    const p = proById.get(j.pro_id);
                    return (
                      <div key={j.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-ink">{j.what_done}</div>
                            {p && (
                              <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                                <TradeIcon trade={p.trade} size={12} className="text-indigo" />
                                {p.business} · {tradeLabel(p.trade)}
                              </div>
                            )}
                          </div>
                          <Pill accent={key === "overdue" ? "red" : "indigo"}>
                            {formatDate(j.next_service_date)}
                          </Pill>
                        </div>
                        <div className="mt-3">
                          <Link to="/home/pros" className="block">
                            <Btn variant="coral" className="w-full">
                              Rebook{p ? ` ${p.business}` : " your pro"}
                            </Btn>
                          </Link>
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
    </HomeShell>
  );
}
