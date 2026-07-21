import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Home, LogOut, MapPin, Plus, UserRound, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Card, FaceAvatar, PageLoader } from "@/lib/ui";
import { BottomTabBar, TAB_BAR_CONTENT_PAD } from "@/components/bottom-tab-bar";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { useTheme } from "@/lib/theme";
import { rememberLastPath, useHideOnScroll } from "@/lib/mobile";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/svg";
import { useT, type TKey } from "@/lib/i18n";
import { phIdentify, phReset } from "@/lib/posthog";
import { registerPushNotifications } from "@/lib/push";

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
  consent_at?: string | null;
  setup_completed_at?: string | null;
  contact_confirmed_at?: string | null;
  sms_consent_at?: string | null;
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
  localized_content?: Record<
    string,
    { what_done?: string | null; equipment_type?: string | null }
  > | null;
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
  home_id?: string | null;
  hidden_fields: string[] | null;
};

export type HomeViewBundle = {
  homeowner: HomeownerRow | null;
  home: HomeRow | null;
  homes: HomeRow[];
  equipment: HomeEquipment[];
  jobs: HomeJob[];
  pros: HomeProRow[];
  invites: HomeInvite[];
  records: HomeRecord[];
};

const EMPTY_BUNDLE: HomeViewBundle = {
  homeowner: null,
  home: null,
  homes: [],
  equipment: [],
  jobs: [],
  pros: [],
  invites: [],
  records: [],
};

/* Homeowner guard: requires a real Supabase auth session. Loads the home
   bundle via get_home_view() (SECURITY DEFINER, scoped to auth.uid()). */
export function useHomeownerGuard() {
  const navigate = useNavigate();
  const [homeownerId, setHomeownerId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<HomeViewBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    // get_home_view is the only data source for every /home page. A
    // transient failure here must not read as "this account has no home":
    // pages route on that, so retry before giving up.
    let view: HomeViewBundle | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.rpc("get_home_view");
      if (!error) {
        view = (data as HomeViewBundle | null) ?? null;
        break;
      }
      console.error("get_home_view failed", error);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    if (view) {
      setBundle({
        homeowner: view.homeowner,
        home: view.home,
        homes: view.homes ?? (view.home ? [view.home] : []),
        equipment: view.equipment ?? [],
        jobs: view.jobs ?? [],
        pros: view.pros ?? [],
        invites: view.invites ?? [],
        records: view.records ?? [],
      });
      if (view.homeowner) setHomeownerId(view.homeowner.id);
    }
    return view;
  };

  const refresh = async () => {
    await load();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // getUser() re-validates with Supabase Auth; localStorage alone must
      // never be enough to enter /home/*.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        navigate({ to: "/login" });
        return;
      }
      const view = await load();
      if (cancelled) return;
      if (view?.homeowner) {
        phIdentify(userData.user.id, {
          role: "homeowner",
          homeowner_id: view.homeowner.id,
          email: userData.user.email ?? undefined,
        });
      }
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/login" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return {
    homeownerId,
    homeowner: bundle.homeowner,
    setHomeowner: (h: HomeownerRow) => setBundle((b) => ({ ...b, homeowner: h })),
    home: bundle.home,
    homes: bundle.homes,
    equipment: bundle.equipment,
    jobs: bundle.jobs,
    pros: bundle.pros,
    invites: bundle.invites,
    records: bundle.records,
    loading,
    refresh,
  };
}

export type HomeNavKey =
  | "overview"
  | "appliances"
  | "pros"
  | "reminders"
  | "add"
  | "profile"
  | "settings";

/* Which bottom tab lights up for each page; the add flow lights the center +,
   and reminders/settings live under Profile on mobile. */
const TAB_FOR_KEY: Record<HomeNavKey, "overview" | "appliances" | "pros" | "profile" | "create"> = {
  overview: "overview",
  appliances: "appliances",
  pros: "pros",
  reminders: "profile",
  add: "create",
  profile: "profile",
  settings: "profile",
};

/* Desktop sidebar mirrors the mobile bottom bar: same four destinations,
   one mental model everywhere. Reminders and settings live under Profile. */
