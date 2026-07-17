import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronRight,
  Gift,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tradeLabel } from "@/lib/hb";
import { Card, FaceAvatar, Pill } from "@/lib/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageInlinePicker, useT, type TKey } from "@/lib/i18n";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { phReset } from "@/lib/posthog";

export const Route = createFileRoute("/pro/profile")({
  head: () => ({ meta: [{ title: "Profile - HomesBrain" }] }),
  component: ProProfile,
});

/* Everything that used to hide in the hamburger, one tap from the Profile tab. */
const MENU: { labelKey: TKey; to: string; icon: typeof Settings }[] = [
  { labelKey: "pro.nav.dashboard", to: "/pro/dashboard", icon: LayoutDashboard },
  { labelKey: "pro.nav.invoices", to: "/pro/invoices", icon: ReceiptText },
  { labelKey: "pro.nav.due", to: "/pro/due", icon: CalendarClock },
  { labelKey: "pro.nav.reviews", to: "/pro/reviews", icon: Star },
  { labelKey: "pro.nav.referral", to: "/pro/referral", icon: Gift },
  { labelKey: "pro.nav.office", to: "/pro/office", icon: LayoutDashboard },
  { labelKey: "pro.nav.settings", to: "/pro/settings", icon: Settings },
];

function ProProfile() {
  const { pro } = useProGuard();
  const navigate = useNavigate();
  const t = useT();

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

  return (
    <ProShell pro={pro} active="profile">
      <div className="anim-fade-up space-y-4 max-w-xl mx-auto">
        <Card className="flex items-center gap-4">
          <FaceAvatar accent="indigo" size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl tracking-tight">{pro.business}</h1>
            <p className="truncate text-sm text-muted">{trades.join(" · ")}</p>
            <div className="mt-2">
              <Pill accent="indigo">{pro.plan}</Pill>
            </div>
          </div>
        </Card>

        <Card className="!p-2">
          {MENU.map(({ labelKey, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="pressable flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-semibold text-ink hover:bg-soft"
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
