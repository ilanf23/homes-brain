import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, tradeLabel } from "@/lib/hb";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import {
  fetchAllTradeFields,
  formatAttrValue,
  humanizeKey,
  type TradeField,
} from "@/lib/trade-fields";

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
  source: string;
  created_at: string;
  attributes: Record<string, string | boolean> | null;
};
type JobRow = { id: string; what_done: string; created_at: string; pro_id: string };
type ProRow = { id: string; business: string; trade: string };

function ItemDetail() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const {
    homeowner,
    home,
    equipment,
    jobs: allJobs,
    pros: allPros,
    loading: guardLoading,
  } = useHomeownerGuard();
  const item = useMemo(
    () => (equipment.find((e) => e.id === itemId) as unknown as EquipmentRow | undefined) ?? null,
    [equipment, itemId],
  );
  const jobs = (allJobs as unknown as JobRow[]).filter(
    (j) => (j as JobRow & { equipment_id?: string }).equipment_id === itemId,
  );
  const pros = allPros as unknown as ProRow[];

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  // Fetch all trade-field defs so we can label attribute keys with the config's
  // human labels/units. Fallback to a humanized key when a def isn't found.
  const [fieldDefs, setFieldDefs] = useState<Map<string, TradeField>>(new Map());
  useEffect(() => {
    let cancelled = false;
    fetchAllTradeFields().then((all) => {
      if (cancelled) return;
      setFieldDefs(new Map(all.map((f) => [`${f.trade_id}:${f.key}`, f])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);

  const attributeEntries = useMemo(() => {
    const attrs = item?.attributes;
    if (!attrs || typeof attrs !== "object")
      return [] as Array<{ key: string; label: string; value: string }>;
    const out: Array<{ key: string; label: string; value: string; sort: number }> = [];
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === "") continue;
      // Match by key across any trade (attributes are stored without a trade id).
      let def: TradeField | undefined;
      for (const f of fieldDefs.values()) {
        if (f.key === key) {
          def = f;
          break;
        }
      }
      out.push({
        key,
        label: def?.label ?? humanizeKey(key),
        value: formatAttrValue(value, def),
        sort: def?.sort_order ?? 999,
      });
    }
    return out.sort((a, b) => a.sort - b.sort);
  }, [item, fieldDefs]);

  if (guardLoading) return <PageLoader label="Loading item" />;
  if (!home) return <PageLoader label="Setting up your home" />;

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

        {/* Trade-specific details from equipment.attributes. Labels/units come
            from the trade_fields config; unknown keys fall back to a humanized
            version so nothing goes missing. */}
        {attributeEntries.length > 0 && (
          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Details</Eyebrow>
            <div className="mt-2">
              {attributeEntries.map((e) => (
                <KV key={e.key} k={e.label} v={e.value} />
              ))}
            </div>
          </Card>
        )}

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
