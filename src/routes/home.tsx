import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, KV, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import { formatDate, logEvent, mockSend, suggestTradeGaps, TRADES, tradeLabel } from "@/lib/hb";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "My home — HomesBrain" }] }),
  component: HomeownerView,
});

type Home = { id: string; address: string };
type EquipmentRow = { id: string; type: string | null; make: string | null; model: string | null; warranty_until: string | null; source: string };
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

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "homeowner") { navigate({ to: "/" }); return; }
    (async () => {
      const { data: h } = await supabase.from("homes").select("id,address").eq("claimed_by_homeowner", s.homeownerId).maybeSingle();
      if (!h) { setLoading(false); return; }
      setHome(h);
      const [{ data: eq }, { data: jb }, { data: inv }] = await Promise.all([
        supabase.from("equipment").select("id,type,make,model,warranty_until,source").eq("home_id", h.id).order("created_at", { ascending: false }),
        supabase.from("jobs").select("id,what_done,created_at,pro_id").eq("home_id", h.id).order("created_at", { ascending: false }),
        supabase.from("invites").select("id,to_pro_name,trade,status").eq("home_id", h.id).order("created_at", { ascending: false }),
      ]);
      setEquipment((eq ?? []) as EquipmentRow[]);
      setJobs((jb ?? []) as JobRow[]);
      setInvites((inv ?? []) as InviteRow[]);

      const proIds = Array.from(new Set((jb ?? []).map((j) => j.pro_id)));
      if (proIds.length) {
        const { data: pr } = await supabase.from("pros").select("id,business,trade").in("id", proIds);
        setPros((pr ?? []) as ProRow[]);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const haveTrades = useMemo(() => pros.map((p) => p.trade), [pros]);
  const gaps = useMemo(() => suggestTradeGaps(haveTrades).slice(0, 3), [haveTrades]);

  async function sendInvite(toName: string, toPhone: string | null, trade: string | null) {
    if (!home) return;
    const s = getSession();
    const homeownerId = s?.role === "homeowner" ? s.homeownerId : null;
    const { data } = await supabase
      .from("invites")
      .insert({ home_id: home.id, from_homeowner: homeownerId, to_pro_name: toName, to_pro_phone: toPhone, trade, status: "pending" })
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

  if (loading) return <div className="min-h-screen bg-soft flex items-center justify-center text-muted">Loading…</div>;
  if (!home) return <div className="min-h-screen bg-soft flex items-center justify-center text-muted">No home claimed yet.</div>;

  return (
    <div className="min-h-screen bg-soft">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-indigo" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="coral">Homeowner</Pill>
            <button onClick={() => { clearSession(); navigate({ to: "/" }); }} className="text-sm text-muted hover:text-ink">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <div>
          <Eyebrow accent="coral">My home</Eyebrow>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{home.address}</h1>
        </div>

        {/* On file */}
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow accent="coral">On file</Eyebrow>
            <div className="text-xs text-muted">{equipment.length} item{equipment.length === 1 ? "" : "s"}</div>
          </div>
          {equipment.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {equipment.map((e) => (
                <div key={e.id} className="rounded-xl border border-line p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{e.type ?? "Equipment"}</div>
                    <div className="text-sm text-muted">{[e.make, e.model].filter(Boolean).join(" · ")}</div>
                    {e.warranty_until && <div className="text-xs text-muted mt-1">Warranty until {formatDate(e.warranty_until)}</div>}
                  </div>
                  <Pill accent={e.source === "pro" ? "teal" : "amber"}>{e.source === "pro" ? "Verified" : "Self-added"}</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Pros */}
        <Card>
          <Eyebrow accent="coral">My pros</Eyebrow>
          {pros.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No pros yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {pros.map((p) => {
                const proJobs = jobs.filter((j) => j.pro_id === p.id);
                return (
                  <div key={p.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.business} accent="teal" />
                        <div>
                          <div className="font-semibold text-ink">{p.business}</div>
                          <div className="text-xs text-muted">{tradeLabel(p.trade)} · {proJobs.length} visit{proJobs.length === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                      <Btn variant="secondary" size="sm">Rebook</Btn>
                    </div>
                    <div className="mt-3">
                      {proJobs.slice(0, 3).map((j) => (
                        <KV key={j.id} k={formatDate(j.created_at)} v={j.what_done} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Add other pros */}
        <Card>
          <Eyebrow accent="coral">Add the other pros who work on your home</Eyebrow>
          <p className="mt-2 text-sm text-muted">One source of truth for everything that gets done here.</p>

          {gaps.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Suggested gaps</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {gaps.map((g) => (
                  <button
                    key={g}
                    onClick={() => sendInvite(`Your ${tradeLabel(g).toLowerCase()} pro`, null, g)}
                    className="rounded-full bg-coralbg text-coral text-sm font-semibold px-3 py-1.5 hover:opacity-80"
                  >
                    + Invite {tradeLabel(g)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Pro name"><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="ACME Electric" /></Field>
            <Field label="Phone"><Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="555-555-1234" /></Field>
            <Field label="Trade">
              <select value={inviteTrade} onChange={(e) => setInviteTrade(e.target.value)} className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm">
                {TRADES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Btn variant="coral" disabled={!inviteName || !invitePhone} onClick={() => { sendInvite(inviteName, invitePhone, inviteTrade); setInviteName(""); setInvitePhone(""); }}>
              Send invite
            </Btn>
          </div>

          {invites.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Sent</div>
              <div className="mt-2 space-y-2">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-sm">
                    <span>{i.to_pro_name} {i.trade && <span className="text-muted">· {tradeLabel(i.trade)}</span>}</span>
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
