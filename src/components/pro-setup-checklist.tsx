import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ChevronDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { proTrades } from "@/lib/hb";

type StepKey = "business" | "trade" | "service_area" | "phone";

type ChecklistItem = {
  key: StepKey;
  label: string;
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
    { key: "business", label: "Business name", done: !!row?.business?.trim() },
    { key: "trade", label: "Choose your trades", done: proTrades(row ?? {}).length > 0 },
    { key: "service_area", label: "Service area", done: !!row?.service_area?.trim() },
    { key: "phone", label: "Contact phone", done: !!row?.phone?.trim() },
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

const COLLAPSED_KEY = "hb_pro_setup_collapsed";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeFlag(key: string, on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function ProSetupChecklist({ proId }: { proId: string | null }) {
  const { loading, items, completed, total, allDone } = useProSetup(proId);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readFlag(COLLAPSED_KEY));
    setHydrated(true);
  }, []);

  if (loading || !proId || !hydrated) return null;
  if (allDone) return null;

  const remaining = items.filter((i) => !i.done);
  const pct = Math.round((completed / total) * 100);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          writeFlag(COLLAPSED_KEY, false);
          setCollapsed(false);
        }}
        className="anim-fade-up mt-4 w-full pressable flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 hover:bg-soft transition-colors"
        aria-label="Expand setup checklist"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold text-ink">Finish setting up</div>
          <div className="mt-1 h-1 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-indigo" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-xs font-semibold text-muted tnum">
          {completed}/{total}
        </span>
        <ChevronDown size={14} className="text-muted shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="anim-fade-up mt-4 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-ink">Finish setting up</div>
            <span className="text-xs font-semibold text-muted tnum">
              {completed} of {total}
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-indigo transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            writeFlag(COLLAPSED_KEY, true);
            setCollapsed(true);
          }}
          className="pressable shrink-0 p-1 text-muted hover:text-ink"
          aria-label="Minimize setup checklist"
        >
          <Minus size={14} />
        </button>
      </div>

      <ul className="mt-2 divide-y divide-line/70">
        {remaining.map((item) => (
          <li key={item.key}>
            <Link
              to="/pro/setup"
              search={{ step: item.key }}
              className="flex items-center gap-2 py-2 -mx-1 px-1 rounded-lg hover:bg-soft active:bg-line/50 transition-colors"
            >
              <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate">
                {item.label}
              </span>
              <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