const NAV: {
  key: "overview" | "appliances" | "pros" | "profile";
  labelKey: TKey;
  to: string;
  icon: typeof Home;
}[] = [
  { key: "overview", labelKey: "nav.myHome", to: "/home", icon: Home },
  { key: "appliances", labelKey: "nav.appliances", to: "/home/appliances", icon: Wrench },
  { key: "pros", labelKey: "nav.myPros", to: "/home/pros", icon: Users },
  { key: "profile", labelKey: "nav.profile", to: "/home/profile", icon: UserRound },
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
  const headerHidden = useHideOnScroll();
  const routerLocation = useLocation();
  useEffect(() => {
    rememberLastPath(routerLocation.pathname + (routerLocation.searchStr || ""));
  }, [routerLocation.pathname, routerLocation.searchStr]);
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
          <Link to="/" className="flex items-center group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
        </div>
        <div className="p-3">
          <Link to="/home/add">
            <Btn variant="indigo" className="w-full">
              <Plus size={16} /> {t("nav.addToHome")}
            </Btn>
          </Link>
        </div>
        <nav
          className="flex-1 px-3 space-y-0.5 overflow-y-auto"
          aria-label={t("nav.homeownerNavigation")}
        >
          {NAV.map(({ key, labelKey, to, icon: Icon }) => (
            <Link
              key={key}
              to={to}
              aria-current={TAB_FOR_KEY[active] === key ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                TAB_FOR_KEY[active] === key
                  ? "bg-indigobg text-indigo font-bold"
                  : "text-muted font-semibold hover:text-ink hover:bg-soft"
              }`}
            >
              <Icon size={17} />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-2">
          <div className="flex items-center gap-2.5 px-2">
            <FaceAvatar accent="indigo" size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">
                {homeowner?.name || t("chrome.homeowner")}
              </div>
              <div className="text-xs text-muted truncate">{home?.address ?? ""}</div>
            </div>
            <ThemeToggle />
            <button
              onClick={signOut}
              aria-label={t("chrome.signOut")}
              title={t("chrome.signOut")}
              className="pressable text-muted hover:text-ink p-1.5 rounded-lg hover:bg-soft transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content column (with mobile header + nav) */}
      <div className="flex-1 min-w-0">
        <header
          className={`md:hidden sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md transition-transform duration-200 ${headerHidden ? "-translate-y-full" : ""}`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="relative px-4 h-14 flex items-center justify-between gap-2 min-w-0">
            <Link to="/" className="flex items-center shrink-0" aria-label="HomesBrain">
              <Logo size={24} showWordmark={false} />
            </Link>
            {home && (
              <Link
                to="/home"
                aria-label={`${t("nav.myHome")}: ${home.address}`}
                className="pressable absolute left-1/2 -translate-x-1/2 flex max-w-[64vw] items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-xs font-bold text-ink"
              >
                <MapPin size={13} className="shrink-0 text-indigo" aria-hidden="true" />
                <span className="truncate">{home.address}</span>
              </Link>
            )}
            <Link
              to="/home/reminders"
              aria-label={t("nav.reminders")}
              className="pressable text-muted hover:text-ink p-2 rounded-lg hover:bg-soft"
            >
              <Bell size={17} />
            </Link>
          </div>
        </header>

        <main
          className={`tab-swipe-main mx-auto max-w-3xl px-4 sm:px-6 pt-6 md:pt-10 ${TAB_BAR_CONTENT_PAD} md:pb-10`}
        >
          {children}
        </main>

        {/* Mobile: Instagram-style bottom tab bar; add-to-home is the center +
            and the profile slot shows the avatar. */}
        <PullToRefresh />
        <BottomTabBar
          items={[
            { key: "overview", label: t("nav.myHome"), to: "/home", icon: Home },
            { key: "appliances", label: t("tab.appliances"), to: "/home/appliances", icon: Wrench },
            { key: "pros", label: t("tab.pros"), to: "/home/pros", icon: Users },
            { key: "profile", label: t("nav.profile"), to: "/home/profile", icon: UserRound },
          ]}
          activeKey={TAB_FOR_KEY[active]}
          create={{ to: "/home/add", label: t("nav.addToHome") }}
          createActive={TAB_FOR_KEY[active] === "create"}
          swipeEnabled={active !== "add"}
        />
      </div>
    </div>
  );
}

/* Loading state shortcut so consumers can suspend on the guard. */
export function useHomeownerPageLoader(loading: boolean) {
  if (loading) return <PageLoader label="Loading" />;
  return null;
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
    <div className="anim-fade-up flex items-end justify-between flex-wrap gap-4 mb-5">
      <div>
        <div className="eyebrow text-indigo">{eyebrow}</div>
        <h1 className="mt-1 text-2xl sm:text-3xl tracking-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted max-w-xl leading-relaxed">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
