import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  ReceiptText,
  Star,
  Users,
} from "lucide-react";
import { Btn, Card, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl } from "@/lib/hb";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/pro/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - HomesBrain" }] }),
  component: ProDashboard,
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

function timeOfDayGreetingKey():
  | "pi.greeting.morning"
  | "pi.greeting.afternoon"
  | "pi.greeting.evening" {
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

function ProDashboard() {
  const t = useT();
  const { proId, pro } = useProGuard();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [reviewAsks7d, setReviewAsks7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: rv }] = await Promise.all([
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
      ]);
      if (cancelled) return;
      const mapped: FollowUpRow[] = (
        (j ?? []) as unknown as Array<{
          id: string;
          what_done: string;
          next_service_date: string | null;
          customers: FollowUpRow["customer"];
          homes: { address: string } | null;
          equipment: { type: string | null } | null;
        }>
      ).map((row) => ({
        id: row.id,
        what_done: row.what_done,
        next_service_date: row.next_service_date,
        equipment_type: row.equipment?.type ?? null,
        customer: row.customers,
        address: row.homes?.address ?? null,
      }));
      setRows(mapped);
      setReviewAsks7d(rv?.length ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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
      <ProShell pro={pro} active="dashboard">
        <ProPageSkeleton variant="list" />
      </ProShell>
    );
  }

  const firstName = (pro.owner_first_name?.trim() || pro.business?.split(" ")[0] || "").trim();
  const greetingWord = t(timeOfDayGreetingKey());
  const greeting = firstName ? `${greetingWord}, ${firstName}.` : `${greetingWord}.`;

  const googleConnected = isGoogleUrl(pro.google_place_id) && pro.google_rating != null;

  return (
    <ProShell pro={pro} active="dashboard">
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
      </div>

      <section className="anim-fade-up d-2 mt-8">
        <h2 className="text-lg font-semibold text-ink mb-3">{t("pi.whatsNext")}</h2>

        {customerBuckets.total === 0 ? (
          <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <Check size={16} strokeWidth={2.5} />
            <span>{t("pi.allCaughtUp")}</span>
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
                    {customerBuckets.toSet.length} {t("pi.toSet")}
                  </span>
                )}
                {customerBuckets.upcoming.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-soft text-ink px-3 py-1 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-muted" />
                    {customerBuckets.upcoming.length} {t("pi.upcoming")}
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

      {/* One tap to every working surface, so the slim sidebar never hides
          anything: the dashboard is the map. */}
      <section className="anim-fade-up d-3 mt-8">
        <h2 className="text-lg font-semibold text-ink mb-3">{t("pi.quickLinks")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(
            [
              { to: "/pro/customers", labelKey: "pro.nav.customers", icon: Users },
              { to: "/pro/invoices", labelKey: "pro.nav.invoices", icon: ReceiptText },
              { to: "/pro/records", labelKey: "pro.nav.records", icon: FileText },
              { to: "/pro/due", labelKey: "pro.nav.due", icon: CalendarClock },
              { to: "/pro/reviews", labelKey: "pro.nav.reviews", icon: Star },
            ] as const
          ).map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="pressable liftable flex flex-col gap-2.5 rounded-2xl border border-line bg-paper px-4 py-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigobg text-indigo">
                <Icon size={17} />
              </span>
              <span className="text-sm font-semibold text-ink">{t(labelKey)}</span>
            </Link>
          ))}
        </div>
      </section>

      {googleConnected && (
        <section className="anim-fade-up d-4 mt-8">
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted">
                {reviewAsks7d > 0 ? t("pi.niceWeek") : t("pi.thisWeek")}
              </div>
              <div className="mt-0.5 text-xl font-semibold text-ink">
                {pro.google_rating} ★ {t("pi.onGoogle")}
              </div>
              {reviewAsks7d > 0 && (
                <div className="mt-0.5 text-sm text-muted">
                  {reviewAsks7d}{" "}
                  {reviewAsks7d === 1 ? t("pi.reviewAsk.one") : t("pi.reviewAsk.other")}
                </div>
              )}
            </div>
            <Link to="/pro/reviews" className="shrink-0">
              <Btn variant="ghost" size="sm">
                {t("pi.reviewsCta")}
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
          <span>{t("pi.officeLink")}</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
