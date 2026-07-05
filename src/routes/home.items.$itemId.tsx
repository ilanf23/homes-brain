import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, tradeLabel } from "@/lib/hb";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, NoHomeYet, useHomeownerGuard } from "@/components/home-shell";

export const Route = createFileRoute("/home/items/$itemId")({
  head: () => ({ meta: [{ title: "Item - HomesBrain" }] }),
  component: ItemDetail,
});

type EquipmentRow = {
  id: string;
  home_id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  serial: string | null;
  warranty_until: string | null;
  recall_status: string;
  recall_checked_at: string | null;
  source: string;
  created_at: string;
};
type JobRow = { id: string; what_done: string; created_at: string; pro_id: string };
type ProRow = { id: string; business: string; trade: string };

function ItemDetail() {
  const { itemId } = Route.useParams();
  const { homeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [item, setItem] = useState<EquipmentRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const { data: eq } = await supabase
        .from("equipment")
        .select(
          "id,home_id,type,make,model,serial,warranty_until,recall_status,recall_checked_at,source,created_at",
        )
        .eq("id", itemId)
        .eq("home_id", home.id)
        .maybeSingle();
      if (!eq) {
        setLoading(false);
        return;
      }
      setItem(eq as EquipmentRow);
      const { data: jb } = await supabase
        .from("jobs")
        .select("id,what_done,created_at,pro_id")
        .eq("equipment_id", itemId)
        .order("created_at", { ascending: false });
      setJobs((jb ?? []) as JobRow[]);
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
  }, [home, itemId]);

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);

  if (guardLoading) return <PageLoader label="Loading item" />;
  if (!home) return <NoHomeYet />;
  if (loading) return <PageLoader label="Loading item" />;

  if (!item) {
    return (
      <HomeShell active="overview" homeowner={homeowner} home={home}>
        <Card className="anim-fade-up text-center py-14">
          <h1 className="text-2xl tracking-tight">Item not found</h1>
          <p className="mt-2 text-sm text-muted">This item isn't on your home's record.</p>
          <div className="mt-6">
            <Link to="/home">
              <Btn variant="secondary">Back to my home</Btn>
            </Link>
          </div>
        </Card>
      </HomeShell>
    );
  }

  const recallClean = item.recall_status === "none";

  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      <Link
        to="/home"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> My home
      </Link>

      <HomePageHead
        eyebrow="On file"
        title={item.type ?? "Equipment"}
        sub={[item.make, item.model].filter(Boolean).join(" · ") || undefined}
        action={
          item.source === "pro" ? (
            <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-sm">
              <ShieldCheck size={17} animate={false} /> Verified
            </span>
          ) : (
            <Pill accent="amber">Self-added</Pill>
          )
        }
      />

      <div className="space-y-6">
        {/* Nameplate */}
        <Card className="anim-fade-up d-1">
          <Eyebrow accent="indigo">Nameplate</Eyebrow>
          <div className="mt-2">
            <KV k="Make" v={item.make ?? "-"} />
            <KV k="Model" v={item.model ?? "-"} />
            <KV k="Serial" v={item.serial ?? "-"} />
            <KV k="On record since" v={formatDate(item.created_at)} />
            <KV
              k="Warranty"
              v={item.warranty_until ? `Until ${formatDate(item.warranty_until)}` : "-"}
            />
          </div>
        </Card>

        {/* Recall status */}
        <Card className="anim-fade-up d-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Eyebrow accent={recallClean ? "indigo" : "red"}>Recall check</Eyebrow>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                {recallClean ? (
                  <>
                    <ShieldCheck size={16} animate={false} className="text-indigo" />
                    <span className="text-ink">No known recalls</span>
                  </>
                ) : (
                  <Pill accent="red">{item.recall_status}</Pill>
                )}
              </div>
              {item.recall_checked_at && (
                <div className="text-xs text-muted mt-1 font-mono tnum">
                  Checked {formatDate(item.recall_checked_at)} against the CPSC database
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* History */}
        <Card className="anim-fade-up d-3">
          <Eyebrow accent="indigo">History</Eyebrow>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No visits recorded for this item yet.</p>
          ) : (
            <div className="mt-4 relative pl-6">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" aria-hidden="true" />
              <div className="space-y-5">
                {jobs.map((j, i) => {
                  const p = proById.get(j.pro_id);
                  return (
                    <div
                      key={j.id}
                      className="anim-fade-up relative"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <span
                        className="absolute -left-6 top-1 w-[15px] h-[15px] rounded-full border-2 border-indigo bg-indigobg"
                        aria-hidden="true"
                      />
                      <div className="text-xs text-muted font-mono tnum">
                        {formatDate(j.created_at)}
                      </div>
                      <div className="font-semibold text-ink text-sm mt-0.5">{j.what_done}</div>
                      {p && (
                        <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                          <TradeIcon trade={p.trade} size={12} className="text-indigo" />
                          {p.business} · {tradeLabel(p.trade)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </HomeShell>
  );
}
