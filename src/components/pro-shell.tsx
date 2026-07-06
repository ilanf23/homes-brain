import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import {
  fetchNotifications,
  markNotificationsRead,
  tradeLabel,
  type ProNotification,
} from "@/lib/hb";
import { Avatar, Btn, Card, Skeleton } from "@/lib/ui";
import { Logo } from "@/components/svg";

export type ProRow = {
  id: string;
  business: string;
  trade: string;
  service_area: string | null;
  logo: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  plan: string;
};

/* Session guard + pro fetch shared by every /pro/* page (except signup). */
export function useProGuard() {
  const navigate = useNavigate();
  const [pro, setPro] = useState<ProRow | null>(null);
  const [proId, setProId] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "pro") {
      navigate({ to: "/login" });
      return;
    }
    setProId(s.proId);
    (async () => {
      const { data } = await supabase
        .from("pros")
        .select("id,business,trade,service_area,logo,google_place_id,google_rating,plan")
        .eq("id", s.proId)
        .maybeSingle();
      if (!data) {
        clearSession();
        navigate({ to: "/login" });
        return;
      }
      setPro(data as ProRow);
    })();
  }, [navigate]);

  return { proId, pro, setPro };
}

export type ProNavKey =
  | "dashboard"
  | "customers"
  | "records"
  | "invoices"
  | "due"
  | "reviews"
  | "referral"
  | "settings";

const NAV: { key: ProNavKey; label: string; to: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", to: "/pro", icon: LayoutDashboard },
  { key: "customers", label: "Customers", to: "/pro/customers", icon: Users },
  { key: "records", label: "Records", to: "/pro/records", icon: FileText },
  { key: "invoices", label: "Invoices", to: "/pro/invoices", icon: ReceiptText },
  { key: "due", label: "Due for service", to: "/pro/due", icon: CalendarClock },
  { key: "reviews", label: "Reviews", to: "/pro/reviews", icon: Star },
  { key: "referral", label: "Referral", to: "/pro/referral", icon: Gift },
  { key: "settings", label: "Settings", to: "/pro/settings", icon: Settings },
];

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* Bell + unread badge + dropdown, shown in the sidebar (desktop) and header (mobile).
   Opening the panel marks everything read; unread dots persist until it closes. */
function NotificationsBell({ proId, align }: { proId: string; align: "left" | "right" }) {
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
        aria-label={badge > 0 ? `Notifications, ${badge} unread` : "Notifications"}
        aria-expanded={open}
        className="pressable relative text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
      >
        <Bell size={17} />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={toggle} aria-hidden="true" />
          <div
            className={`absolute top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] ${
              align === "left" ? "left-0" : "right-0"
            }`}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="px-4 py-3 border-b border-line text-sm font-bold text-ink">
              Notifications
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                Nothing yet. When homeowners view records, claim homes, or ask to connect, it lands
                here.
              </p>
            ) : (
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
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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

  function signOut() {
    clearSession();
    navigate({ to: "/" });
  }

  return (
    <div className="font-app min-h-dvh bg-soft md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line bg-paper sticky top-0 h-dvh">
        <div className="px-5 h-16 flex items-center justify-between border-b border-line">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          {pro && <NotificationsBell proId={pro.id} align="left" />}
        </div>
        <div className="p-3">
          <Link to="/pro/jobs/new">
            <Btn variant="indigo" className="w-full">
              <Plus size={16} /> Log a job
            </Btn>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Pro navigation">
          {NAV.map(({ key, label, to, icon: Icon }) => (
            <Link
              key={key}
              to={to}
              aria-current={active === key ? "page" : undefined}
              className={`pressable flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                active === key
                  ? "bg-indigobg text-indigo font-bold"
                  : "text-muted font-semibold hover:text-ink hover:bg-soft"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-2.5 px-2">
            {pro ? (
              <>
                <Avatar name={pro.business} accent="indigo" size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{pro.business}</div>
                  <div className="text-xs text-muted truncate">{tradeLabel(pro.trade)}</div>
                </div>
              </>
            ) : (
              <>
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </>
            )}
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="pressable text-muted hover:text-ink p-1.5 rounded-lg hover:bg-soft transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content column (with mobile header + nav) */}
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={24} wordmarkClassName="text-sm" />
            </Link>
            <div className="flex items-center gap-1">
              {pro && <NotificationsBell proId={pro.id} align="right" />}
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="pressable text-muted hover:text-ink p-1.5 rounded-lg"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <nav
            className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar"
            aria-label="Pro navigation"
          >
            {NAV.map(({ key, label, to }) => (
              <Link
                key={key}
                to={to}
                aria-current={active === key ? "page" : undefined}
                className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-[13px] ${
                  active === key
                    ? "bg-indigobg text-indigo font-bold"
                    : "text-muted font-semibold hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <main
          className={`mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"} px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-10`}
        >
          {children}
        </main>

        {/* Mobile: the one primary action lives in the bottom thumb zone, always reachable. */}
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pt-3 bg-gradient-to-t from-[var(--soft)] via-[var(--soft)]/90 to-transparent pointer-events-none"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <Link to="/pro/jobs/new" className="block pointer-events-auto">
            <Btn
              variant="indigo"
              size="lg"
              className="w-full shadow-[0_12px_28px_-10px_rgba(71,63,176,0.55)]"
              tabIndex={-1}
            >
              <Plus size={18} /> Log a job
            </Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Content-area skeleton that mirrors the real page layout (head → stats → list),
   shown inside the shell so navigation never blanks the screen. */
export function ProPageSkeleton({ variant = "list" }: { variant?: "list" | "dashboard" }) {
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
      <span className="sr-only">Loading</span>
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
