import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ChevronRight, Plus } from "lucide-react";
import { Btn, Card, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl, logEvent, mockSend } from "@/lib/hb";
import { reverseGeocode } from "@/lib/geo";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { ProSetupChecklist } from "@/components/pro-setup-checklist";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "HomesBrain" }] }),
  component: ProHome,
});

const DAY = 24 * 3600 * 1000;
const DUE_WINDOW = 14 * DAY;
const MAX_NEEDS = 4;

type DueRow = {
  id: string;
  what_done: string;
  next_service_date: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  address: string | null;
};

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ProHome() {
  const { proId, pro } = useProGuard();
  const [due, setDue] = useState<DueRow[]>([]);
  const [reviewAsks7d, setReviewAsks7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locationText, setLocationText] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);

  // Load only what this screen needs: upcoming/overdue jobs and a review count.
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: rv }, { count: totalJobCount }] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,what_done,next_service_date,customers(id,name,phone,email),homes(address)",
          )
          .eq("pro_id", proId)
          .not("next_service_date", "is", null)
          .order("next_service_date", { ascending: true }),
        supabase
          .from("events")
          .select("id", { count: "exact", head: false })
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .gte("created_at", new Date(Date.now() - 7 * DAY).toISOString()),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("pro_id", proId),
      ]);
      if (cancelled) return;
      const rows: DueRow[] = ((j ?? []) as unknown as Array<{
        id: string;
        what_done: string;
        next_service_date: string | null;
        customers: DueRow["customer"];
        homes: { address: string } | null;
      }>)
        .filter(
          (row) =>
            row.next_service_date &&
            new Date(row.next_service_date).getTime() - Date.now() <= DUE_WINDOW,
        )
        .map((row) => ({
          id: row.id,
          what_done: row.what_done,
          next_service_date: row.next_service_date!,
          customer: row.customers,
          address: row.homes?.address ?? null,
        }));
      setDue(rows);
      setReviewAsks7d(rv?.length ?? 0);
      setJobCount(totalJobCount ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  // Location chip: silent if permission denied or geocode fails.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (r?.address) setLocationText(r.address);
      },
      () => {
        /* denied or unavailable — omit chip */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const needs = useMemo(() => due.slice(0, MAX_NEEDS), [due]);

  async function remind(row: DueRow) {
    const c = row.customer;
    if (!c || (!c.phone && !c.email) || !pro) return;
    setBusy(row.id);
    const body = `Hi ${c.name.split(" ")[0]}, it's ${pro.business}. Your ${row.what_done.toLowerCase()} is due for service around ${formatDate(row.next_service_date)}. Reply here and we'll get you on the schedule.`;
    await mockSend({
      channel: c.phone ? "sms" : "email",
      to: c.phone ?? c.email ?? "",
      body,
      kind: "other",
    });
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
      job_id: row.id,
      customer_id: c.id,
    });
    setReminded((prev) => new Set(prev).add(row.id));
    setBusy(null);
    setToast(`Reminder sent to ${c.name.split(" ")[0]}`);
  }

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="home">
        <ProPageSkeleton variant="list" />
      </ProShell>
    );
  }

  const firstName =
    (pro.owner_first_name?.trim() || pro.business?.split(" ")[0] || "").trim();
  const greeting = firstName
    ? `${timeOfDayGreeting()}, ${firstName}.`
    : `${timeOfDayGreeting()}.`;

  const googleConnected = isGoogleUrl(pro.google_place_id) && pro.google_rating != null;

  return (
    <ProShell pro={pro} active="home">
      {/* Greeting */}
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
        {locationText && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1.5 text-xs text-muted">
            <MapPin size={13} className="text-indigo" />
            <span>
              You're at <span className="text-ink font-semibold">{locationText}</span>
            </span>
          </div>
        )}
      </div>

      {/* Hero action: the one thing this screen exists to make easy. */}
      <Link to="/pro/jobs/new" className="anim-fade-up d-1 block mt-6">
        <button
          type="button"
          className="pressable w-full rounded-3xl bg-indigo text-white text-left px-6 py-7 sm:px-8 sm:py-9 shadow-[0_18px_40px_-14px_rgba(71,63,176,0.55)] hover:shadow-[0_22px_48px_-14px_rgba(71,63,176,0.65)] transition-shadow"
        >
          <div className="flex items-center gap-5">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 shrink-0">
              <Plus size={32} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-bold leading-tight">Log a job</div>
              <div className="mt-1 text-sm sm:text-base text-white/85">
                30 seconds. Just talk and tap.
              </div>
            </div>
          </div>
        </button>
      </Link>

      <ProSetupChecklist proId={proId} />

      {/* Who needs you */}
      <section className="anim-fade-up d-2 mt-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Who needs you</h2>
        {needs.length === 0 ? (
          <Card className="text-sm text-muted">
            No one's due right now. When a job's next service date comes up, it'll show here.
          </Card>
        ) : (
          <div className="space-y-3">
            {needs.map((row) => {
              const overdue = new Date(row.next_service_date).getTime() < Date.now();
              const c = row.customer;
              const canRemind = !!(c && (c.phone || c.email));
              const isReminded = reminded.has(row.id);
              return (
                <Card key={row.id} className="!p-4 sm:!p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg font-semibold text-ink truncate">
                        {c?.name ?? "Customer"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink/80">{row.what_done}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Pill accent={overdue ? "coral" : "indigo"}>
                          {overdue
                            ? `Overdue since ${formatDate(row.next_service_date)}`
                            : `Due ${formatDate(row.next_service_date)}`}
                        </Pill>
                        {row.address && (
                          <span className="text-xs text-muted truncate">{row.address}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isReminded ? (
                        <Pill accent="indigo">Reminded</Pill>
                      ) : (
                        <Btn
                          variant="indigo"
                          size="md"
                          loading={busy === row.id}
                          disabled={!canRemind}
                          onClick={() => remind(row)}
                          aria-label={`Send reminder to ${c?.name ?? "customer"}`}
                        >
                          Remind
                        </Btn>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* One small win: rating on Google (only if connected) */}
      {googleConnected && (
        <section className="anim-fade-up d-3 mt-8">
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted">
                {reviewAsks7d > 0 ? "Nice week" : "This week"}
              </div>
              <div className="mt-0.5 text-xl font-semibold text-ink">
                {pro.google_rating} ★ on Google
              </div>
              {reviewAsks7d > 0 && (
                <div className="mt-0.5 text-sm text-muted">
                  {reviewAsks7d} review {reviewAsks7d === 1 ? "ask" : "asks"} sent in the last 7 days
                </div>
              )}
            </div>
            <Link to="/pro/reviews" className="shrink-0">
              <Btn variant="ghost" size="sm">
                Reviews
              </Btn>
            </Link>
          </Card>
        </section>
      )}

      {/* Quiet office link */}
      <div className="anim-fade-up d-4 mt-10 mb-4">
        <Link
          to="/pro/office"
          className="pressable flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          <span>My numbers, map and customers</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
