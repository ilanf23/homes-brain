import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Share2, UserPlus, X } from "lucide-react";
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
import { formatDate, logEvent, notifyPro, TRADES, tradeLabel } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";
import { BottomSheet } from "@/components/bottom-sheet";

export const Route = createFileRoute("/home/pros")({
  head: () => ({ meta: [{ title: "My pros - HomesBrain" }] }),
  component: MyPros,
});

type ProRow = { id: string; business: string; trade: string; service_area: string | null };
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  pro_id: string;
  next_service_date: string | null;
};

function MyPros() {
  const navigate = useNavigate();
  const {
    homeownerId,
    homeowner,
    home,
    jobs: allJobs,
    pros: allPros,
    loading: guardLoading,
  } = useHomeownerGuard();
  const pros = allPros as unknown as ProRow[];
  const jobs = allJobs as unknown as JobRow[];
  const [toast, setToast] = useState<string | null>(null);
  const [rebooked, setRebooked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [showAddPro, setShowAddPro] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "invite">("search");

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function rebook(p: ProRow) {
    setBusy(p.id);
    await logEvent(`homeowner:${homeownerId}`, "rebooked", { pro_id: p.id, home_id: home?.id });
    await notifyPro(
      p.id,
      "rebook_request",
      "Rebook request",
      home ? `The homeowner at ${home.address} wants to rebook` : "A homeowner wants to rebook",
      { home_id: home?.id, homeowner_id: homeownerId },
    );
    setRebooked((prev) => new Set(prev).add(p.id));
    setBusy(null);
    setToast(`Rebook request sent to ${p.business}`);
  }

  async function share(p: ProRow) {
    const text = `${p.business} - ${tradeLabel(p.trade)} on HomesBrain: ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied. Share it with a neighbor");
    } catch {
      setToast(text);
    }
  }

  if (guardLoading) return <PageLoader label="Loading your pros" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  return (
    <HomeShell active="pros" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="My pros"
        title="The people who know your home"
        sub="Rebook someone who already knows the house."
        action={
          <Btn variant="indigo" size="lg" onClick={() => setShowAddPro(true)}>
            <UserPlus size={18} /> Add a pro
          </Btn>
        }
      />

      <div className="space-y-5">
        {pros.length === 0 ? (
          <Card className="anim-fade-up text-center !py-12">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-indigobg text-indigo">
              <UserPlus size={28} />
            </span>
            <h2 className="mt-4 text-2xl tracking-tight">No pros yet</h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              Find the people you already trust, or invite them by email.
            </p>
            <Btn variant="indigo" size="lg" className="mt-5" onClick={() => setShowAddPro(true)}>
              <UserPlus size={18} /> Add your first pro
            </Btn>
          </Card>
        ) : (
          pros.map((p, pi) => {
            const proJobs = jobs.filter((j) => j.pro_id === p.id);
            const latestJob = proJobs
              .slice()
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
            const nextDue = proJobs
              .filter((j) => j.next_service_date)
              .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0];
            return (
              <Card key={p.id} className={`anim-fade-up d-${Math.min(pi + 1, 4)} !p-4 sm:!p-5`}>
                <div className="flex items-start gap-3">
                  <Avatar name={p.business} accent="indigo" size={52} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="truncate text-lg font-bold text-ink">{p.business}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <TradeIcon trade={p.trade} size={13} className="text-indigo" />
                      {tradeLabel(p.trade)}
                      {p.service_area ? ` · ${p.service_area}` : ""}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-muted">
                      {proJobs.length} recorded visit{proJobs.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                {(nextDue || latestJob) && (
                  <div className="mt-4 rounded-2xl bg-soft px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-muted">
                        {nextDue ? "Next service" : "Last visit"}
                      </span>
                      <span className="font-semibold text-ink tnum">
                        {formatDate(nextDue?.next_service_date ?? latestJob.created_at)}
                      </span>
                    </div>
                    {!nextDue && latestJob && (
                      <div className="mt-1 line-clamp-1 text-sm text-ink">
                        {latestJob.what_done}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 border-t border-line pt-4">
                  {rebooked.has(p.id) ? (
                    <div className="flex min-h-11 items-center justify-center rounded-xl bg-coralbg px-4 text-sm font-semibold text-coraldark">
                      Request sent
                    </div>
                  ) : (
                    <Btn
                      variant="coral"
                      className="w-full"
                      disabled={busy === p.id}
                      onClick={() => rebook(p)}
                    >
                      {busy === p.id ? "Sending…" : "Rebook this pro"}
                    </Btn>
                  )}
                  <button
                    onClick={() => share(p)}
                    aria-label={`Share ${p.business}`}
                    className="pressable flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-paper text-muted transition-colors hover:bg-soft hover:text-ink"
                  >
                    <Share2 size={17} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <BottomSheet open={showAddPro} onClose={() => setShowAddPro(false)} title="Add a pro">
        <div className="border-b border-line bg-paper p-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-soft p-1.5">
            <button
              type="button"
              onClick={() => setAddMode("search")}
              className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${addMode === "search" ? "bg-paper text-indigo shadow-sm" : "text-muted"}`}
            >
              Find a pro
            </button>
            <button
              type="button"
              onClick={() => setAddMode("invite")}
              className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${addMode === "invite" ? "bg-paper text-indigo shadow-sm" : "text-muted"}`}
            >
              Send an invite
            </button>
          </div>
        </div>
        <div className="p-4">
          {addMode === "search" ? (
            <ProSearch
              homeownerId={homeownerId}
              homeId={home.id}
              address={home.address}
              existingProIds={pros.map((p) => p.id)}
              onToast={setToast}
            />
          ) : (
            <InviteProsCard
              homeId={home.id}
              homeownerId={homeownerId}
              knownTrades={pros.map((p) => p.trade)}
              prosCount={pros.length}
              onToast={setToast}
            />
          )}
        </div>
      </BottomSheet>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}

type SearchPro = {
  id: string;
  business: string;
  trade: string;
  service_area: string | null;
  google_rating: number | null;
};

function ProSearch({
  homeownerId,
  homeId,
  address,
  existingProIds,
  onToast,
}: {
  homeownerId: string | null;
  homeId: string;
  address: string;
  existingProIds: string[];
  onToast: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState<string>("all");
  const [results, setResults] = useState<SearchPro[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const existing = useMemo(() => new Set(existingProIds), [existingProIds]);

  useEffect(() => {
    const term = q.trim();
    if (!term && trade === "all") {
      setResults(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      let query = supabase
        .from("pros")
        .select("id,business,trade,service_area,google_rating")
        .order("google_rating", { ascending: false, nullsFirst: false })
        .limit(20);
      if (term) {
        query = query.or(`business.ilike.%${term}%,service_area.ilike.%${term}%`);
      }
      if (trade !== "all") query = query.eq("trade", trade);
      const { data } = await query;
      setResults((data ?? []) as SearchPro[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, trade]);

  async function connect(p: SearchPro) {
    setConnected((prev) => new Set(prev).add(p.id));
    await logEvent(`homeowner:${homeownerId}`, "pro_connect_requested", {
      pro_id: p.id,
      home_id: homeId,
      source: "search",
    });
    await notifyPro(
      p.id,
      "connect_request",
      "New connect request",
      `The homeowner at ${address} wants to connect with you`,
      { home_id: homeId, homeowner_id: homeownerId },
    );
    onToast(`Request sent to ${p.business}`);
  }

  const showEmpty = results !== null && !loading && results.length === 0;

  return (
    <Card className="anim-fade-up !p-4 sm:!p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Eyebrow accent="indigo">Find a pro</Eyebrow>
        {results !== null && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setTrade("all");
              setResults(null);
            }}
            className="pressable text-xs font-semibold text-muted hover:text-ink flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
        <Field label="Search by name or area">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Aqua Works, Austin, 78704…"
              className="pl-9"
            />
          </div>
        </Field>
        <Field label="Trade">
          <Select value={trade} onChange={(e) => setTrade(e.target.value)}>
            <option value="all">All trades</option>
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loading && <div className="mt-4 text-sm text-muted">Searching…</div>}

      {showEmpty && (
        <div className="mt-4 text-sm text-muted">
          No pros match that yet. Try a different name, ZIP, or trade, or invite them below.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((p) => {
            const already = existing.has(p.id);
            const done = connected.has(p.id);
            return (
              <div
                key={p.id}
                className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-ink/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.business} accent="indigo" size={44} />
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{p.business}</div>
                    <div className="text-xs text-muted flex items-center gap-1.5 truncate">
                      <TradeIcon trade={p.trade} size={12} className="text-indigo" />
                      {tradeLabel(p.trade)}
                      {p.service_area ? ` · ${p.service_area}` : ""}
                      {p.google_rating ? ` · ${Number(p.google_rating).toFixed(1)}★` : ""}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {already ? (
                    <Pill accent="indigo">On your home</Pill>
                  ) : done ? (
                    <Pill accent="coral">Request sent</Pill>
                  ) : (
                    <Btn variant="indigo" size="sm" onClick={() => connect(p)}>
                      <UserPlus size={14} /> Connect
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
