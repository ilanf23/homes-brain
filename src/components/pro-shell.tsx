import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchNotifications,
  markNotificationsRead,
  tradeLabel,
  type ProNotification,
} from "@/lib/hb";
import { Btn, Card, FaceAvatar, Skeleton } from "@/lib/ui";
import { useTheme } from "@/lib/theme";
import { rememberLastPath, useHideOnScroll } from "@/lib/mobile";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch, MobileProSearch } from "@/components/pro-search";
import { ProSetupNavItem } from "@/components/pro-setup-checklist";

import { useI18n, useT, type TKey } from "@/lib/i18n";
import { Logo } from "@/components/svg";
import { BottomTabBar, TAB_BAR_CONTENT_PAD } from "@/components/bottom-tab-bar";
import { BottomSheet } from "@/components/bottom-sheet";

import { PullToRefresh } from "@/components/pull-to-refresh";
import { phIdentify, phReset } from "@/lib/posthog";
import { registerPushNotifications } from "@/lib/push";

export type ProRow = {
  id: string;
  business: string;
  owner_first_name: string | null;
  /* Legacy single trade: kept as the primary trade for backwards-compatible surfaces. */
  trade: string;
  /* Multi-trade selection. Source of truth for the trade set; `trade` mirrors trades[0]. */
  trades: string[];
  service_area: string | null;
  logo: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  plan: string;
};

/* Real Supabase auth guard for every /pro/* page (except signup).
   Redirects to /login when there's no session or the user isn't a pro. */
