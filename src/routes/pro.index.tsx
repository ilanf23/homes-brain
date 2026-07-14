import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ChevronRight, Plus, ChevronDown, Check } from "lucide-react";
import { Btn, Card, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl } from "@/lib/hb";
import { reverseGeocode } from "@/lib/geo";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { ProSetupChecklist } from "@/components/pro-setup-checklist";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "HomesBrain" }] }),
  component: ProHome,
});

const DAY = 24 * 3600 * 1000;

type FollowUpRow = {
  id: string;
  what_done: string;
  next_service_date: string | null;
  equipment_type: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  address: string | null;
};

function timeOfDayGreetingKey(): "pi.greeting.morning" | "pi.greeting.afternoon" | "pi.greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "pi.greeting.morning";
  if (h < 18) return "pi.greeting.afternoon";
  return "pi.greeting.evening";
}




type CustomerBucketRow = {
  customerId: string;
  name: string;
  date: string | null;
};

function ProHome() {
  const t = useT();
  const { proId, pro } = useProGuard();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [reviewAsks7d, setReviewAsks7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locationText, setLocationText] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: rv }, { count: totalJobCount }] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,what_done,next_service_date,no_follow_up,follow_up_handled_at,customers(id,name,phone,email),homes(address),equipment(type)",
          )
          .eq("pro_id", proId)
          .eq("no_follow_up", false)
          .is("follow_up_handled_at", null)
          .order("next_service_date", { ascending: true, nullsFirst: true }),
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
      const mapped: FollowUpRow[] = ((j ?? []) as unknown as Array<{
        id: string;
        what_done: string;
        next_service_date: string | null;
        customers: FollowUpRow["customer"];
        homes: { address: string } | null;
        equipment: { type: string | null } | null;
      }>).map((row) => ({
        id: row.id,
        what_done: row.what_done,
        next_service_date: row.next_service_date,
        equipment_type: row.equipment?.type ?? null,
        customer: row.customers,
        address: row.homes?.address ?? null,
      }));
      setRows(mapped);
      setReviewAsks7d(rv?.length ?? 0);
      setJobCount(totalJobCount ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (r?.address) setLocationText(r.address);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Group open follow-up jobs by customer. A customer with any undated job goes
  // in "to set"; otherwise, take their soonest upcoming date for "upcoming".
  const customerBuckets = useMemo(() => {
    const byCustomer = new Map<
      string,
      { name: string; needsDate: boolean; soonest: string | null }
    >();
    for (const r of rows) {
      if (!r.customer) continue;
      const key = r.customer.id;
      const prev = byCustomer.get(key) ?? {
        name: r.customer.name,
        needsDate: false,
        soonest: null,
      };
      if (!r.next_service_date) {
        prev.needsDate = true;
      } else if (!prev.soonest || r.next_service_date < prev.soonest) {
        prev.soonest = r.next_service_date;
      }
      byCustomer.set(key, prev);
    }
    const toSet: CustomerBucketRow[] = [];
    const upcoming: CustomerBucketRow[] = [];
    for (const [customerId, v] of byCustomer) {
      if (v.needsDate) {
        toSet.push({ customerId, name: v.name, date: null });
      } else if (v.soonest) {
        upcoming.push({ customerId, name: v.name, date: v.soonest });
      }
    }
    toSet.sort((a, b) => a.name.localeCompare(b.name));
    upcoming.sort((a, b) => (a.date! < b.date! ? -1 : 1));
    return { toSet, upcoming, total: toSet.length + upcoming.length };
  }, [rows]);


  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="home" hideMobileCta>
        <ProPageSkeleton variant="list" />
      </ProShell>
    );
  }

  const firstName =
    (pro.owner_first_name?.trim() || pro.business?.split(" ")[0] || "").trim();
  const greetingWord = t(timeOfDayGreetingKey());
  const greeting = firstName ? `${greetingWord}, ${firstName}.` : `${greetingWord}.`;

  const googleConnected = isGoogleUrl(pro.google_place_id) && pro.google_rating != null;


  return (
    <ProShell pro={pro} active="home" hideMobileCta>
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
        {locationText && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1.5 text-xs text-muted">
            <MapPin size={13} className="text-indigo" />
            <span>
              {t("pi.youreAt")} <span className="text-ink font-semibold">{locationText}</span>
            </span>
          </div>
        )}
      </div>

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
                {jobCount === 0
                  ? "Start with one you already did — 30 seconds."
                  : "30 seconds. Just talk and tap."}
              </div>
            </div>
          </div>
        </button>
      </Link>

      <ProSetupChecklist proId={proId} />

      {/* What's Next */}
      <section className="anim-fade-up d-2 mt-8">
        <h2 className="text-lg font-semibold text-ink mb-3">What's Next</h2>

        {customerBuckets.total === 0 ? (
          <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <Check size={16} strokeWidth={2.5} />
            <span>You're all caught up</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="pressable w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-4 text-left hover:bg-soft transition-colors"
              aria-expanded={expanded}
            >
              <div className="flex flex-wrap items-center gap-2">
                {customerBuckets.toSet.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amberbg text-amberdark px-3 py-1 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber" />
                    {customerBuckets.toSet.length} to set
                  </span>
                )}
                {customerBuckets.upcoming.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-soft text-ink px-3 py-1 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-muted" />
                    {customerBuckets.upcoming.length} upcoming
                  </span>
                )}
              </div>
              <ChevronDown
                size={20}
                className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            {expanded && (
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper overflow-hidden">
                {customerBuckets.toSet.map((c) => (
                  <li key={c.customerId}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/pro/customers/$customerId",
                          params: { customerId: c.customerId },
                        })
                      }
                      className="pressable w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-soft transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber shrink-0" />
                      <span className="min-w-0 flex-1 block text-base font-semibold text-ink truncate">
                        {c.name}
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
                {customerBuckets.upcoming.map((c) => (
                  <li key={c.customerId}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/pro/customers/$customerId",
                          params: { customerId: c.customerId },
                        })
                      }
                      className="pressable w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-soft transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-ink truncate">
                          {c.name}
                        </span>
                        {c.date && (
                          <span className="block text-xs text-muted tnum">
                            {formatDate(c.date)}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>




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

