import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Btn, Card } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, haversineMeters } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/records/")({
  head: () => ({ meta: [{ title: "Records - HomesBrain" }] }),
  component: RecordsList,
});

type RecordRow = {
  id: string;
  created_at: string;
  viewed_at: string | null;
  sent_sms_at: string | null;
  sent_email_at: string | null;
  jobs: {
    what_done: string;
    customers: { name: string; phone: string | null; email: string | null } | null;
    homes: { claimed_at: string | null; lat: number | null; lng: number | null } | null;
  } | null;
};

/* How close the pro has to be for a home's records to count as "here" and
   float to the top. Log-a-job matches a home at 60m; a list can be a touch
   more forgiving of GPS drift. */
const HERE_METERS = 80;

/* Short and calm: drop the year when it's this one, so most rows read "Jul 15". */
function shortDate(iso: string) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function RecordsList() {
  const { proId, pro } = useProGuard();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(
          "id,created_at,viewed_at,sent_sms_at,sent_email_at,jobs!inner(pro_id,what_done,customers(name,phone,email),homes(claimed_at,lat,lng))",
        )
        .eq("jobs.pro_id", proId)
        .order("created_at", { ascending: false });
      setRecords((data ?? []) as unknown as RecordRow[]);
      setLoading(false);
    })();
  }, [proId]);

  /* Ask where the pro is standing. Silent and non-blocking: no geolocation, or
     a declined prompt, just leaves the normal list. */
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  /* The home the pro is at right now, pinned; everything else below. Both keep
     the newest-first order from the query. */
  const { here, rest } = useMemo(() => {
    if (!gps) return { here: [] as RecordRow[], rest: records };
    const here: RecordRow[] = [];
    const rest: RecordRow[] = [];
    for (const r of records) {
      const h = r.jobs?.homes;
      if (
        h &&
        h.lat != null &&
        h.lng != null &&
        haversineMeters(gps, { lat: h.lat, lng: h.lng }) <= HERE_METERS
      ) {
        here.push(r);
      } else {
        rest.push(r);
      }
    }
    return { here, rest };
  }, [gps, records]);

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="records">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="records">
      <ProPageHead eyebrow="Records" title="Your records" />

      {records.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No records yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Log a job and we'll send your customer a record of the work. It shows up here.
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
        <div className="anim-fade-up d-1 space-y-5">
          {/* The home the pro is standing at: one soft indigo group, the pin
              said once, not on every row. */}
          {here.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 px-3 text-[13px] font-bold text-indigo">
                <MapPin size={14} className="shrink-0" aria-hidden="true" />
                You're here
              </div>
              <Card className="!p-1.5 border border-indigo/20 bg-indigobg/60">
                <div className="divide-y divide-indigo/10">
                  {here.map((r) => (
                    <RecordRow key={r.id} r={r} pinned showName={false} />
                  ))}
                </div>
              </Card>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              {here.length > 0 && (
                <div className="mb-2 px-3 text-[13px] font-bold text-muted">Earlier</div>
              )}
              <Card className="!p-1.5">
                <div className="divide-y divide-line">
                  {rest.map((r) => (
                    <RecordRow key={r.id} r={r} />
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>
      )}
    </ProShell>
  );
}

/* One record, one glance: the work leads, the rest whispers. A single dot is
   the only color, and it carries the status, faint (Sent) to indigo (Seen) to
   coral (Claimed). */
function RecordRow({
  r,
  pinned = false,
  showName = true,
}: {
  r: RecordRow;
  pinned?: boolean;
  showName?: boolean;
}) {
  const claimed = Boolean(r.jobs?.homes?.claimed_at);
  const seen = Boolean(r.viewed_at);
  const name = r.jobs?.customers?.name ?? "Customer";
  const status = claimed
    ? { dot: "bg-coral", label: "Claimed" }
    : seen
      ? { dot: "bg-indigo", label: "Seen" }
      : { dot: "bg-line", label: "Sent" };

  return (
    <Link
      to="/pro/records/$recordId"
      params={{ recordId: r.id }}
      className={`pressable flex items-center gap-3 rounded-xl px-3 py-3.5 transition-colors ${
        pinned ? "hover:bg-white/50" : "hover:bg-soft"
      }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{r.jobs?.what_done}</div>
        {showName && <div className="truncate text-[13px] text-muted">{name}</div>}
      </div>
      <time className="shrink-0 text-[13px] text-muted tnum" dateTime={r.created_at}>
        {shortDate(r.created_at)}
      </time>
      <span className="sr-only">{status.label}</span>
    </Link>
  );
}
