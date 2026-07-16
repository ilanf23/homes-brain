import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { proTrades } from "@/lib/hb";
import { useT, type TKey } from "@/lib/i18n";

type StepKey = "business" | "trade" | "service_area" | "phone";

type ChecklistItem = {
  key: StepKey;
  labelKey: TKey;
  done: boolean;
};

type ProSetupState = {
  loading: boolean;
  items: ChecklistItem[];
  completed: number;
  total: number;
  allDone: boolean;
};

export function useProSetup(proId: string | null): ProSetupState {
  const [row, setRow] = useState<{
    business: string | null;
    trade: string | null;
    trades: string[] | null;
    service_area: string | null;
    phone: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pros")
        .select("business,trade,trades,service_area,phone")
        .eq("id", proId)
        .maybeSingle();
      if (cancelled) return;
      setRow(
        (data as {
          business: string | null;
          trade: string | null;
          trades: string[] | null;
          service_area: string | null;
          phone: string | null;
        } | null) ?? null,
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  const items: ChecklistItem[] = [
    { key: "business", labelKey: "setup.item.business", done: !!row?.business?.trim() },
    { key: "trade", labelKey: "setup.item.trade", done: proTrades(row ?? {}).length > 0 },
    { key: "service_area", labelKey: "setup.item.service_area", done: !!row?.service_area?.trim() },
    { key: "phone", labelKey: "setup.item.phone", done: !!row?.phone?.trim() },
  ];

  const completed = items.filter((i) => i.done).length;
  return {
    loading,
    items,
    completed,
    total: items.length,
    allDone: completed === items.length,
  };
}

/* Setup progress as a nav entry. Lives at the top of the pro nav (desktop
   sidebar and mobile menu) rather than floating over the page, so it never
   covers the primary action. Auto-hides once every step is done. */
export function ProSetupNavItem({
  proId,
  mobile = false,
  onNavigate,
}: {
  proId: string | null;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { loading, completed, total, allDone } = useProSetup(proId);
  const t = useT();

  if (!proId || loading || allDone) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <Link
      to="/pro/setup"
      onClick={onNavigate}
      aria-label={`${t("setup.finish")}: ${completed}/${total}`}
      className={`pressable mb-1.5 block rounded-xl border border-indigo/25 bg-indigobg px-3 ${
        mobile ? "py-3" : "py-2.5"
      } hover:border-indigo/40 transition-colors`}
    >
      <span className="flex items-center gap-2.5">
        <Sparkles size={mobile ? 18 : 17} className="shrink-0 text-indigo" aria-hidden="true" />
        <span
          className={`min-w-0 flex-1 truncate font-bold text-indigo ${mobile ? "text-[15px]" : "text-sm"}`}
        >
          {t("setup.finish")}
        </span>
        <span className="shrink-0 text-xs font-bold text-indigo tnum">
          {completed}/{total}
        </span>
      </span>
      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-indigo/20">
        <span
          className="block h-full rounded-full bg-indigo transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </span>
    </Link>
  );
}

/* Back-compat: previous inline usages import `ProSetupChecklist`. Keep the
   export but render nothing - setup progress now lives in the pro nav. */
export function ProSetupChecklist(_: { proId: string | null }) {
  return null;
}
