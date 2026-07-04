import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Avatar, Btn, Card, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, NoHomeYet, useHomeownerGuard } from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";

export const Route = createFileRoute("/home/pros")({
  head: () => ({ meta: [{ title: "My pros — HomesBrain" }] }),
  component: MyPros,
});

type ProRow = { id: string; business: string; trade: string; service_area: string | null };
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  pro_id: string;
  next_service_date: string | null;
};

function MyPros() {
  const { homeownerId, homeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [pros, setPros] = useState<ProRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [rebooked, setRebooked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const { data: jb } = await supabase
        .from("jobs")
        .select("id,what_done,created_at,pro_id,next_service_date")
        .eq("home_id", home.id)
        .order("created_at", { ascending: false });
      setJobs((jb ?? []) as JobRow[]);
      const proIds = Array.from(new Set((jb ?? []).map((j) => j.pro_id)));
      if (proIds.length) {
        const { data: pr } = await supabase
          .from("pros")
          .select("id,business,trade,service_area")
          .in("id", proIds);
        setPros((pr ?? []) as ProRow[]);
      }
      setLoading(false);
    })();
  }, [home]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function rebook(p: ProRow) {
    setBusy(p.id);
    await logEvent(`homeowner:${homeownerId}`, "rebooked", { pro_id: p.id, home_id: home?.id });
    setRebooked((prev) => new Set(prev).add(p.id));
    setBusy(null);
    setToast(`Rebook request sent to ${p.business} (mock)`);
  }

  async function share(p: ProRow) {
    const text = `${p.business} — ${tradeLabel(p.trade)} on HomesBrain: ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied — share it with a neighbor");
    } catch {
      setToast(text);
    }
  }

  if (guardLoading) return <PageLoader label="Loading your pros" />;
  if (!home) return <NoHomeYet />;
  if (loading) return <PageLoader label="Loading your pros" />;

  return (
    <HomeShell active="pros" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="My pros"
        title="The people who know your home"
        sub="Every visit they log lands on your record. Rebook the pro who already knows the house."
      />

      <div className="space-y-6">
        {pros.length === 0 ? (
          <Card className="anim-fade-up text-center py-14">
            <h2 className="text-2xl tracking-tight">No pros yet</h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              When a pro logs a job on your home, they show up here. Invite the ones you already
              use below.
            </p>
          </Card>
        ) : (
          pros.map((p, pi) => {
            const proJobs = jobs.filter((j) => j.pro_id === p.id);
            const nextDue = proJobs
              .filter((j) => j.next_service_date)
              .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0];
            return (
              <Card key={p.id} className={`anim-fade-up d-${Math.min(pi + 1, 4)}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.business} accent="teal" size={40} />
                    <div>
                      <div className="font-semibold text-ink">{p.business}</div>
                      <div className="text-xs text-muted flex items-center gap-1.5">
                        <TradeIcon trade={p.trade} size={13} className="text-teal" />
                        {tradeLabel(p.trade)}
                        {p.service_area ? ` · ${p.service_area}` : ""} · {proJobs.length} visit
                        {proJobs.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => share(p)}
                      aria-label={`Share ${p.business}`}
                      title="Share"
                      className="pressable text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                    {rebooked.has(p.id) ? (
                      <Pill accent="teal">Request sent</Pill>
                    ) : (
                      <Btn
                        variant="coral"
                        size="sm"
                        disabled={busy === p.id}
                        onClick={() => rebook(p)}
                      >
                        {busy === p.id ? "Sending…" : "Rebook"}
                      </Btn>
                    )}
                  </div>
                </div>

                {nextDue && (
                  <div className="mt-3 rounded-xl bg-soft px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <span className="text-muted">Next service due</span>
                    <span className="font-semibold text-ink tnum">
                      {formatDate(nextDue.next_service_date)}
                    </span>
                  </div>
                )}

                <div className="mt-3 space-y-1">
                  {proJobs.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between gap-4 text-sm py-1.5 border-b border-line last:border-b-0"
                    >
                      <span className="text-muted font-mono text-xs tnum shrink-0">
                        {formatDate(j.created_at)}
                      </span>
                      <span className="font-medium text-ink text-right">{j.what_done}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}

        <InviteProsCard
          className="anim-fade-up d-4"
          homeId={home.id}
          homeownerId={homeownerId}
          knownTrades={pros.map((p) => p.trade)}
          prosCount={pros.length}
          onToast={setToast}
        />
      </div>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
