import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";

export const Route = createFileRoute("/home/")({
  head: () => ({ meta: [{ title: "My home - HomesBrain" }] }),
  component: HomeOverview,
});


type EquipmentRow = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  source: string;
};
type ProRow = { id: string; business: string; trade: string };
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  pro_id: string;
  next_service_date: string | null;
};

function HomeOverview() {
  const { homeownerId, homeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const [{ data: eq }, { data: jb }, inv] = await Promise.all([
        supabase
          .from("equipment")
          .select("id,type,make,model,warranty_until,source")
          .eq("home_id", home.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("id,what_done,created_at,pro_id,next_service_date")
          .eq("home_id", home.id)
          .order("created_at", { ascending: false }),
        listInvoicesForHome(home.id),
      ]);
      setEquipment((eq ?? []) as EquipmentRow[]);
      setJobs((jb ?? []) as JobRow[]);
      setInvoices(inv);
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
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const nextDue = useMemo(
    () =>
      jobs
        .filter((j) => j.next_service_date)
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0] ?? null,
    [jobs],
  );
  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);
  const verifiedCount = equipment.filter((e) => e.source === "pro").length;

  if (guardLoading) return <PageLoader label="Loading your home" />;
  if (!home)
    return (
      <HomeShell active="overview" homeowner={homeowner} home={null}>
        <OnboardingNoHome
          homeownerId={homeownerId}
          onCreated={() => window.location.reload()}
        />
      </HomeShell>
    );
  if (loading) return <PageLoader label="Loading your home" />;


  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="My home"
        title={home.address}
        sub="Every home remembers. Your pros write the record, you own it."
      />

      {/* The free-for-life anchor (locked in Strategy) */}
      <div className="anim-fade-up rounded-2xl bg-indigobg text-indigo px-4 py-3 text-sm font-semibold mb-6">
        This record sells as a $49 seller history report when homes change hands. Yours is free for
        life because your pros write it.
      </div>

      {/* Stat row */}
      <div className="anim-fade-up d-1 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(
          [
            [equipment.length, "Items on file"],
            [verifiedCount, "Verified by pros"],
            [pros.length, "Pros on the home"],
            [jobs.length, "Visits recorded"],
          ] as const
        ).map(([n, label]) => (
          <Card key={label} className="text-center py-4">
            <div className="text-2xl font-extrabold tracking-tight tnum">{n}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {/* On file */}
        <Card className="anim-fade-up d-2">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">On file</Eyebrow>
            <Link to="/home/add" className="text-xs font-semibold text-indigo hover:underline">
              Add something
            </Link>
          </div>
          {equipment.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet. Records from your pros will show up here.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {equipment.map((e, i) => (
                <Link
                  key={e.id}
                  to="/home/items/$itemId"
                  params={{ itemId: e.id }}
                  className="anim-fade-up rounded-xl border border-line p-3 flex items-start justify-between gap-3 hover:border-ink/20 hover:shadow-sm transition-all duration-200 block"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div>
                    <div className="font-semibold text-ink">{e.type ?? "Equipment"}</div>
                    <div className="text-sm text-muted">
                      {[e.make, e.model].filter(Boolean).join(" · ")}
                    </div>
                    {e.warranty_until && (
                      <div className="text-xs text-muted mt-1 font-mono tnum">
                        Warranty until {formatDate(e.warranty_until)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.source === "pro" ? (
                      <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-xs">
                        <ShieldCheck size={15} animate={false} /> Verified
                      </span>
                    ) : (
                      <Pill accent="amber">Self-added</Pill>
                    )}
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Next up */}
        {nextDue && (
          <Card className="anim-fade-up d-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <Eyebrow accent="indigo">Next up</Eyebrow>
                <div className="mt-2 font-semibold text-ink">{nextDue.what_done}</div>
                <div className="text-xs text-muted mt-0.5">
                  {proById.get(nextDue.pro_id)?.business ?? ""} · due{" "}
                  {formatDate(nextDue.next_service_date)}
                </div>
              </div>
              <Link to="/home/reminders">
                <Btn variant="secondary" size="sm">
                  All reminders
                </Btn>
              </Link>
            </div>
          </Card>
        )}

        {/* Invoices from pros: read-only, rendered only when there's something to show */}
        {invoices.length > 0 && (
          <Card className="anim-fade-up d-3">
            <Eyebrow accent="indigo">Invoices</Eyebrow>
            <div className="mt-3 divide-y divide-line">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {inv.pros?.business ?? "Your pro"}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {inv.items[0]?.description ?? ""}
                      {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-bold text-ink tnum">{formatMoney(Number(inv.total))}</div>
                    {inv.status === "paid" ? (
                      <Pill accent="indigo">Paid</Pill>
                    ) : isOverdue(inv) ? (
                      <Pill accent="amber">Overdue</Pill>
                    ) : (
                      <Pill accent="ink">Open</Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Sent by your pros. Pay them the way you always do; this is just your record.
            </p>
          </Card>
        )}

        {/* My pros preview */}
        <Card className="anim-fade-up d-3">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">My pros</Eyebrow>
            <Link to="/home/pros" className="text-xs font-semibold text-indigo hover:underline">
              See all
            </Link>
          </div>
          {pros.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No pros yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {pros.slice(0, 3).map((p) => {
                const visits = jobs.filter((j) => j.pro_id === p.id).length;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.business} accent="indigo" />
                      <div>
                        <div className="font-semibold text-ink">{p.business}</div>
                        <div className="text-xs text-muted flex items-center gap-1.5">
                          <TradeIcon trade={p.trade} size={13} className="text-indigo" />
                          {tradeLabel(p.trade)} · {visits} visit{visits === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <Link to="/home/pros">
                      <Btn variant="secondary" size="sm">
                        Rebook
                      </Btn>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

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
