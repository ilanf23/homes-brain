import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Eyebrow, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, mockSend } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/due")({
  head: () => ({ meta: [{ title: "Due for service - HomesBrain" }] }),
  component: DueForService,
});

type DueJob = {
  id: string;
  what_done: string;
  next_service_date: string;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
  homes: { address: string } | null;
};

const DAY = 24 * 3600 * 1000;

function bucketOf(dateIso: string): "overdue" | "soon" | "later" {
  const diff = new Date(dateIso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 30 * DAY) return "soon";
  return "later";
}

const BUCKETS = [
  { key: "overdue", title: "Overdue", sub: "Past their next-service date." },
  { key: "soon", title: "Due in the next 30 days", sub: "The rebook window." },
  { key: "later", title: "Later", sub: "On the schedule." },
] as const;

function DueForService() {
  const { proId, pro } = useProGuard();
  const [jobs, setJobs] = useState<DueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,what_done,next_service_date,customers(id,name,phone,email),homes(address)")
        .eq("pro_id", proId)
        .not("next_service_date", "is", null)
        .order("next_service_date", { ascending: true });
      setJobs((data ?? []) as unknown as DueJob[]);
      setLoading(false);
    })();
  }, [proId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendNudge(j: DueJob) {
    if (!proId || !j.customers) return;
    setBusy(j.id);
    const to = j.customers.phone ?? j.customers.email ?? "";
    const body = `Hi ${j.customers.name.split(" ")[0]}, it's ${pro?.business}. Your ${j.what_done.toLowerCase()} is due for service around ${formatDate(j.next_service_date)}. Reply here or book a time and we'll take care of it.`;
    await mockSend({
      channel: j.customers.phone ? "sms" : "email",
      to,
      body,
      kind: "other",
    });
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
      job_id: j.id,
      customer_id: j.customers.id,
    });
    setNudged((prev) => new Set(prev).add(j.id));
    setBusy(null);
    setToast(`Rebook nudge sent to ${j.customers.name} (mock)`);
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="due">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  const byBucket = {
    overdue: jobs.filter((j) => bucketOf(j.next_service_date) === "overdue"),
    soon: jobs.filter((j) => bucketOf(j.next_service_date) === "soon"),
    later: jobs.filter((j) => bucketOf(j.next_service_date) === "later"),
  };

  return (
    <ProShell pro={pro} active="due">
      <ProPageHead
        eyebrow="Due for service"
        title="Win the rebook"
        sub="Jobs with a next-service date. Nudge the homeowner before someone else gets the call."
      />




      {jobs.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">Nothing scheduled yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Set a next-service date when you log a job and it lands here: your rebook pipeline.
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
        <div className="space-y-6">
          {BUCKETS.map(({ key, title, sub }, bi) => {
            const list = byBucket[key];
            if (list.length === 0) return null;
            return (
              <Card key={key} className={`anim-fade-up d-${bi + 1}`}>
                <div className="flex items-center gap-2">
                  <Eyebrow accent={key === "overdue" ? "red" : "indigo"}>{title}</Eyebrow>
                  <span className="text-xs text-muted tnum">
                    {list.length} · {sub}
                  </span>
                </div>
                <div className="mt-2 divide-y divide-line">
                  {list.map((j) => (
                    <div
                      key={j.id}
                      className="py-3.5 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">
                          {j.customers?.name ?? "-"}
                          <span className="text-muted font-normal"> · {j.what_done}</span>
                        </div>
                        <div className="text-xs text-muted">{j.homes?.address}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Pill accent={key === "overdue" ? "red" : "indigo"}>
                          {formatDate(j.next_service_date)}
                        </Pill>
                        {nudged.has(j.id) ? (
                          <span className="anim-scale-in">
                            <Pill accent="coral">Nudge sent</Pill>
                          </span>
                        ) : (
                          <Btn
                            variant="coral"
                            size="sm"
                            loading={busy === j.id}
                            disabled={!j.customers}
                            onClick={() => sendNudge(j)}
                          >
                            Send rebook nudge
                          </Btn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
