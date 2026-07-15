import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, Eyebrow, Pill, Skeleton } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin: HomesBrain" }] }),
  component: AdminPage,
});

type KpiCell = { actual: number; target: number | null; label: string };
type Kpis = Record<string, KpiCell> & {
  totals?: Record<string, number>;
};

type FunnelStep = { step: string; label: string; count: number; pct: number };
type HomeownerFunnel = {
  funnel: FunnelStep[];
  spread: { second_pro_added: number; guide_viewed: number; directory_viewed: number };
};

type TsPoint = { t: string; v: number };

type RecentEvent = {
  created_at: string;
  role: string | null;
  actor: string | null;
  type: string;
  props: Record<string, unknown> | null;
};

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);
  const [tab, setTab] = useState<"pros" | "homeowners">("pros");

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [proFunnel, setProFunnel] = useState<FunnelStep[] | null>(null);
  const [homeFunnel, setHomeFunnel] = useState<HomeownerFunnel | null>(null);
  const [activeSeries, setActiveSeries] = useState<TsPoint[] | null>(null);
  const [signupSeries, setSignupSeries] = useState<TsPoint[] | null>(null);
  const [recent, setRecent] = useState<RecentEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        if (!cancelled) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      if (cancelled) return;
      const ok = !error && data === true;
      setAllowed(ok);
      setChecking(false);
      if (!ok) return;

      const [k, pf, hf, act, sig, rec] = await Promise.all([
        supabase.rpc("admin_kpis"),
        supabase.rpc("admin_pro_funnel"),
        supabase.rpc("admin_homeowner_funnel"),
        supabase.rpc("admin_timeseries", { p_metric: "active_logging_pros", p_grain: "day" }),
        supabase.rpc("admin_timeseries", { p_metric: "signups", p_grain: "day" }),
        supabase.rpc("admin_recent_events", { p_limit: 50 }),
      ]);
      if (cancelled) return;
      setKpis((k.data as Kpis) ?? null);
      setProFunnel((pf.data as FunnelStep[]) ?? null);
      setHomeFunnel((hf.data as HomeownerFunnel) ?? null);
      setActiveSeries((act.data as TsPoint[]) ?? null);
      setSignupSeries((sig.data as TsPoint[]) ?? null);
      setRecent((rec.data as RecentEvent[]) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <Shell>
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </Shell>
    );
  }

  if (!allowed) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center pt-16">
          <Eyebrow accent="red">Admin</Eyebrow>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Not authorized</h1>
          <p className="mt-2 text-sm text-muted">
            This page is restricted. If you think you should have access, ask an admin to add your
            email to the allowlist.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <Eyebrow accent="indigo">Admin</Eyebrow>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Analytics</h1>
        </div>
        <div className="inline-flex rounded-full border border-line bg-white p-1 text-sm font-semibold">
          <button
            onClick={() => setTab("pros")}
            className={`pressable rounded-full px-4 py-1.5 ${
              tab === "pros" ? "bg-indigo text-white" : "text-muted hover:text-ink"
            }`}
          >
            Pros
          </button>
          <button
            onClick={() => setTab("homeowners")}
            className={`pressable rounded-full px-4 py-1.5 ${
              tab === "homeowners" ? "bg-indigo text-white" : "text-muted hover:text-ink"
            }`}
          >
            Homeowners
          </button>
        </div>
      </div>

      {tab === "pros" ? (
        <ProsTab
          kpis={kpis}
          funnel={proFunnel}
          activeSeries={activeSeries}
          signupSeries={signupSeries}
          recent={recent}
        />
      ) : (
        <HomeownersTab funnel={homeFunnel} recent={recent} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</div>
    </div>
  );
}