export function useProGuard() {
  const navigate = useNavigate();
  const [pro, setPro] = useState<ProRow | null>(null);
  const [proId, setProId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // getUser() re-validates the session with Supabase Auth; a stale
      // localStorage session on its own is not enough to enter /pro/*.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = !userErr ? userData.user : null;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const { data } = await supabase
        .from("pros")
        .select(
          "id,business,owner_first_name,trade,trades,service_area,logo,google_place_id,google_rating,plan",
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        // Authenticated user is not a pro yet: send them through pro signup
        // instead of showing another pro's data or bouncing to /login.
        navigate({ to: "/pro/signup" });
        return;
      }
      setProId(data.id);
      setPro(data as ProRow);
      phIdentify(user.id, { role: "pro", pro_id: data.id, email: user.email ?? undefined });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/login" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return { proId, pro, setPro };
}

export type ProNavKey =
  | "home"
  | "dashboard"
  | "customers"
  | "records"
  | "invoices"
  | "due"
  | "reviews"
  | "referral"
  | "office"
  | "profile"
  | "settings";

type NavItem = {
  key: "dashboard" | "customers" | "records" | "profile";
  labelKey: TKey;
  to: string;
  icon: typeof LayoutDashboard;
};

/* Desktop sidebar mirrors the mobile bottom bar exactly: same four
   destinations, same order, one mental model everywhere. Log-a-job is its
   own primary button above; everything else lives under Profile. */
const SIDEBAR_NAV: NavItem[] = [
  { key: "dashboard", labelKey: "pro.nav.dashboard", to: "/pro/dashboard", icon: LayoutDashboard },
  { key: "customers", labelKey: "pro.nav.customers", to: "/pro/customers", icon: Users },
  { key: "records", labelKey: "pro.nav.records", to: "/pro/records", icon: FileText },
  { key: "profile", labelKey: "pro.nav.profile", to: "/pro/profile", icon: UserRound },
];

function timeAgo(iso: string, locale: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  if (mins < 1) return relative.format(0, "minute");
  if (mins < 60) return relative.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/* Bell + unread badge + dropdown, shown in the top bar (desktop) and header (mobile).
   Opening the panel marks everything read; unread dots persist until it closes. */
function NotificationsBell({ proId, align }: { proId: string; align: "left" | "right" }) {
  const t = useT();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProNotification[]>([]);
  const [badge, setBadge] = useState(0);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchNotifications(proId);
      if (cancelled) return;
      setItems(list);
      const unread = list.filter((n) => !n.read_at).map((n) => n.id);
      setBadge(unread.length);
      setUnreadIds(new Set(unread));
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && badge > 0) {
      setBadge(0);
      markNotificationsRead(proId);
    }
    if (!next) setUnreadIds(new Set());
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={
          badge > 0
            ? `${t("pro.notifications")}, ${badge} ${t("pro.notificationsUnread")}`
            : t("pro.notifications")
        }
        aria-expanded={open}
        className="pressable relative text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
      >
        <Bell size={17} />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo text-(--on-accent) text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {/* Shared list body: dropdown on desktop, bottom sheet on mobile. */}
      {open && (
        <>
          <div className="hidden md:block">
            <div className="fixed inset-0 z-40" onClick={toggle} aria-hidden="true" />
            <div
              className={`absolute top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] ${
                align === "left" ? "left-0" : "right-0"
              }`}
              role="dialog"
              aria-label={t("pro.notifications")}
            >
              <div className="px-4 py-3 border-b border-line text-sm font-bold text-ink">
                {t("pro.notifications")}
              </div>
              <NotificationsList items={items} unreadIds={unreadIds} locale={locale} />
            </div>
          </div>
          <div className="md:hidden">
            <BottomSheet open onClose={toggle} title={t("pro.notifications")}>
              <NotificationsList items={items} unreadIds={unreadIds} locale={locale} />
            </BottomSheet>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationsList({
  items,
  unreadIds,
  locale,
}: {
  items: ProNotification[];
  unreadIds: Set<string>;
  locale: string;
}) {
  const t = useT();
  if (items.length === 0)
    return <p className="px-4 py-6 text-sm text-muted">{t("pro.notificationsEmpty")}</p>;
  return (
    <div className="max-h-96 overflow-y-auto divide-y divide-line">
      {items.map((n) => (
        <div key={n.id} className="px-4 py-3 flex items-start gap-2.5">
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
              unreadIds.has(n.id) ? "bg-indigo" : "bg-transparent"
            }`}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink">{n.title}</div>
            {n.detail && <div className="text-xs text-muted mt-0.5">{n.detail}</div>}
          </div>
          <span className="text-xs text-muted font-mono tnum shrink-0">
            {timeAgo(n.created_at, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Avatar dropdown in the top bar: identity, Settings, Sign out.
   Same overlay pattern as NotificationsBell. */
function AccountMenu({ pro, onSignOut }: { pro: ProRow | null; onSignOut: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!pro) return <Skeleton className="w-8 h-8 rounded-xl shrink-0" />;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("pro.accountMenu")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="pressable block rounded-xl"
      >
        <FaceAvatar accent="indigo" size={32} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label={t("pro.account")}
            className="absolute top-full right-0 mt-2 z-50 w-64 rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-line flex items-center gap-2.5">
              <FaceAvatar accent="indigo" size={36} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink truncate">{pro.business}</div>
                <div className="text-xs text-muted truncate">
                  {(pro.trades?.length ? pro.trades : pro.trade ? [pro.trade] : [])
                    .map((t) => tradeLabel(t))
                    .join(" · ")}
                </div>
              </div>
            </div>
            <div className="p-1.5">
              <Link
                to="/pro/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="pressable flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted font-semibold hover:text-ink hover:bg-soft"
              >
                <Settings size={16} /> {t("pro.nav.settings")}
              </Link>
              <button
                role="menuitem"
                onClick={onSignOut}
                className="pressable w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted font-semibold hover:text-ink hover:bg-soft"
              >
                <LogOut size={16} /> {t("chrome.signOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Which bottom tab lights up for each page. The center + is the log-a-job
   page (active "home"): it maps to "home", which matches no tab, and lights
   the + via createActive instead. Dashboard is now its own tab; the rest of
   the folded-off surfaces live under Profile. */
const TAB_FOR_KEY: Record<ProNavKey, "dashboard" | "customers" | "records" | "profile" | "home"> = {
  home: "home",
  dashboard: "dashboard",
  customers: "customers",
  records: "records",
  invoices: "profile",
  due: "profile",
  reviews: "profile",
  referral: "profile",
  office: "profile",
  profile: "profile",
  settings: "profile",
};

export function ProShell({
  pro,
  active,
  wide = false,
  children,
}: {
  pro: ProRow | null;
  active: ProNavKey;
  /* Wider content column for three-column record pages (customer detail). */
  wide?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [theme] = useTheme();
  const headerHidden = useHideOnScroll();
  const routerLocation = useLocation();
  useEffect(() => {
    rememberLastPath(routerLocation.pathname + (routerLocation.searchStr || ""));
  }, [routerLocation.pathname, routerLocation.searchStr]);
  /* Register native push once we have an authenticated pro. No-op on web. */
  useEffect(() => {
    if (!pro?.id) return;
    registerPushNotifications().catch(() => {});
  }, [pro?.id]);
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useT();

  async function signOut() {
    await supabase.auth.signOut();
    phReset();
    navigate({ to: "/" });
  }

  return (
    /* text-ink re-resolves the inherited body color inside the .dark scope. */
    <div
      className={`font-app type-up min-h-dvh bg-soft text-ink md:flex ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line bg-paper sticky top-0 h-dvh">
        <div className="px-5 h-16 flex items-center border-b border-line">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
        </div>
        <div className="p-3">
          <Link to="/pro/jobs/new">
            <Btn variant="indigo" className="w-full">
              <Plus size={16} /> {t("pro.logJob")}
            </Btn>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label={t("pro.navigation")}>
          <ProSetupNavItem proId={pro?.id ?? null} />
          {SIDEBAR_NAV.map(({ key, labelKey, to, icon: Icon }) => {
            const isActive = TAB_FOR_KEY[active] === key;
            return (
              <Link
                key={key}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={`pressable flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                  isActive
                    ? "bg-indigobg text-indigo font-bold"
                    : "text-muted font-semibold hover:text-ink hover:bg-soft"
                }`}
              >
                <Icon size={17} />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content column (with mobile header + nav) */}
      <div className="flex-1 min-w-0">
        {/* Desktop top bar: search left, actions right. Mobile keeps its own header. */}
        <header className="hidden md:flex sticky top-0 z-40 h-16 items-center gap-3 px-6 border-b border-line bg-paper/85 backdrop-blur-md">
          <GlobalSearch proId={pro?.id ?? null} />
          <div className="ml-auto flex items-center gap-1.5">
            <Link to="/pro/jobs/new">
              <Btn variant="indigo" size="sm" tabIndex={-1}>
                <Plus size={14} />
                <span className="hidden lg:inline">{t("pro.logJob")}</span>
              </Btn>
            </Link>
            <ThemeToggle />
            {pro ? (
              <NotificationsBell proId={pro.id} align="right" />
            ) : (
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            )}
            <AccountMenu pro={pro} onSignOut={signOut} />
          </div>
        </header>

        <header
          className={`md:hidden sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md transition-transform duration-200 ${headerHidden ? "-translate-y-full" : ""}`}
        >
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" aria-label="HomesBrain">
              <Logo size={24} wordmarkClassName="text-sm" />
            </Link>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t("pro.search.label")}
                className="pressable text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
              >
                <Search size={17} />
              </button>
              {pro ? (
                <NotificationsBell proId={pro.id} align="right" />
              ) : (
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              )}
            </div>
          </div>
        </header>

        <MobileProSearch
          proId={pro?.id ?? null}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />

        <main
          className={`tab-swipe-main mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"} px-4 sm:px-6 pt-6 md:pt-10 ${TAB_BAR_CONTENT_PAD} md:pb-10`}
        >
          {children}
        </main>

        {/* Mobile: Instagram-style bottom tab bar. Clients + Records sit left
            of the center + (log a job); Dashboard + Profile sit right. */}
        <PullToRefresh />
        <BottomTabBar
          items={[
            { key: "customers", label: t("pro.nav.customers"), to: "/pro/customers", icon: Users },
            { key: "records", label: t("pro.nav.records"), to: "/pro/records", icon: FileText },
            {
              key: "dashboard",
              label: t("pro.nav.dashboard"),
              to: "/pro/dashboard",
              icon: LayoutDashboard,
            },
            { key: "profile", label: t("pro.nav.profile"), to: "/pro/profile", icon: UserRound },
          ]}
          activeKey={TAB_FOR_KEY[active]}
          create={{ to: "/pro/jobs/new", label: t("pro.logJob") }}
          createActive={active === "home"}
          swipeEnabled={active !== "home"}
        />
      </div>
    </div>
  );
}

/* Content-area skeleton that mirrors the real page layout (head → stats → list),
   shown inside the shell so navigation never blanks the screen. */
export function ProPageSkeleton({ variant = "list" }: { variant?: "list" | "dashboard" }) {
  const t = useT();
  return (
    <div className="anim-fade-in" aria-hidden="true">
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2.5 h-8 w-56" />
        <Skeleton className="mt-2.5 h-3.5 w-72 max-w-full" />
      </div>
      {variant === "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="!p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-14" />
            </Card>
          ))}
        </div>
      )}
      <Card className="!p-3">
        <div className="divide-y divide-line">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-3.5">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40 max-w-[60%]" />
                <Skeleton className="h-3 w-56 max-w-[80%]" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </Card>
      <span className="sr-only">{t("pro.loading")}</span>
    </div>
  );
}

/* Standard page heading inside the pro shell. */
export function ProPageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade-up flex items-end justify-between flex-wrap gap-4 mb-6">
      <div>
        <div className="eyebrow text-indigo">{eyebrow}</div>
        <h1 className="mt-1 text-3xl tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted max-w-xl">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
