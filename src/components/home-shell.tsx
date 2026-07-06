import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Home, LogOut, Plus, Settings, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/session";
import { Avatar, Btn, Card, PageLoader, Pill } from "@/lib/ui";
import { useTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/svg";

export type HomeownerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notify_email?: boolean;
  notify_sms?: boolean;
  sms_opt_out?: boolean;
  respect_quiet_hrs?: boolean;
  marketing_consent?: boolean;
};

export type HomeRow = {
  id: string;
  address: string;
  claimed_at: string | null;
};

export type HomeEquipment = {
  id: string;
  home_id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  serial: string | null;
  warranty_until: string | null;
  recall_status: string;
  source: string;
  created_at: string;
};

export type HomeJob = {
  id: string;
  pro_id: string;
  home_id: string;
  customer_id: string | null;
  equipment_id: string | null;
  what_done: string;
  next_service_date: string | null;
  created_at: string;
};

export type HomeProRow = {
  id: string;
  business: string;
  trade: string;
  logo: string | null;
  google_rating: number | null;
};

export type HomeInvite = {
  id: string;
  home_id: string;
  from_homeowner: string;
  to_pro_name: string;
  to_pro_phone: string | null;
  trade: string | null;
  status: string;
  created_at: string;
};

export type HomeRecord = {
  id: string;
  public_url: string;
  viewed_at: string | null;
  created_at: string;
  job_id: string;
};

export type HomeViewBundle = {
  homeowner: HomeownerRow | null;
  home: HomeRow | null;
  equipment: HomeEquipment[];
  jobs: HomeJob[];
  pros: HomeProRow[];
  invites: HomeInvite[];
  records: HomeRecord[];
};

/* Session guard + full home view fetched via the get_home_view RPC (SECURITY
   DEFINER, so it works from the anon key even though direct table access is
   closed). Screens read all data from this hook. */
export function useHomeownerGuard() {
  const navigate = useNavigate();
  const [homeownerId, setHomeownerId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<HomeViewBundle>({
    homeowner: null,
    home: null,
    equipment: [],
    jobs: [],
    pros: [],
    invites: [],
    records: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = async (id?: string) => {
    const hid = id ?? homeownerId;
    if (!hid) return;
    const { data } = await supabase.rpc("get_home_view", { p_homeowner_id: hid });
    const view = (data as HomeViewBundle | null) ?? null;
    if (view) {
      setBundle({
        homeowner: view.homeowner,
        home: view.home,
        equipment: view.equipment ?? [],
        jobs: view.jobs ?? [],
        pros: view.pros ?? [],
        invites: view.invites ?? [],
        records: view.records ?? [],
      });
    }
  };

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "homeowner") {
      navigate({ to: "/login" });
      return;
    }
    setHomeownerId(s.homeownerId);
    (async () => {
      const { data } = await supabase.rpc("get_home_view", { p_homeowner_id: s.homeownerId });
      const view = data as HomeViewBundle | null;
      if (!view || !view.homeowner) {
        clearSession();
        navigate({ to: "/login" });
        return;
      }
      setBundle({
        homeowner: view.homeowner,
        home: view.home,
        equipment: view.equipment ?? [],
        jobs: view.jobs ?? [],
        pros: view.pros ?? [],
        invites: view.invites ?? [],
        records: view.records ?? [],
      });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return {
    homeownerId,
    homeowner: bundle.homeowner,
    setHomeowner: (h: HomeownerRow) => setBundle((b) => ({ ...b, homeowner: h })),
    home: bundle.home,
    equipment: bundle.equipment,
    jobs: bundle.jobs,
    pros: bundle.pros,
    invites: bundle.invites,
    records: bundle.records,
    loading,
    refresh,
  };
}

export type HomeNavKey = "overview" | "appliances" | "pros" | "reminders" | "add" | "settings";

const NAV: { key: HomeNavKey; label: string; to: string; icon: typeof Home }[] = [
  { key: "overview", label: "My home", to: "/home", icon: Home },
  { key: "appliances", label: "Appliances", to: "/home/appliances", icon: Wrench },
  { key: "pros", label: "My pros", to: "/home/pros", icon: Users },
  { key: "reminders", label: "Reminders", to: "/home/reminders", icon: Bell },
  { key: "settings", label: "Settings", to: "/home/settings", icon: Settings },
];

export function HomeShell({
  active,
  homeowner,
  home,
  children,
}: {
  active: HomeNavKey;
  homeowner?: HomeownerRow | null;
  home?: HomeRow | null;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [theme] = useTheme();

  function signOut() {
    clearSession();
    navigate({ to: "/" });
  }

  return (
    /* text-ink re-resolves the inherited body color inside the .dark scope. */
    <div
      className={`font-app min-h-dvh bg-soft text-ink md:flex ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line bg-paper sticky top-0 h-dvh">
        <div className="px-5 h-16 flex items-center border-b border-line">
          <Link to="/" className="flex items-center group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
        </div>
        <div className="p-3">
          <Link to="/home/add">
            <Btn variant="indigo" className="w-full">
              <Plus size={16} /> Add to your home
            </Btn>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Homeowner navigation">
          {NAV.map(({ key, label, to, icon: Icon }) => (
            <Link
              key={key}
              to={to}
              aria-current={active === key ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
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
            <Avatar name={homeowner?.name || "Homeowner"} accent="indigo" size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">
                {homeowner?.name || "Homeowner"}
              </div>
              <div className="text-xs text-muted truncate">{home?.address ?? ""}</div>
            </div>
            <ThemeToggle />
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
            <Link to="/" className="flex items-center">
              <Logo size={24} />
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/home/add">
                <Btn variant="indigo" size="sm">
                  <Plus size={14} /> Add
                </Btn>
              </Link>
              <Pill accent="indigo">Homeowner</Pill>
              <ThemeToggle />
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
            aria-label="Homeowner navigation"
          >
            {NAV.map(({ key, label, to }) => (
              <Link
                key={key}
                to={to}
                aria-current={active === key ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
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

        <main className="mx-auto max-w-3xl px-5 py-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

/* Standard page heading inside the homeowner shell. */
export function HomePageHead({
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
