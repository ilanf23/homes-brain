import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, X } from "lucide-react";
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

/* Circular progress ring used inside the floating collapsed button. */
function Ring({ pct, size = 56, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 300ms ease" }}
      />
    </svg>
  );
}

/* Floating setup progress widget. Sits fixed bottom-right of the pro shell,
   offset above the mobile "Log a job" CTA when it's visible. Auto-hides at
   100%. Data + step deep-links unchanged from the previous inline card. */
export function ProSetupWidget({
  proId,
  hasBottomCta = false,
}: {
  proId: string | null;
  /* When the pro shell renders its fixed mobile "Log a job" button, lift the
     widget above it so it never covers the primary action. */
  hasBottomCta?: boolean;
}) {
  const { loading, items, completed, total, allDone } = useProSetup(proId);
  const t = useT();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close the expanded card when tapping outside of it.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  if (loading || !proId) return null;
  if (allDone) return null;

  const pct = Math.round((completed / total) * 100);
  const label = `${t("setup.finish")}: ${completed}/${total}`;

  // Bottom offset: clear the mobile Log-a-job CTA (~72px tall + safe area) on
  // small screens when it's present, otherwise a comfortable margin. Desktop
  // never has that CTA so bottom-6 is fine.
  const bottomStyle: React.CSSProperties = hasBottomCta
    ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }
    : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" };

  return (
    <div
      className="fixed right-4 md:right-6 z-40 print:hidden"
      style={bottomStyle}
    >
      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={t("setup.finish")}
          className="anim-fade-up mb-3 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.35)] overflow-hidden"
        >
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo">
                {t("setup.finish")}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-ink tnum">
                  {pct}%
                </span>
                <span className="text-xs font-semibold text-muted tnum">
                  {completed}/{total}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-indigo transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="pressable shrink-0 -mr-1 -mt-1 p-2 rounded-lg text-muted hover:text-ink hover:bg-soft"
              aria-label={t("setup.minimize")}
            >
              <X size={16} />
            </button>
          </div>
          <ul className="pb-2">
            {items.map((item) => (
              <li key={item.key}>
                {item.done ? (
                  <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted">
                    <span className="inline-flex w-5 h-5 rounded-full bg-indigobg text-indigo items-center justify-center shrink-0">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="flex-1 min-w-0 line-through opacity-80 truncate">
                      {t(item.labelKey)}
                    </span>
                  </div>
                ) : (
                  <Link
                    to="/pro/setup"
                    search={{ step: item.key }}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-soft active:bg-line/50 transition-colors"
                  >
                    <span
                      className="inline-flex w-5 h-5 rounded-full border-2 border-line shrink-0"
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                      {t(item.labelKey)}
                    </span>
                    <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        className="pressable group relative flex items-center gap-2 rounded-full bg-indigo text-white pl-1.5 pr-4 py-1.5 shadow-[0_16px_36px_-12px_rgba(71,63,176,0.6)] hover:shadow-[0_20px_44px_-12px_rgba(71,63,176,0.7)] transition-shadow"
      >
        <span className="relative inline-flex items-center justify-center">
          <Ring pct={pct} size={44} stroke={4} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tnum">
            {completed}/{total}
          </span>
        </span>
        <span className="text-sm font-bold pr-1">{t("setup.finish")}</span>
      </button>
    </div>
  );
}

/* Back-compat: previous inline usages import `ProSetupChecklist`. Keep the
   export but render nothing — the widget is now mounted globally in ProShell. */
export function ProSetupChecklist(_: { proId: string | null }) {
  return null;
}

