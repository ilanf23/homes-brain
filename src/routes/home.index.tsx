import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, tradeLabel } from "@/lib/hb";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, useHomeownerGuard, type HomeownerRow } from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";

export const Route = createFileRoute("/home/")({
  head: () => ({ meta: [{ title: "My home - HomesBrain" }] }),
  component: HomeOverview,
});

function HomeOverview() {
  const {
    homeownerId,
    homeowner,
    home,
    equipment,
    jobs,
    pros,
    records,
    loading: guardLoading,
    refresh,
  } = useHomeownerGuard();
  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const inv = await listInvoicesForHome(home.id);
      setInvoices(inv);
    })();
  }, [home]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const nextDue = useMemo(
    () =>
      jobs
        .filter((j) => j.next_service_date)
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0] ?? null,
    [jobs],
  );
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const newRecords = useMemo(
    () =>
      records
        .filter((r) => !r.viewed_at)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    [records],
  );

  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);
  const verifiedCount = equipment.filter((e) => e.source === "pro").length;

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
      <HomePageHead
        eyebrow="My home"
        title={home.address}
        sub="Every home remembers. Your pros write the record, you own it."
      />

      <div className="anim-fade-up rounded-2xl bg-indigobg text-indigo px-4 py-3 text-sm font-semibold mb-6">
        This record sells as a $49 seller history report when homes change hands. Yours is free for
        life because your pros write it.
      </div>

      <div className="anim-fade-up d-1 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(
          [
            [equipment.length, "Items on file"],
            [verifiedCount, "Verified by pros"],
            [pros.length, "Pros on the home"],
            [jobs.length, "Visits recorded"],
          ] as const
        ).map(([n, label]) => (
          <Card key={label} className="text-center py-4">
            <div className="text-2xl font-extrabold tracking-tight tnum">{n}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <Card className="anim-fade-up d-2">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">On file</Eyebrow>
            <Link to="/home/add" className="text-xs font-semibold text-indigo hover:underline">
              Add something
            </Link>
          </div>
          {equipment.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet. Records from your pros will show up here.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {equipment.map((e, i) => (
                <Link
                  key={e.id}
                  to="/home/items/$itemId"
                  params={{ itemId: e.id }}
                  className="anim-fade-up rounded-xl border border-line p-3 flex items-start justify-between gap-3 hover:border-ink/20 hover:shadow-sm transition-all duration-200 block"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div>
                    <div className="font-semibold text-ink">{e.type ?? "Equipment"}</div>
                    <div className="text-sm text-muted">
                      {[e.make, e.model].filter(Boolean).join(" · ")}
                    </div>
                    {e.warranty_until && (
                      <div className="text-xs text-muted mt-1 font-mono tnum">
                        Warranty until {formatDate(e.warranty_until)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.source === "pro" ? (
                      <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-xs">
                        <ShieldCheck size={15} animate={false} /> Verified
                      </span>
                    ) : (
                      <Pill accent="amber">Self-added</Pill>
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
              <div>
                <Eyebrow accent="indigo">Next up</Eyebrow>
                <div className="mt-2 font-semibold text-ink">{nextDue.what_done}</div>
                <div className="text-xs text-muted mt-0.5">
                  {proById.get(nextDue.pro_id)?.business ?? ""} · due{" "}
                  {formatDate(nextDue.next_service_date)}
                </div>
              </div>
              <Link to="/home/reminders">
                <Btn variant="secondary" size="sm">
                  All reminders
                </Btn>
              </Link>
            </div>
          </Card>
        )}

        {invoices.length > 0 && (
          <Card className="anim-fade-up d-3">
            <Eyebrow accent="indigo">Invoices</Eyebrow>
            <div className="mt-3 divide-y divide-line">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {inv.pros?.business ?? "Your pro"}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {inv.items[0]?.description ?? ""}
                      {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-bold text-ink tnum">{formatMoney(Number(inv.total))}</div>
                    {inv.status === "paid" ? (
                      <Pill accent="indigo">Paid</Pill>
                    ) : isOverdue(inv) ? (
                      <Pill accent="amber">Overdue</Pill>
                    ) : (
                      <Pill accent="ink">Open</Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Sent by your pros. Pay them the way you always do; this is just your record.
            </p>
          </Card>
        )}

        <Card className="anim-fade-up d-3">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">My pros</Eyebrow>
            <Link to="/home/pros" className="text-xs font-semibold text-indigo hover:underline">
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
                    <div className="flex items-center gap-3">
                      <Avatar name={p.business} accent="indigo" />
                      <div>
                        <div className="font-semibold text-ink">{p.business}</div>
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
