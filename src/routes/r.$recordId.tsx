import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";

export const Route = createFileRoute("/r/$recordId")({
  head: () => ({ meta: [{ title: "Your service record — HomesBrain" }] }),
  component: PublicRecord,
});

type RecordView = {
  id: string;
  viewed_at: string | null;
  jobs: {
    what_done: string;
    next_service_date: string | null;
    created_at: string;
    pros: { id: string; business: string; trade: string; google_rating: number | null; google_place_id: string | null } | null;
    homes: { id: string; address: string; claimed_by_homeowner: string | null } | null;
    equipment: { type: string | null; make: string | null; model: string | null; warranty_until: string | null; recall_status: string } | null;
    customers: { name: string } | null;
  } | null;
};

function PublicRecord() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [rec, setRec] = useState<RecordView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(`
          id, viewed_at,
          jobs!inner(
            what_done, next_service_date, created_at,
            pros(id,business,trade,google_rating,google_place_id),
            homes(id,address,claimed_by_homeowner),
            equipment(type,make,model,warranty_until,recall_status),
            customers(name)
          )
        `)
        .eq("id", recordId)
        .maybeSingle();
      setRec(data as unknown as RecordView);
      setLoading(false);
      if (data && !(data as RecordView).viewed_at) {
        await supabase.from("records").update({ viewed_at: new Date().toISOString() }).eq("id", recordId);
        await logEvent(null, "record_viewed", { record_id: recordId });
      }
    })();
  }, [recordId]);

  if (loading) return <div className="min-h-screen bg-soft flex items-center justify-center text-muted">Loading record…</div>;
  if (!rec || !rec.jobs) return <div className="min-h-screen bg-soft flex items-center justify-center text-muted">Record not found.</div>;

  const j = rec.jobs;
  const pro = j.pros;
  const eq = j.equipment;
  const isClaimed = !!j.homes?.claimed_by_homeowner;

  return (
    <div className="min-h-screen bg-soft">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-2xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-indigo" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <Pill accent="coral">Your record</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-10 space-y-5">
        <Card className="shadow-[0_24px_60px_-30px_rgba(20,20,15,0.18)]">
          <div className="flex items-center gap-3">
            <Avatar name={pro?.business ?? "?"} accent="teal" size={52} />
            <div>
              <div className="font-extrabold text-ink text-lg">{pro?.business}</div>
              <div className="text-xs text-muted">
                {tradeLabel(pro?.trade)}{pro?.google_rating ? ` · ${pro.google_rating} ★` : ""}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Eyebrow accent="coral">Service record</Eyebrow>
            <div className="text-sm text-muted mt-1">{formatDate(j.created_at)} · {j.homes?.address}</div>
          </div>

          <div className="mt-4">
            <KV k="Equipment" v={eq?.type ?? "—"} />
            <KV k="Make / Model" v={[eq?.make, eq?.model].filter(Boolean).join(" · ") || "—"} />
            <KV k="Warranty until" v={formatDate(eq?.warranty_until) || "—"} />
            <KV k="Recall status" v={<Pill accent="teal">No known recalls, checked today</Pill>} />
            <KV k="Work done" v={j.what_done} />
            <KV k="Next service" v={formatDate(j.next_service_date) || "—"} />
          </div>
        </Card>

        {!isClaimed && (
          <Card className="bg-coralbg border-coral/20">
            <Eyebrow accent="coral">Own your home's history</Eyebrow>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Claim your home, free.</h2>
            <p className="mt-2 text-sm text-ink/80">
              Keep every service record in one place. Add the other pros who work on your home. Yours for life.
            </p>
            <div className="mt-4">
              <Btn variant="coral" size="lg" className="w-full" onClick={() => navigate({ to: "/claim/$recordId", params: { recordId } })}>
                Claim your home, free
              </Btn>
            </div>
          </Card>
        )}

        {isClaimed && (
          <Card>
            <Pill accent="teal">Claimed</Pill>
            <div className="mt-2 text-sm text-ink">This home is in your HomesBrain.</div>
            <Link to="/home" className="block mt-3"><Btn variant="coral" className="w-full">Go to my home</Btn></Link>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Btn variant="secondary">Leave {pro?.business} a review</Btn>
          <Btn variant="secondary">Rebook {pro?.business}</Btn>
        </div>

        <p className="text-center text-xs text-muted px-4">
          Recall status sourced from public manufacturer notices and never guaranteed absolute.
        </p>
      </div>
    </div>
  );
}
