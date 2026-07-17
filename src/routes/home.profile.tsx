import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight, Home, LogOut, MapPin, Settings, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, FaceAvatar, PageLoader } from "@/lib/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageInlinePicker, useT, type TKey } from "@/lib/i18n";
import { HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { phReset } from "@/lib/posthog";

export const Route = createFileRoute("/home/profile")({
  head: () => ({ meta: [{ title: "Profile - HomesBrain" }] }),
  component: HomeProfile,
});

/* Pages that live off the bottom bar, one tap from the Profile tab. */
const MENU: { labelKey: TKey; to: string; icon: typeof Settings }[] = [
  { labelKey: "nav.reminders", to: "/home/reminders", icon: Bell },
  { labelKey: "nav.settings", to: "/home/settings", icon: Settings },
];

function HomeProfile() {
  const { homeowner, home, homes, equipment, jobs, pros, loading } = useHomeownerGuard();
  const navigate = useNavigate();
  const t = useT();

  async function signOut() {
    await supabase.auth.signOut();
    phReset();
    navigate({ to: "/" });
  }

  if (loading) return <PageLoader label="Loading" />;

  return (
    <HomeShell active="profile" homeowner={homeowner} home={home}>
      <div className="anim-fade-up mx-auto max-w-xl space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-indigobg via-paper to-paper p-5 shadow-[0_18px_42px_-36px_rgba(22,22,15,0.7)]">
          <div className="flex items-center gap-4">
            <FaceAvatar accent="indigo" size={72} />
            <div className="min-w-0 flex-1">
              <div className="eyebrow text-indigo">Homeowner profile</div>
              <h1 className="mt-1 truncate text-2xl tracking-tight">
                {homeowner?.name || t("chrome.homeowner")}
              </h1>
              {home && (
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
                  <MapPin size={14} className="shrink-0 text-indigo" />
                  <span className="truncate">{home.address}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-paper/80 py-3 text-center">
            {[
              { value: equipment.length, label: "Appliances", icon: Wrench },
              { value: pros.length, label: "Pros", icon: Users },
              { value: jobs.length, label: "Visits", icon: Home },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="px-2">
                <Icon size={15} className="mx-auto mb-1 text-indigo" />
                <div className="font-mono text-lg font-bold text-ink tnum">{value}</div>
                <div className="text-[11px] font-semibold text-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <Card className="grid gap-2 !p-2 sm:grid-cols-2">
          {MENU.map(({ labelKey, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="pressable flex min-h-[64px] items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigobg text-indigo">
                <Icon size={19} />
              </span>
              <span className="flex-1">{t(labelKey)}</span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </Card>

        {homes.length > 0 && (
          <Card className="!p-4">
            <div className="eyebrow text-indigo">Your homes</div>
            <div className="mt-3 space-y-2">
              {homes.map((item) => (
                <div
                  key={item.id}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2.5 ${
                    item.id === home?.id ? "bg-indigobg text-indigo" : "bg-soft text-ink"
                  }`}
                >
                  <MapPin size={17} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {item.address}
                  </span>
                  {item.id === home?.id && (
                    <span className="text-[11px] font-bold uppercase tracking-wider">Current</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="space-y-1 !p-3">
          <div className="flex min-h-12 items-center justify-between rounded-xl px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("lang.label")}
            </span>
            <LanguageInlinePicker />
          </div>
          <div className="flex min-h-12 items-center justify-between rounded-xl px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("chrome.theme")}
            </span>
            <ThemeToggle />
          </div>
        </Card>

        <button
          type="button"
          onClick={signOut}
          className="pressable flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] font-semibold text-ink hover:bg-soft"
        >
          <LogOut size={17} /> {t("chrome.signOut")}
        </button>
      </div>
    </HomeShell>
  );
}
