import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Btn,
  Card,
  Eyebrow,
  Field,
  Input,
  PageLoader,
  Pill,
  Select,
  Toast,
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import { formatDate, logEvent, mockSend, suggestTradeGaps, TRADES, tradeLabel } from "@/lib/hb";
import { LogoMark, ShieldCheck, TradeIcon } from "@/components/svg";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "My home — HomesBrain" }] }),
  component: HomeownerView,
});

type Home = { id: string; address: string };
type EquipmentRow = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  source: string;
};
type ProRow = { id: string; business: string; trade: string };
type JobRow = { id: string; what_done: string; created_at: string; pro_id: string };
type InviteRow = { id: string; to_pro_name: string; trade: string | null; status: string };

function HomeownerView() {
  const navigate = useNavigate();
  const [home, setHome] = useState<Home | null>(null);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteTrade, setInviteTrade] = useState<string>("electrical");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pros" | "timeline">("pros");

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "homeowner") {
      navigate({ to: "/" });
      return;
    }
    (async () => {
      const { data: h } = await supabase
        .from("homes")
        .select("id,address")
        .eq("claimed_by_homeowner", s.homeownerId)
        .maybeSingle();
      if (!h) {
        setLoading(false);
        return;
      }
      setHome(h);
      const [{ data: eq }, { data: jb }, { data: inv }] = await Promise.all([
        supabase
          .from("equipment")
          .select("id,type,make,model,warranty_until,source")
          .eq("home_id", h.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("id,what_done,created_at,pro_id")
          .eq("home_id", h.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invites")
          .select("id,to_pro_name,trade,status")
          .eq("home_id", h.id)
          .order("created_at", { ascending: false }),
      ]);
      setEquipment((eq ?? []) as EquipmentRow[]);
      setJobs((jb ?? []) as JobRow[]);
      setInvites((inv ?? []) as InviteRow[]);

      const proIds = Array.from(new Set((jb ?? []).map((j) => j.pro_id)));
      if (proIds.length) {
        const { data: pr } = await supabase
          .from("pros")
          .select("id,business,trade")
          .in("id", proIds);
        setPros((pr ?? []) as ProRow[]);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const haveTrades = useMemo(() => pros.map((p) => p.trade), [pros]);
  const gaps = useMemo(() => suggestTradeGaps(haveTrades).slice(0, 3), [haveTrades]);
  const proById = useMemo(() => new Map(pros.map((p) => [p.id, p])), [pros]);

  async function sendInvite(toName: string, toPhone: string | null, trade: string | null) {
    if (!home) return;
    const s = getSession();
    const homeownerId = s?.role === "homeowner" ? s.homeownerId : null;
    const { data } = await supabase
      .from("invites")
      .insert({
        home_id: home.id,
        from_homeowner: homeownerId,
        to_pro_name: toName,
        to_pro_phone: toPhone,
        trade,
        status: "pending",
      })
      .select("id,to_pro_name,trade,status")
      .single();
    if (data) setInvites((prev) => [data as InviteRow, ...prev]);
    if (toPhone) {
      await mockSend({
        channel: "sms",
        to: toPhone,
        body: `A homeowner invited you to add their home to HomesBrain. Tap to claim: ${window.location.origin}/pro/signup (Reply STOP to opt out.)`,
        kind: "invite",
      });
    }
    await logEvent(`homeowner:${homeownerId}`, "pro_invited", { trade });
    if (pros.length + invites.length + 1 === 2) {
      await logEvent(`homeowner:${homeownerId}`, "second_pro_added", {});
    }
    setToast(`Invite sent to ${toName}`);
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) return <PageLoader label="Loading your home" />;
  if (!home) {
    return (
      <div className="min-h-dvh bg-soft flex items-center justify-center">
        <Card className="anim-scale-in text-center max-w-sm mx-5">
          <LogoMark size={36} className="mx-auto" />
          <h1 className="mt-4 text-xl tracking-tight">No home claimed yet</h1>
          <p className="mt-2 text-sm text-muted">
            Claim your home from a service record link to get started.
          </p>
          <Link to="/" className="block mt-4">
            <Btn variant="secondary" className="w-full">
              Go to HomesBrain
            </Btn>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <LogoMark className="transition-transform duration-300 group-hover:rotate-[-6deg]" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="coral">Homeowner</Pill>
            <button
              onClick={() => {
                clearSession();
                navigate({ to: "/" });
              }}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <div className="anim-fade-up">
          <Eyebrow accent="coral">My home</Eyebrow>
          <h1 className="mt-2 text-3xl tracking-tight">{home.address}</h1>
        </div>

        {/* On file */}
        <Card className="anim-fade-up d-1">
          <div className="flex items-center justify-between">
            <Eyebrow accent="coral">On file</Eyebrow>
            <div className="text-xs text-muted tnum">
              {equipment.length} item{equipment.length === 1 ? "" : "s"}
            </div>
          </div>
          {equipment.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet. Records from your pros will show up here.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {equipment.map((e, i) => (
                <div
                  key={e.id}
                  className="anim-fade-up rounded-xl border border-line p-3 flex items-start justify-between gap-3 hover:border-ink/20 hover:shadow-sm transition-all duration-200"
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
                  {e.source === "pro" ? (
                    <span className="inline-flex items-center gap-1.5 text-teal font-semibold text-xs shrink-0">
                      <ShieldCheck size={15} animate={false} /> Verified
                    </span>
                  ) : (
                    <Pill accent="amber">Self-added</Pill>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My pros / history timeline */}
        <Card className="anim-fade-up d-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Eyebrow accent="coral">My pros</Eyebrow>
            <div
              className="flex items-center gap-1 rounded-full bg-soft p-1"
              role="tablist"
              aria-label="View"
            >
              {(
                [
                  ["pros", "By pro"],
                  ["timeline", "Timeline"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={`pressable rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-200 ${
                    view === key ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {pros.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No pros yet.</p>
          ) : view === "pros" ? (
            <div key="pros" className="anim-fade-in mt-3 space-y-3">
              {pros.map((p) => {
                const proJobs = jobs.filter((j) => j.pro_id === p.id);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-line p-3 hover:border-ink/20 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.business} accent="teal" />
                        <div>
                          <div className="font-semibold text-ink">{p.business}</div>
                          <div className="text-xs text-muted flex items-center gap-1.5">
                            <TradeIcon trade={p.trade} size={13} className="text-teal" />
                            {tradeLabel(p.trade)} · {proJobs.length} visit
                            {proJobs.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                      <Btn variant="secondary" size="sm">
                        Rebook
                      </Btn>
                    </div>
                    <div className="mt-3 space-y-1">
                      {proJobs.slice(0, 3).map((j) => (
                        <div
                          key={j.id}
                          className="flex items-center justify-between gap-4 text-sm py-1.5 border-b border-line last:border-b-0"
                        >
                          <span className="text-muted font-mono text-xs tnum shrink-0">
                            {formatDate(j.created_at)}
                          </span>
                          <span className="font-medium text-ink text-right">{j.what_done}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div key="timeline" className="anim-fade-in mt-4 relative pl-6">
              {/* the spine */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" aria-hidden="true" />
              <div className="space-y-5">
                {jobs.map((j, i) => {
                  const p = proById.get(j.pro_id);
                  return (
                    <div
                      key={j.id}
                      className="anim-fade-up relative"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <span
                        className="absolute -left-6 top-1 w-[15px] h-[15px] rounded-full border-2 border-teal bg-tealbg"
                        aria-hidden="true"
                      />
                      <div className="text-xs text-muted font-mono tnum">
                        {formatDate(j.created_at)}
                      </div>
                      <div className="font-semibold text-ink text-sm mt-0.5">{j.what_done}</div>
                      {p && (
                        <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                          <TradeIcon trade={p.trade} size={12} className="text-teal" />
                          {p.business}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Add other pros */}
        <Card className="anim-fade-up d-3">
          <Eyebrow accent="coral">Add the other pros who work on your home</Eyebrow>
          <p className="mt-2 text-sm text-muted">
            One source of truth for everything that gets done here.
          </p>

          {gaps.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Suggested gaps
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {gaps.map((g, i) => (
                  <button
                    key={g}
                    onClick={() => sendInvite(`Your ${tradeLabel(g).toLowerCase()} pro`, null, g)}
                    className="pressable anim-fade-up inline-flex items-center gap-2 rounded-full bg-coralbg text-coral text-sm font-semibold px-3.5 py-2 hover:shadow-[0_8px_20px_-10px_rgba(194,70,31,0.5)] hover:-translate-y-px transition-all duration-200"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <TradeIcon trade={g} size={15} />
                    Invite {tradeLabel(g)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Pro name">
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Rio Grande Electric"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="512-847-1928"
                type="tel"
              />
            </Field>
            <Field label="Trade">
              <Select value={inviteTrade} onChange={(e) => setInviteTrade(e.target.value)}>
                {TRADES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Btn
              variant="coral"
              disabled={!inviteName || !invitePhone}
              onClick={() => {
                sendInvite(inviteName, invitePhone, inviteTrade);
                setInviteName("");
                setInvitePhone("");
              }}
            >
              Send invite
            </Btn>
          </div>

          {invites.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Sent</div>
              <div className="mt-2 space-y-2">
                {invites.map((i) => (
                  <div
                    key={i.id}
                    className="anim-fade-in flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {i.trade && <TradeIcon trade={i.trade} size={14} className="text-muted" />}
                      {i.to_pro_name}{" "}
                      {i.trade && <span className="text-muted">· {tradeLabel(i.trade)}</span>}
                    </span>
                    <Pill accent="amber">{i.status}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}
