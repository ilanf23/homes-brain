import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Btn, Card } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl } from "@/lib/hb";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { useProSetup } from "@/components/pro-setup-checklist";

import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/pro/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - HomesBrain" }] }),
  component: ProDashboard,
});

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

/* One customer's follow-up state, flattened into a single ordered list so the
   dashboard can lift the single most urgent one into the top action. */
type ActionRow = {
  customerId: string;
  name: string;
  kind: "toSet" | "upcoming";
  date: string | null;
};

function ProDashboard() {
  const t = useT();
  const { proId, pro } = useProGuard();
  const navigate = useNavigate();
  const setup = useProSetup(proId);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const { data: j } = await supabase
        .from("jobs")
        .select(
          "id,what_done,next_service_date,no_follow_up,follow_up_handled_at,customers(id,name,phone,email),homes(address),equipment(type)",
        )
        .eq("pro_id", proId)
        .eq("no_follow_up", false)
        .is("follow_up_handled_at", null)
        .order("next_service_date", { ascending: true, nullsFirst: true });
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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  /* Collapse the raw jobs into one row per customer, then order them: the ones
     that still need a next-service date (amber, most urgent) come first, then
     the soonest upcoming. The head of this list is the top action. */
  const actions = useMemo<ActionRow[]>(() => {
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
    const toSet: ActionRow[] = [];
    const upcoming: ActionRow[] = [];
    for (const [customerId, v] of byCustomer) {
      if (v.needsDate) {
        toSet.push({ customerId, name: v.name, kind: "toSet", date: null });
      } else if (v.soonest) {
        upcoming.push({ customerId, name: v.name, kind: "upcoming", date: v.soonest });
      }
    }
    toSet.sort((a, b) => a.name.localeCompare(b.name));
    upcoming.sort((a, b) => (a.date! < b.date! ? -1 : 1));
    return [...toSet, ...upcoming];
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

  const topAction = actions[0] ?? null;
  const rest = actions.slice(1);
  const restToSet = rest.filter((a) => a.kind === "toSet").length;
  const restUpcoming = rest.filter((a) => a.kind === "upcoming").length;
  const setupPct = setup.total ? Math.round((setup.completed / setup.total) * 100) : 0;

  function goToCustomer(customerId: string) {
    navigate({ to: "/pro/customers/$customerId", params: { customerId } });
  }

  return (
    <ProShell pro={pro} active="dashboard">
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
      </div>

      {/* Set up: the biggest thing on the page until every step is done. */}
      {!setup.loading && !setup.allDone && (
        <section className="anim-fade-up d-1 mt-6">
          <Card className="!p-5 border-indigo/20 bg-indigobg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo text-(--on-accent)">
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className="text-base font-bold text-ink">{t("setup.finish")}</div>
                  <div className="text-xs font-semibold text-indigo tnum">
                    {setup.completed} {t("setup.of")} {setup.total}
                  </div>
                </div>
              </div>
              <Link to="/pro/setup" aria-label={t("setup.finish")} className="shrink-0">
                <Btn variant="indigo" size="sm">
                  {t("setup.finish")} <ArrowRight size={14} />
                </Btn>
              </Link>
            </div>
            <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-indigo/15">
              <span
                className="block h-full rounded-full bg-indigo transition-all duration-300"
                style={{ width: `${setupPct}%` }}
              />
            </span>
            <ul className="mt-3">
              {setup.items.map((item) => (
                <li key={item.key}>
                  <Link
                    to="/pro/setup"
                    search={{ step: item.key }}
                    className="pressable flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-paper/60 transition-colors"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                        item.done ? "bg-indigo text-(--on-accent)" : "border border-line bg-paper"
                      }`}
                    >
                      {item.done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span
                      className={`flex-1 text-sm font-semibold ${
                        item.done ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      {t(item.labelKey)}
                    </span>
                    {!item.done && <ChevronRight size={16} className="shrink-0 text-muted" />}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Top action: the single most urgent thing to do right now. */}
      <section className="anim-fade-up d-2 mt-8">
        <h2 className="text-lg font-semibold text-ink mb-3">{t("pi.whatsNext")}</h2>

        {!topAction ? (
          <Card className="!p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Check size={16} strokeWidth={2.5} />
              <span>{t("pi.allCaughtUp")}</span>
            </div>
            <Link to="/pro/jobs/new" className="shrink-0">
              <Btn variant="indigo" size="sm">
                <Plus size={14} /> {t("pi.logJob")}
              </Btn>
            </Link>
          </Card>
        ) : (
          <>
            <button
              type="button"
              onClick={() => goToCustomer(topAction.customerId)}
              className="pressable liftable w-full flex items-center gap-4 rounded-2xl border border-line bg-paper px-5 py-5 text-left"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  topAction.kind === "toSet" ? "bg-amber" : "bg-indigo"
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold text-ink">{topAction.name}</span>
                {topAction.kind === "toSet" ? (
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-amberdark">
                    {t("pi.toSet")}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-sm text-muted tnum">
                    {t("pi.upcoming")} · {formatDate(topAction.date!)}
                  </span>
                )}
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" />
            </button>

            {rest.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="pressable mt-2 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-muted hover:bg-soft transition-colors"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {restToSet > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amberbg px-3 py-1 text-sm font-semibold text-amberdark">
                        <span className="h-2 w-2 rounded-full bg-amber" />
                        {restToSet} {t("pi.toSet")}
                      </span>
                    )}
                    {restUpcoming > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-sm font-semibold text-ink">
                        <span className="h-2 w-2 rounded-full bg-muted" />
                        {restUpcoming} {t("pi.upcoming")}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                {expanded && (
                  <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper overflow-hidden">
                    {rest.map((c) => (
                      <li key={c.customerId}>
                        <button
                          type="button"
                          onClick={() => goToCustomer(c.customerId)}
                          className="pressable flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-soft transition-colors"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              c.kind === "toSet" ? "bg-amber" : "bg-muted"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-semibold text-ink">
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
          </>
        )}
      </section>

      {/* Secondary: quiet links out. Deliberately understated so the page reads
          as setup + top action, not a grid of shortcuts. */}
      <div className="anim-fade-up d-3 mt-10 mb-4 space-y-2">
        {googleConnected && (
          <Link
            to="/pro/reviews"
            className="pressable flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm text-muted hover:text-ink hover:bg-paper transition-colors"
          >
            <span>
              <span className="font-semibold text-ink tnum">{pro.google_rating} ★</span>{" "}
              {t("pi.onGoogle")}
            </span>
            <ChevronRight size={16} />
          </Link>
        )}
        <Link
          to="/pro/office"
          className="pressable flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          <span>{t("pi.officeLink")}</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </ProShell>
  );
}
