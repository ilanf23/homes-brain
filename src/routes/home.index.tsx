import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { startInvoiceCheckout } from "@/lib/stripe-connect";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { Celebration, consumeCelebration } from "@/components/celebration";
import {
  HomePageHead,
  HomeShell,
  useHomeownerGuard,
  type HomeownerRow,
} from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";
import { HomeSetupChecklist } from "@/components/home-setup-checklist";
import { useT } from "@/lib/i18n";

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
  }, [home?.id]);

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
  const verifiedCount = equipment.filter((e) => e.source === "pro").length;
  const addedAppliance = equipment.some((e) => e.source === "homeowner");
  const invitedPro = invites.length > 0;

  if (guardLoading) return <PageLoader label="Loading your home" />;
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
      <HomePageHead
        eyebrow="My home"
        title={home.address}
        sub="Your pros write the record. You own it."
      />

      <HomeSetupChecklist homeowner={homeowner} />

      {homeowner?.setup_completed_at && (!addedAppliance || !invitedPro) && (
        <NextStepsCard addedAppliance={addedAppliance} invitedPro={invitedPro} />
      )}

      {openInvoices.length > 0 && (
        <Card className="anim-fade-up mb-6 border-indigo/30">
          <Eyebrow accent="indigo">Amount due</Eyebrow>
          <div className="mt-3 space-y-3">
            {openInvoices.map((inv) => (
              <AmountDueRow
                key={inv.id}
                inv={inv}
                onPaid={async () => {
                  if (home) setInvoices(await listInvoicesForHome(home.id));
                  setToast("Payment complete");
                }}
                onError={(msg) => setToast(msg)}
              />
            ))}
          </div>
        </Card>
      )}

      <div className="anim-fade-up mb-6 text-sm text-muted">
        {equipment.length} item{equipment.length === 1 ? "" : "s"} · {pros.length} pro
        {pros.length === 1 ? "" : "s"} · {jobs.length} visit{jobs.length === 1 ? "" : "s"}
        {verifiedCount > 0 && (
          <>
            {" · "}
            <span className="inline-flex items-center gap-1 text-indigo font-semibold">
              <ShieldCheck size={13} animate={false} /> all verified
            </span>
          </>
        )}
      </div>

      <div className="space-y-6">
        <ActivityCard
          records={records}
          jobs={jobs}
          pros={pros}
          onView={async (recordId) => {
            await supabase.rpc("mark_record_viewed", { p_record_id: recordId });
            await logEvent("system", "record_viewed", { role: "system", record_id: recordId });
            refresh();
          }}
        />

        <Card className="anim-fade-up d-2">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">On file</Eyebrow>
            <Link
              to="/home/add"
              className="text-xs font-semibold text-indigo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded"
            >
              + Add something
            </Link>
          </div>
          {equipment.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet. Records from your pros will show up here.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {equipment.map((e) => (
                <Link
                  key={e.id}
                  to="/home/items/$itemId"
                  params={{ itemId: e.id }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-3 hover:border-ink/20 hover:shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{e.type ?? "Equipment"}</div>
                    <div className="text-xs text-muted truncate">
                      {[e.make, e.model].filter(Boolean).join(" · ") || "No details yet"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.source === "pro" ? (
                      <span className="inline-flex items-center gap-1 text-indigo font-semibold text-xs">
                        <ShieldCheck size={13} animate={false} /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Self-added</span>
                    )}
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {nextDue && (
          <Card className="anim-fade-up d-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <Eyebrow accent="indigo">Coming up</Eyebrow>
                <div className="mt-2 font-semibold text-ink truncate">{nextDue.what_done}</div>
                <div className="text-xs text-muted mt-0.5 truncate">
                  {proById.get(nextDue.pro_id)?.business ?? ""} · due{" "}
                  {formatDate(nextDue.next_service_date)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/home/reminders">
                  <Btn variant="secondary" size="sm">
                    Remind me
                  </Btn>
                </Link>
                <Link
                  to="/home/reminders"
                  className="text-xs font-semibold text-indigo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded"
                >
                  All reminders
                </Link>
              </div>
            </div>
          </Card>
        )}

        <Card className="anim-fade-up d-3">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">My pros</Eyebrow>
            <Link
              to="/home/pros"
              className="text-xs font-semibold text-indigo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded"
            >
              See all
            </Link>
          </div>
          {pros.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No pros yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {pros.slice(0, 3).map((p) => {
                const visits = jobs.filter((j) => j.pro_id === p.id).length;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.business} accent="indigo" />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">{p.business}</div>
                        <div className="text-xs text-muted flex items-center gap-1.5">
                          <TradeIcon trade={p.trade} size={13} className="text-indigo" />
                          {tradeLabel(p.trade)} · {visits} visit{visits === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <Link to="/home/pros">
                      <Btn variant="secondary" size="sm">
                        Rebook
                      </Btn>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <InviteProsCard
          className="anim-fade-up d-4"
          homeId={home.id}
          homeownerId={homeownerId}
          knownTrades={pros.map((p) => p.trade)}
          prosCount={pros.length}
          onToast={setToast}
        />
      </div>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
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
          proName: pro?.business ?? "Your pro",
          what: j?.what_done ?? "New service record",
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
          proName: pro?.business ?? "Your pro",
          what: j.what_done ?? "Service visit",
          when: formatDate(j.created_at),
          isNew: false,
        };
      });
    return [...fromRecords, ...fromJobs].slice(0, 8);
  }, [records, jobs, jobById, proById, onView]);

  return (
    <Card className="anim-fade-up d-1">
      <div className="flex items-center justify-between">
        <Eyebrow accent="indigo">Recent activity</Eyebrow>
        <Link
          to="/home/pros"
          className="text-xs font-semibold text-indigo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded"
        >
          See all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Nothing yet. When your pros log a job, it'll show up here.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-ink truncate">{row.proName}</div>
                    {row.isNew && <Pill accent="coral">New</Pill>}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {row.what} · {row.when}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </>
            );
            const cls =
              "flex items-center justify-between gap-3 rounded-xl bg-paper border border-line px-3 py-3 hover:border-ink/20 hover:shadow-sm transition-all duration-150 text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
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
  const [busy, setBusy] = useState(false);
  const proName = inv.pros?.business ?? "Your pro";
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
            Due {formatDate(inv.due_date)}
            {isOverdue(inv) ? " · overdue" : ""}
          </div>
        )}
        {!canPay && (
          <div className="text-xs text-muted mt-1">
            {proName} hasn't turned on card payments yet.
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
          Pay {formatMoney(Number(inv.total))}
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
  return (
    <Card className="anim-fade-up mb-6">
      <Eyebrow accent="indigo">Make your record complete</Eyebrow>
      <div className="mt-3 space-y-2">
        <ChecklistRow
          done={addedAppliance}
          label="Add your appliances"
          sub="Warranty and recall checks start with a model number."
          to="/home/add"
        />
        <ChecklistRow
          done={invitedPro}
          label="Invite your other pros"
          sub="Every trade you add deepens your home's record."
          to="/home/pros"
        />
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
        done ? "bg-soft opacity-60" : "bg-white hover:bg-soft"
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
      <HomePageHead
        eyebrow="Welcome"
        title="Let's set up your home"
        sub="Add your address to start your home's living record. You can invite your pros anytime."
      />
      <Card className="anim-fade-up">
        <Eyebrow accent="indigo">Add your home</Eyebrow>
        <div className="mt-3 space-y-3">
          <Field label="Home address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Austin, TX"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && address.trim() && !busy) addHome();
              }}
            />
          </Field>
          <Field
            label="Your phone"
            hint={
              homeowner?.phone
                ? "From the number you signed in with. Change it here if it's wrong."
                : "So your pros can reach you. Optional."
            }
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-555-1234"
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
            {busy ? "Saving…" : "Add my home"}
          </Btn>
        </div>
      </Card>

      <Card className="anim-fade-up d-1 mt-4">
        <Eyebrow accent="indigo">Or claim from a pro</Eyebrow>
        <p className="mt-2 text-sm text-muted">
          If your pro sent you a service record link, open it to claim your home in one tap. The
          record and any equipment they logged come with it.
        </p>
      </Card>
    </>
  );
}