function ProsTab({
  kpis,
  funnel,
  activeSeries,
  signupSeries,
  recent,
}: {
  kpis: Kpis | null;
  funnel: FunnelStep[] | null;
  activeSeries: TsPoint[] | null;
  signupSeries: TsPoint[] | null;
  recent: RecentEvent[] | null;
}) {
  const kpiKeys = [
    "active_logging_pros",
    "pro_activation_48h",
    "record_open_rate",
    "homeowner_claim_rate",
    "second_pro_rate",
    "pro_retention_2wk",
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {kpiKeys.map((k) => {
          const cell = kpis?.[k];
          return <KpiCard key={k} keyName={k} cell={cell} />;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Eyebrow accent="indigo">Pro funnel</Eyebrow>
          <div className="mt-2 text-xs text-muted">
            Reached → signed up → first job → repeat.
          </div>
          <div className="mt-4 h-64">
            {funnel ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number, _n, ctx) => {
                      const p = (ctx?.payload as FunnelStep | undefined)?.pct ?? 0;
                      return [`${v} (${Math.round(p * 100)}%)`, "Pros"];
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {funnel.map((_, i) => (
                      <Cell key={i} fill="var(--indigo)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
          {funnel && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {funnel.map((s) => (
                <li key={s.step} className="flex justify-between tnum">
                  <span>{s.label}</span>
                  <span>
                    {s.count} · {Math.round(s.pct * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Eyebrow accent="indigo">Active logging pros</Eyebrow>
          <div className="mt-2 text-xs text-muted">Distinct pros with a job, per day (30d).</div>
          <div className="mt-4 h-64">
            <TsChart data={activeSeries} color="var(--indigo)" />
          </div>
        </Card>

        <Card>
          <Eyebrow accent="indigo">New pro signups</Eyebrow>
          <div className="mt-2 text-xs text-muted">New pros per day (30d).</div>
          <div className="mt-4 h-64">
            <TsChart data={signupSeries} color="var(--coral)" />
          </div>
        </Card>

        <Card>
          <Eyebrow accent="indigo">Activation & retention</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <MiniStat
              label="First job < 48h"
              value={formatPct(kpis?.pro_activation_48h?.actual)}
              target="60%"
              hit={hitTarget(kpis?.pro_activation_48h)}
            />
            <MiniStat
              label="2nd job in 2 wks"
              value={formatPct(kpis?.pro_retention_2wk?.actual)}
              target="50%"
              hit={hitTarget(kpis?.pro_retention_2wk)}
            />
            <MiniStat
              label="Pros with a job"
              value={String(kpis?.totals?.pros_with_job ?? "-")}
              target={`of ${kpis?.totals?.pros ?? "-"}`}
              hit={null}
            />
            <MiniStat
              label="Records viewed"
              value={String(kpis?.totals?.records_viewed ?? "-")}
              target={`of ${kpis?.totals?.records_sent ?? "-"}`}
              hit={null}
            />
          </div>
        </Card>
      </div>

      <Card>
        <Eyebrow accent="indigo">Live event feed</Eyebrow>
        <div className="mt-3 divide-y divide-line">
          {(recent ?? []).slice(0, 50).map((e, i) => (
            <div key={i} className="py-2 flex items-center gap-3 text-sm">
              <RoleTag role={e.role} />
              <div className="font-semibold text-ink flex-1 min-w-0 truncate">{e.type}</div>
              <div className="text-xs text-muted font-mono truncate max-w-[220px] hidden sm:block">
                {e.actor ?? "-"}
              </div>
              <div className="text-xs text-muted tnum shrink-0">{formatDate(e.created_at)}</div>
            </div>
          ))}
          {recent && recent.length === 0 && (
            <div className="py-6 text-sm text-muted text-center">No events yet.</div>
          )}
          {!recent && <Skeleton className="h-32 w-full" />}
        </div>
      </Card>
    </div>
  );
}

function HomeownersTab({
  funnel,
  recent,
}: {
  funnel: HomeownerFunnel | null;
  recent: RecentEvent[] | null;
}) {
  const homeownerEvents = useMemo(
    () => (recent ?? []).filter((e) => e.role === "homeowner"),
    [recent],
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Eyebrow accent="indigo">Homeowner claim funnel</Eyebrow>
          <div className="mt-2 text-xs text-muted">
            Claim invite sent → opened → home claimed.
          </div>
          <div className="mt-4 h-64">
            {funnel ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel.funnel}
                  margin={{ top: 10, right: 12, bottom: 4, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number, _n, ctx) => {
                      const p = (ctx?.payload as FunnelStep | undefined)?.pct ?? 0;
                      return [`${v} (${Math.round(p * 100)}%)`, "Homeowners"];
                    }}
                  />
                  <Bar dataKey="count" fill="var(--coral)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
          {funnel && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {funnel.funnel.map((s) => (
                <li key={s.step} className="flex justify-between tnum">
                  <span>{s.label}</span>
                  <span>
                    {s.count} · {Math.round(s.pct * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Eyebrow accent="indigo">Spread & engagement</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <MiniStat
              label="Second pro added"
              value={String(funnel?.spread.second_pro_added ?? "-")}
              target="pros invited"
              hit={null}
            />
            <MiniStat
              label="Claim invites sent"
              value={String(funnel?.funnel[0]?.count ?? "-")}
              target="all-time"
              hit={null}
            />
            <MiniStat
              label="Guide views"
              value={String(funnel?.spread.guide_viewed ?? "-")}
              target="all-time"
              hit={null}
            />
            <MiniStat
              label="Directory views"
              value={String(funnel?.spread.directory_viewed ?? "-")}
              target="all-time"
              hit={null}
            />
          </div>
        </Card>
      </div>

      <Card>
        <Eyebrow accent="indigo">Homeowner event feed</Eyebrow>
        <div className="mt-3 divide-y divide-line">
          {homeownerEvents.slice(0, 50).map((e, i) => (
            <div key={i} className="py-2 flex items-center gap-3 text-sm">
              <RoleTag role={e.role} />
              <div className="font-semibold text-ink flex-1 min-w-0 truncate">{e.type}</div>
              <div className="text-xs text-muted font-mono truncate max-w-[220px] hidden sm:block">
                {e.actor ?? "-"}
              </div>
              <div className="text-xs text-muted tnum shrink-0">{formatDate(e.created_at)}</div>
            </div>
          ))}
          {recent && homeownerEvents.length === 0 && (
            <div className="py-6 text-sm text-muted text-center">No homeowner events yet.</div>
          )}
          {!recent && <Skeleton className="h-32 w-full" />}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ keyName, cell }: { keyName: string; cell: KpiCell | undefined }) {
  const isRate = keyName !== "active_logging_pros";
  const value = cell
    ? isRate
      ? formatPct(cell.actual)
      : String(cell.actual)
    : "-";
  const target = cell?.target != null ? (isRate ? formatPct(cell.target) : String(cell.target)) : null;
  const hit = hitTarget(cell);
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-muted font-bold">
        {cell?.label ?? keyName}
      </div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <div className="text-3xl font-extrabold tnum text-ink">{value}</div>
        {target && (
          <div className="text-xs text-muted tnum">
            target <span className="font-semibold">{target}</span>
          </div>
        )}
        {hit !== null && (
          <Pill accent={hit ? "indigo" : "amber"}>{hit ? "On target" : "Below"}</Pill>
        )}
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  target,
  hit,
}: {
  label: string;
  value: string;
  target: string;
  hit: boolean | null;
}) {
  return (
    <div className="rounded-xl border border-line bg-soft p-3">
      <div className="text-xs uppercase tracking-wider text-muted font-bold">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-extrabold tnum text-ink">{value}</div>
        <div className="text-xs text-muted">{target}</div>
      </div>
      {hit !== null && (
        <div className="mt-1">
          <Pill accent={hit ? "indigo" : "amber"}>{hit ? "On target" : "Below"}</Pill>
        </div>
      )}
    </div>
  );
}

function RoleTag({ role }: { role: string | null }) {
  const r = role ?? "system";
  const accent = r === "pro" ? "indigo" : r === "homeowner" ? "coral" : "ink";
  const bg =
    accent === "indigo" ? "bg-indigobg text-indigo" : accent === "coral" ? "bg-coralbg text-coral-dark" : "bg-soft text-muted";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bg}`}
    >
      {r}
    </span>
  );
}

function TsChart({ data, color }: { data: TsPoint[] | null; color: string }) {
  if (!data) return <Skeleton className="h-full w-full" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{ border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "-";
  return `${Math.round(v * 100)}%`;
}

function hitTarget(cell: KpiCell | undefined): boolean | null {
  if (!cell || cell.target == null) return null;
  return cell.actual >= cell.target;
}
