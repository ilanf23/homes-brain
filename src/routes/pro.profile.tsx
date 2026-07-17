import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  Gift,
  LayoutDashboard,
  LogOut,
  Settings,
  Star,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleUrl, tradeLabel } from "@/lib/hb";
import { Avatar, Card } from "@/lib/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageInlinePicker, useT, type TKey } from "@/lib/i18n";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { phReset } from "@/lib/posthog";

export const Route = createFileRoute("/pro/profile")({
  head: () => ({ meta: [{ title: "Profile - HomesBrain" }] }),
  component: ProProfile,
});

/* The four things worth a big picture-button, in plain words. Facebook's
   menu-grid mental model: a picture and a word, tap the whole square. */
const TILES: { labelKey: TKey; to: string; icon: typeof Wallet }[] = [
  { labelKey: "pro.profile.money", to: "/pro/invoices", icon: Wallet },
  { labelKey: "pro.profile.upcoming", to: "/pro/due", icon: CalendarClock },
  { labelKey: "pro.profile.getReviews", to: "/pro/reviews", icon: Star },
  { labelKey: "pro.profile.inviteBuddy", to: "/pro/referral", icon: Gift },
];

/* Quiet footer: the gear-corner stuff, deliberately smaller than the tiles. */
const FOOTER_LINKS: { labelKey: TKey; to: string; icon: typeof Settings }[] = [
  { labelKey: "pro.nav.office", to: "/pro/office", icon: LayoutDashboard },
  { labelKey: "pro.nav.settings", to: "/pro/settings", icon: Settings },
];

/* One proud number in the identity card's strip. Big tabular figure, plain
   label, high contrast so it reads in the sun. */
function StatCell({
  value,
  label,
  star = false,
}: {
  value: number | string | null;
  label: string;
  star?: boolean;
}) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="flex items-center justify-center gap-1 text-2xl font-extrabold tracking-tight text-ink tnum">
        {value == null ? "—" : value}
        {star && <Star size={16} className="fill-current text-indigo" aria-hidden="true" />}
      </div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function ProProfile() {
  const { proId, pro } = useProGuard();
  const navigate = useNavigate();
  const t = useT();
  const [stats, setStats] = useState<{ jobs: number; customers: number } | null>(null);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const [jobsRes, customersRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("pro_id", proId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("pro_id", proId),
      ]);
      if (cancelled) return;
      setStats({ jobs: jobsRes.count ?? 0, customers: customersRes.count ?? 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  async function signOut() {
    await supabase.auth.signOut();
    phReset();
    navigate({ to: "/" });
  }

  if (!pro) {
    return (
      <ProShell pro={pro} active="profile">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  const trades = (pro.trades?.length ? pro.trades : pro.trade ? [pro.trade] : []).map((tr) =>
    tradeLabel(tr),
  );
  const hasRating = isGoogleUrl(pro.google_place_id) && pro.google_rating != null;

  return (
    <ProShell pro={pro} active="profile">
      <div className="anim-fade-up space-y-5 max-w-xl mx-auto">
        {/* Identity + proud numbers: the "this is my business" card. */}
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            {pro.logo ? (
              <img
                src={pro.logo}
                alt=""
                className="h-16 w-16 shrink-0 rounded-[20px] border border-line object-cover"
              />
            ) : (
              <Avatar name={pro.business} accent="indigo" size={64} />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink">
                {pro.business}
              </h1>
              {trades.length > 0 && (
                <p className="truncate text-[15px] text-muted">{trades.join(" · ")}</p>
              )}
            </div>
          </div>

          <div
            className={`grid ${hasRating ? "grid-cols-3" : "grid-cols-2"} divide-x divide-line border-t border-line`}
          >
            <StatCell value={stats?.jobs ?? null} label={t("pro.profile.jobs")} />
            <StatCell value={stats?.customers ?? null} label={t("pro.nav.customers")} />
            {hasRating && (
              <StatCell value={pro.google_rating} label={t("pro.profile.rating")} star />
            )}
          </div>
        </Card>

        {/* The grid: four big picture-buttons, whole square is the tap target. */}
        <div className="grid grid-cols-2 gap-3">
          {TILES.map(({ labelKey, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="pressable liftable flex min-h-[116px] flex-col justify-between gap-5 rounded-[20px] border border-line bg-paper p-4"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigobg text-indigo">
                <Icon size={24} strokeWidth={2.2} />
              </span>
              <span className="text-[17px] font-bold leading-tight text-ink">{t(labelKey)}</span>
            </Link>
          ))}
        </div>

        {/* Gear corner: quieter rows and toggles, clearly secondary. */}
        <Card className="!p-2">
          {FOOTER_LINKS.map(({ labelKey, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="pressable flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-soft"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft text-muted">
                <Icon size={17} />
              </span>
              <span className="flex-1">{t(labelKey)}</span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </Card>

        <Card className="!p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("lang.label")}
            </span>
            <LanguageInlinePicker />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("chrome.theme")}
            </span>
            <ThemeToggle />
          </div>
        </Card>

        <button
          type="button"
          onClick={signOut}
          className="pressable flex w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] font-semibold text-ink hover:bg-soft"
        >
          <LogOut size={17} /> {t("chrome.signOut")}
        </button>
      </div>
    </ProShell>
  );
}
