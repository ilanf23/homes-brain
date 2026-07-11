import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Card, Eyebrow, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { CountUp } from "@/components/svg";
import { GoogleConnect } from "@/components/google-connect";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/reviews")({
  head: () => ({ meta: [{ title: "Reviews - HomesBrain" }] }),
  component: Reviews,
});

type ReviewEvent = { id: string; created_at: string; props: { customer_id?: string } };

function Reviews() {
  const { proId, pro, setPro } = useProGuard();
  const [requests, setRequests] = useState<ReviewEvent[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const [{ data: ev }, { data: cust }] = await Promise.all([
        supabase
          .from("events")
          .select("id,created_at,props")
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name").eq("pro_id", proId),
      ]);
      setRequests((ev ?? []) as unknown as ReviewEvent[]);
      setNames(Object.fromEntries((cust ?? []).map((c) => [c.id, c.name])));
      setLoading(false);
    })();
  }, [proId]);

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="reviews">
        <ProPageSkeleton variant="dashboard" />
      </ProShell>
    );
  }

  const connected = !!pro.google_place_id;

  return (
    <ProShell pro={pro} active="reviews">
      <ProPageHead
        eyebrow="Reviews"
        title="Google reviews"
        sub="Review asks are on automatically — every record we send includes one. Connecting Google is optional: it routes asks to your listing, shows your rating, and helps you get Verified & rank higher."
      />
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigobg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo">
        Reviews are always free
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 max-w-lg">
        <Card lift className="anim-fade-up d-1">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">
            Review asks sent
          </div>
          <div className="mt-2 text-3xl font-semibold font-display">
            <CountUp value={requests.length} />
          </div>
        </Card>
        <Card lift className="anim-fade-up d-2">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Google rating</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-3xl font-semibold font-display tnum">
              {connected && pro.google_rating ? pro.google_rating : "-"}
            </div>
            {connected && <Star size={20} className="text-coral fill-coralbg" />}
          </div>
          {!connected && <div className="text-xs text-muted mt-1">Not connected yet</div>}
        </Card>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Card className="anim-fade-up d-2">
          <Eyebrow accent="indigo">Review asks</Eyebrow>
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              None yet. A review ask goes out automatically with every record you send.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-line">
              {requests.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="font-semibold text-ink">
                    {(r.props?.customer_id && names[r.props.customer_id]) ?? "Customer"}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted font-mono tnum">
                      {formatDate(r.created_at)}
                    </div>
                    <Pill accent="indigo">Requested</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="anim-fade-up d-3">
            <Eyebrow accent="indigo">Google connection</Eyebrow>
            {proId && (
              <GoogleConnect
                proId={proId}
                pro={pro}
                onUpdated={(patch) => setPro({ ...pro, ...patch })}
                onToast={setToast}
              />
            )}
          </Card>

          <Card className="anim-fade-up d-4 bg-redbg/40 border-red/15">
            <Eyebrow accent="red">The rule we follow</Eyebrow>
            <p className="mt-2 text-sm text-ink">
              <strong>No review gating.</strong> Every homeowner gets the same Google review ask,
              and everyone also gets a private feedback path. We never filter who gets asked based
              on how happy they seem. It's an FTC rule, and it keeps your rating trustworthy.
            </p>
            <p className="mt-2 text-xs text-muted">
              Google doesn't tell us which review came from which ask, so "asks sent" is the number
              we can track; your rating reflects what lands.
            </p>
          </Card>
        </div>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
