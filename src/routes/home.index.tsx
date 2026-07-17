import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronRight, Home, Users, Wrench } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { startInvoiceCheckout } from "@/lib/stripe-connect";
import { Celebration, consumeCelebration } from "@/components/celebration";
import {
  HomePageHead,
  HomeShell,
  useHomeownerGuard,
  type HomeownerRow,
} from "@/components/home-shell";
import { HomeSetupChecklist } from "@/components/home-setup-checklist";
import { useT } from "@/lib/i18n";
import { listJobMedia } from "@/lib/media";

export const Route = createFileRoute("/home/")({
  head: () => ({ meta: [{ title: "My home - HomesBrain" }] }),
  component: HomeOverview,
});

function HomeOverview() {
  const t = useT();
  const {
    homeownerId,
    homeowner,
    home,
    equipment,
    jobs,
    pros,
    invites,
    records,
    loading: guardLoading,
    refresh,
  } = useHomeownerGuard();
  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Claim landing without a record id falls back here: play the one-time
  // celebration queued by /claim. Set in effect so SSR markup stays clean.
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (consumeCelebration("home_claimed")) setCelebrate(true);
  }, []);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const inv = await listInvoicesForHome(home.id);
      setInvoices(inv);
    })();
  }, [home]);

  // On return with ?paid=<invoiceId>, refresh invoices and flash a toast.
  useEffect(() => {
    if (typeof window === "undefined" || !home) return;
    const q = new URLSearchParams(window.location.search).get("paid");
    if (!q) return;
    (async () => setInvoices(await listInvoicesForHome(home.id)))();
    setToast(t("hi.paid"));
    const url = new URL(window.location.href);
    url.searchParams.delete("paid");
    window.history.replaceState({}, "", url.toString());
  }, [home, t]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const openInvoices = useMemo(() => invoices.filter((i) => i.status === "open"), [invoices]);

  const nextDue = useMemo(
    () =>
      jobs
        .filter((j) => j.next_service_date)
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0] ?? null,
    [jobs],
  );

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);
  const addedAppliance = equipment.some((e) => e.source !== "pro");
  const invitedPro = invites.length > 0;

  if (guardLoading) return <PageLoader label={t("hi.loadingHome")} />;
  if (!home)
    return (
      <HomeShell active="overview" homeowner={homeowner} home={null}>
        <OnboardingNoHome
          homeownerId={homeownerId}
          homeowner={homeowner}
          onCreated={() => refresh()}
        />
      </HomeShell>
    );

  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      {celebrate && <Celebration variant="grand" />}
      <section className="anim-fade-up mb-5 overflow-hidden rounded-[28px] border border-indigo/15 bg-gradient-to-br from-indigobg via-paper to-paper shadow-[0_20px_50px_-36px_rgba(71,63,176,0.65)]">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-indigo text-(--on-accent) shadow-[0_12px_26px_-14px_rgba(71,63,176,0.8)]">
            <Home size={26} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-indigo">{t("hi.myHome")}</div>
            <h1 className="mt-1 text-2xl sm:text-3xl leading-tight tracking-tight text-ink">
              {home.address}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("hi.myHomeSub")}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-paper/70">
          {[
            [equipment.length, equipment.length === 1 ? t("hi.item.one") : t("hi.item.other")],
            [pros.length, pros.length === 1 ? t("hi.pro.one") : t("hi.pro.other")],
            [jobs.length, jobs.length === 1 ? t("hi.visit.one") : t("hi.visit.other")],
          ].map(([value, label]) => (
            <div key={String(label)} className="px-2 py-4 text-center">
              <div className="text-2xl font-extrabold tracking-tight text-ink tnum">{value}</div>
              <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {openInvoices.length > 0 && (
        <Card className="anim-fade-up mb-5 border-indigo/30 shadow-[0_16px_36px_-30px_rgba(71,63,176,0.8)]">
          <Eyebrow accent="indigo">{t("hi.amountDue")}</Eyebrow>
          <div className="mt-3 space-y-3">
            {openInvoices.map((inv) => (
              <AmountDueRow
                key={inv.id}
                inv={inv}
                onPaid={async () => {
                  if (home) setInvoices(await listInvoicesForHome(home.id));
                  setToast(t("hi.paymentComplete"));
                }}
                onError={(msg) => setToast(msg)}
              />
            ))}
          </div>
        </Card>
      )}

      <HomeSetupChecklist homeowner={homeowner} />

      {homeowner?.setup_completed_at && (!addedAppliance || !invitedPro) && (
        <NextStepsCard addedAppliance={addedAppliance} invitedPro={invitedPro} />
      )}

      <div className="space-y-5">
        {nextDue && (
          <Card className="anim-fade-up !p-5">
            <Eyebrow accent="indigo">{t("hi.comingUp")}</Eyebrow>
            <div className="mt-3 text-xl font-bold leading-snug text-ink">{nextDue.what_done}</div>
            <div className="mt-1 text-sm text-muted">
              {proById.get(nextDue.pro_id)?.business ?? ""} · {t("hi.due")}{" "}
              {formatDate(nextDue.next_service_date)}
            </div>
            <Link to="/home/reminders" className="mt-4 block">
              <Btn variant="indigo" size="lg" className="w-full">
                <Bell size={18} /> {t("hi.allReminders")}
              </Btn>
            </Link>
          </Card>
        )}

        <ActivityCard
          records={records}
          jobs={jobs}
          pros={pros}
          onView={async (recordId) => {
            const rec = records.find((r) => r.id === recordId);
            let hasVideo = false;
            try {
              const recMedia = rec ? await listJobMedia([rec.job_id]) : [];
              hasVideo = recMedia.some((m) => m.kind === "video");
            } catch {
              // A media-fetch failure must not block mark_record_viewed below.
            }
            await supabase.rpc("mark_record_viewed", { p_record_id: recordId });
            await logEvent("system", "record_viewed", {
              role: "system",
              record_id: recordId,
              has_video: hasVideo,
            });
            refresh();
          }}
        />

        <HomeDestinations />
      </div>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}

function HomeDestinations() {
  const items = [
    {
      to: "/home/appliances" as const,
      label: "Appliances",
      detail: "View equipment and warranties",
      icon: Wrench,
    },
    {
      to: "/home/pros" as const,
      label: "My pros",
      detail: "Rebook or add someone",
      icon: Users,
    },
    {
      to: "/home/reminders" as const,
      label: "Reminders",
      detail: "See upcoming service",
      icon: Bell,
    },
  ];

  return (
    <Card className="anim-fade-up !p-3">
      <div className="px-2 pb-2 pt-1">
        <Eyebrow accent="indigo">Your home</Eyebrow>
      </div>
      <div className="space-y-1">
        {items.map(({ to, label, detail, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="pressable flex min-h-[76px] items-center gap-4 rounded-[20px] px-3 py-3 hover:bg-soft"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigobg text-indigo">
              <Icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-ink">{label}</span>
              <span className="block text-sm text-muted">{detail}</span>
            </span>
            <ChevronRight size={19} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* Merged feed of new records + recent visits, as whole-row tappable rows.
   Unseen records get a coral "New" pill and fire mark_record_viewed on tap. */
type FeedRow = {
  key: string;
  href:
    | { to: "/home/records/$recordId"; params: { recordId: string } }
    | { to: "/home/items/$itemId"; params: { itemId: string } }
    | null;
  onTap?: () => void | Promise<void>;
  proName: string;
  what: string;
  when: string;
  isNew: boolean;
};

function ActivityCard({
  records,
  jobs,
  pros,
  onView,
}: {
  records: ReturnType<typeof useHomeownerGuard>["records"];
  jobs: ReturnType<typeof useHomeownerGuard>["jobs"];
  pros: ReturnType<typeof useHomeownerGuard>["pros"];
  onView: (recordId: string) => void | Promise<void>;
}) {
  const t = useT();
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);
  const rows: FeedRow[] = useMemo(() => {
    const seenJobs = new Set<string>();
    const fromRecords: FeedRow[] = records
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 8)
      .map((r) => {
        const j = jobById.get(r.job_id);
        if (j) seenJobs.add(j.id);
        const pro = j ? proById.get(j.pro_id) : undefined;
        return {
          key: `r-${r.id}`,
          href: { to: "/home/records/$recordId" as const, params: { recordId: r.id } },
          onTap: !r.viewed_at ? () => onView(r.id) : undefined,
          proName: pro?.business ?? t("hi.yourPro"),
          what: j?.what_done ?? t("hi.serviceRecord"),
          when: formatDate(r.created_at),
          isNew: !r.viewed_at,
        };
      });
    const fromJobs: FeedRow[] = jobs
      .filter((j) => !seenJobs.has(j.id))
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 6)
      .map((j) => {
        const pro = proById.get(j.pro_id);
        return {
          key: `j-${j.id}`,
          href: j.equipment_id
            ? { to: "/home/items/$itemId" as const, params: { itemId: j.equipment_id } }
            : null,
          proName: pro?.business ?? t("hi.yourPro"),
          what: j.what_done ?? t("hi.serviceVisit"),
          when: formatDate(j.created_at),
          isNew: false,
        };
      });
    return [...fromRecords, ...fromJobs].slice(0, 3);
  }, [records, jobs, jobById, proById, onView, t]);

  return (
    <Card className="anim-fade-up d-1 !p-4 sm:!p-5">
      <Eyebrow accent="indigo">{t("hi.recentActivity")}</Eyebrow>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-soft px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">{t("hi.recentEmpty")}</p>
          <p className="mt-1 text-xs text-muted">New service records will appear here.</p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {rows.map((row) => {
            const inner = (
              <>
                <Avatar name={row.proName} accent="indigo" size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-ink truncate">{row.proName}</div>
                    {row.isNew && <Pill accent="coral">{t("hi.new")}</Pill>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted line-clamp-2">{row.what}</div>
                  <div className="mt-1 text-xs font-semibold text-muted tnum">{row.when}</div>
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </>
            );
            const cls =
              "pressable flex min-h-[76px] items-center gap-3 px-1 py-3.5 text-left w-full hover:bg-soft/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-xl";
            if (row.href?.to === "/home/records/$recordId") {
              return (
                <Link
                  key={row.key}
                  to="/home/records/$recordId"
                  params={row.href.params}
                  onClick={row.onTap}
                  className={cls}
                >
                  {inner}
                </Link>
              );
            }
            if (row.href?.to === "/home/items/$itemId") {
              return (
                <Link
                  key={row.key}
                  to="/home/items/$itemId"
                  params={row.href.params}
                  onClick={row.onTap}
                  className={cls}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button key={row.key} type="button" onClick={row.onTap} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AmountDueRow({
  inv,
  onPaid,
  onError,
}: {
  inv: HomeInvoice;
  onPaid: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const proName = inv.pros?.business ?? t("hi.yourPro");
  const canPay = !!inv.pros?.stripe_charges_enabled;
  const description = inv.items[0]?.description ?? "Service";
  async function pay() {
    setBusy(true);
    try {
      const { url } = await startInvoiceCheckout(inv.id);
      window.location.href = url;
    } catch (e) {
      setBusy(false);
      onError(e instanceof Error ? e.message : "Couldn't start payment.");
    }
    void onPaid;
  }
  return (
    <div className="rounded-xl border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-ink truncate">{proName}</div>
        <div className="text-sm text-muted truncate">{description}</div>
        {inv.due_date && (
          <div className="text-xs text-muted mt-0.5">
            {t("hi.dueLabel")} {formatDate(inv.due_date)}
            {isOverdue(inv) ? ` · ${t("hi.overdue")}` : ""}
          </div>
        )}
        {!canPay && (
          <div className="text-xs text-muted mt-1">
            {proName} {t("hi.noCards")}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <Btn
          variant="indigo"
          size="lg"
          className="w-full sm:w-auto"
          loading={busy}
          disabled={!canPay || busy}
          onClick={pay}
        >
          {t("hi.pay")} {formatMoney(Number(inv.total))}
        </Btn>
      </div>
    </div>
  );
}

/* Post-setup checklist: the trust-gated loop items. Data-derived, no
   dismissal state; the card disappears when both are done. */
function NextStepsCard({
  addedAppliance,
  invitedPro,
}: {
  addedAppliance: boolean;
  invitedPro: boolean;
}) {
  const t = useT();
  return (
    <Card className="anim-fade-up mb-6">
      <Eyebrow accent="indigo">{t("hi.makeComplete")}</Eyebrow>
      <div className="mt-3 space-y-2">
        {!addedAppliance && (
          <ChecklistRow
            done={false}
            label={t("hi.addAppliancesTitle")}
            sub={t("hi.addAppliancesSub")}
            to="/home/add"
          />
        )}
        {!invitedPro && (
          <ChecklistRow
            done={false}
            label={t("hi.inviteProsTitle")}
            sub={t("hi.inviteProsSub")}
            to="/home/pros"
          />
        )}
      </div>
    </Card>
  );
}

function ChecklistRow({
  done,
  label,
  sub,
  to,
}: {
  done: boolean;
  label: string;
  sub: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition ${
        done ? "bg-soft opacity-60" : "bg-paper hover:bg-soft"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-indigo text-white" : "border border-line text-transparent"
        }`}
      >
        <Check size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </Link>
  );
}

function OnboardingNoHome({
  homeownerId,
  homeowner,
  onCreated,
}: {
  homeownerId: string | null;
  homeowner: HomeownerRow | null;
  onCreated: () => void;
}) {
  const t = useT();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(homeowner?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (homeowner?.phone) setPhone(homeowner.phone);
  }, [homeowner?.phone]);

  async function addHome() {
    if (!homeownerId || !address.trim()) return;
    setBusy(true);
    setErr(null);
    const trimmedPhone = phone.trim();

    if (trimmedPhone && trimmedPhone !== (homeowner?.phone ?? "")) {
      await supabase.rpc("homeowner_update_profile", {
        p_phone: trimmedPhone,
      });
    }
    const { error } = await supabase.rpc("homeowner_update_home", {
      p_address: address.trim(),
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    await logEvent(`homeowner:${homeownerId}`, "home_added_self", {});
    onCreated();
  }

  return (
    <>
      <HomePageHead eyebrow={t("hi.welcome")} title={t("hi.setUp")} sub={t("hi.setUpSub")} />
      <Card className="anim-fade-up">
        <Eyebrow accent="indigo">{t("hi.addYourHome")}</Eyebrow>
        <div className="mt-3 space-y-3">
          <Field label={t("hi.homeAddress")}>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("hi.homeAddressPh")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && address.trim() && !busy) addHome();
              }}
            />
          </Field>
          <Field
            label={t("hi.yourPhone")}
            hint={homeowner?.phone ? t("hi.phoneHintExisting") : t("hi.phoneHintNew")}
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("hi.phonePh")}
              type="tel"
            />
          </Field>
          {err && (
            <div role="alert" className="text-sm text-red bg-redbg rounded-xl px-3 py-2">
              {err}
            </div>
          )}
          <Btn
            variant="indigo"
            size="lg"
            className="w-full"
            disabled={!address.trim() || busy}
            onClick={addHome}
          >
            {busy ? t("hi.saving") : t("hi.addMyHome")}
          </Btn>
        </div>
      </Card>

      <Card className="anim-fade-up d-1 mt-4">
        <Eyebrow accent="indigo">{t("hi.orClaim")}</Eyebrow>
        <p className="mt-2 text-sm text-muted">{t("hi.orClaimSub")}</p>
      </Card>
    </>
  );
}
