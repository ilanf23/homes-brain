import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarClock,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import { tradeLabel } from "@/lib/hb";
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
  | "due"
  | "reviews"
  | "referral"
  | "settings";

const NAV: { key: ProNavKey; label: string; to: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", to: "/pro", icon: LayoutDashboard },
  { key: "customers", label: "Customers", to: "/pro/customers", icon: Users },
  { key: "records", label: "Records", to: "/pro/records", icon: FileText },
  { key: "due", label: "Due for service", to: "/pro/due", icon: CalendarClock },
  { key: "reviews", label: "Reviews", to: "/pro/reviews", icon: Star },
  { key: "referral", label: "Referral", to: "/pro/referral", icon: Gift },
  { key: "settings", label: "Settings", to: "/pro/settings", icon: Settings },
];

export function ProShell({
  pro,
  active,
  children,
}: {
  pro: ProRow | null;
  active: ProNavKey;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  function signOut() {
    clearSession();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-soft md:flex">
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
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="pressable text-muted hover:text-ink p-1.5 rounded-lg"
            >
              <LogOut size={16} />
            </button>
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

        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-10">
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
