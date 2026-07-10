import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Wrench,
  MapPin,
  Phone,
  CreditCard,
  Star,
  ClipboardList,
  Check,
  ChevronRight,
  ChevronDown,
  Minus,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleUrl } from "@/lib/hb";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { ProgressRing } from "@/components/svg";

type SettingsHash = "profile" | "google" | "plan";

type ChecklistItem = {
  key: string;
  label: string;
  hint: string;
  icon: typeof Briefcase;
  done: boolean;
  to: "/pro/settings" | "/pro/jobs/new";
  hash?: SettingsHash;
};

type ProSetupState = {
  loading: boolean;
  items: ChecklistItem[];
  completed: number;
  total: number;
  allDone: boolean;
};

export function useProSetup(proId: string | null, jobsCount?: number): ProSetupState {
  const [row, setRow] = useState<{
    business: string | null;
    trade: string | null;
    service_area: string | null;
    phone: string | null;
    stripe_charges_enabled: boolean | null;
    google_place_id: string | null;
  } | null>(null);
  const [fetchedJobsCount, setFetchedJobsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const proQuery = supabase
        .from("pros")
        .select("business,trade,service_area,phone,stripe_charges_enabled,google_place_id")
        .eq("id", proId)
        .maybeSingle();
      const jobsQuery =
        jobsCount === undefined
          ? supabase
              .from("jobs")
              .select("id", { count: "exact", head: true })
              .eq("pro_id", proId)
          : null;
      const [proRes, jobsRes] = await Promise.all([
        proQuery,
        jobsQuery ?? Promise.resolve(null),
      ]);
      const results = [
        { data: proRes.data },
        jobsRes ? { count: jobsRes.count } : null,
      ] as Array<{ data?: unknown; count?: number | null } | null>;
      if (cancelled) return;
      setRow(
        (results[0]?.data as {
          business: string | null;
          trade: string | null;
          service_area: string | null;
          phone: string | null;
          stripe_charges_enabled: boolean | null;
          google_place_id: string | null;
        } | null) ?? null,
      );
      if (jobsCount === undefined && results[1]) {
        setFetchedJobsCount(results[1].count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId, jobsCount]);

  const effectiveJobsCount = jobsCount ?? fetchedJobsCount ?? 0;

  const items: ChecklistItem[] = [
    {
      key: "business",
      label: "Business name",
      hint: "How your name appears on records.",
      icon: Briefcase,
      done: !!row?.business?.trim(),
      to: "/pro/settings",
      hash: "profile",
    },
    {
      key: "trade",
      label: "Choose your trade",
      hint: "So we tailor forms and reminders.",
      icon: Wrench,
      done: !!row?.trade?.trim(),
      to: "/pro/settings",
      hash: "profile",
    },
    {
      key: "service_area",
      label: "Service area",
      hint: "Cities or ZIPs you cover.",
      icon: MapPin,
      done: !!row?.service_area?.trim(),
      to: "/pro/settings",
      hash: "profile",
    },
    {
      key: "phone",
      label: "Contact phone",
      hint: "So homeowners can reach you back.",
      icon: Phone,
      done: !!row?.phone?.trim(),
      to: "/pro/settings",
      hash: "profile",
    },
    {
      key: "payments",
      label: "Set up payments",
      hint: "Get paid by card and ACH from your invoices.",
      icon: CreditCard,
      done: !!row?.stripe_charges_enabled,
      to: "/pro/settings",
      hash: "plan",
    },
    {
      key: "google",
      label: "Connect Google Business",
      hint: "Route review asks to your Google page.",
      icon: Star,
      done: isGoogleUrl(row?.google_place_id ?? null),
      to: "/pro/settings",
      hash: "google",
    },
    {
      key: "first_job",
      label: "Log your first job",
      hint: "About 30 seconds. Sends a branded record.",
      icon: ClipboardList,
      done: effectiveJobsCount > 0,
      to: "/pro/jobs/new",
    },
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

const DONE_KEY = "hb_pro_setup_done";
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

export function ProSetupChecklist({
  proId,
  jobsCount,
}: {
  proId: string | null;
  jobsCount: number;
}) {
  const { loading, items, completed, total, allDone } = useProSetup(proId, jobsCount);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedDone, setDismissedDone] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  // Track whether we've observed an incomplete state this session, so we only
  // celebrate on a real incomplete→complete transition.
  const [sawIncomplete, setSawIncomplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readFlag(COLLAPSED_KEY));
    setDismissedDone(readFlag(DONE_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!allDone) {
      setSawIncomplete(true);
    } else if (sawIncomplete && !dismissedDone) {
      setCelebrated(true);
      writeFlag(DONE_KEY, true);
    }
  }, [allDone, hydrated, loading, sawIncomplete, dismissedDone]);

  if (loading || !proId || !hydrated) return null;

  // Fully set up and we never saw an incomplete state this session → render nothing.
  if (allDone && !celebrated) return null;

  if (allDone) {
    return (
      <Card className="anim-fade-up mb-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-indigobg text-indigo flex items-center justify-center shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <Eyebrow accent="indigo">You're all set</Eyebrow>
          <div className="mt-1 font-semibold text-ink">
            Setup complete — records, payments, and reviews are ready.
          </div>
        </div>
        <button
          onClick={() => {
            setDismissedDone(true);
            setCelebrated(false);
          }}
          className="pressable text-xs font-semibold text-muted hover:text-ink"
        >
          Dismiss
        </button>
      </Card>
    );
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          writeFlag(COLLAPSED_KEY, false);
          setCollapsed(false);
        }}
        className="anim-fade-up mb-5 w-full pressable flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 hover:bg-soft transition-colors"
        aria-label="Expand setup checklist"
      >
        <ProgressRing
          value={completed / total}
          size={32}
          strokeWidth={4}
          label={`${completed} of ${total} steps done`}
        />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold text-ink truncate">
            Finish setting up your account
          </div>
        </div>
        <Pill accent="indigo">
          {completed} of {total}
        </Pill>
        <ChevronDown size={16} className="text-muted shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <Card className="anim-fade-up mb-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <ProgressRing
            value={completed / total}
            size={64}
            strokeWidth={6}
            label={`${completed} of ${total} steps done`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Eyebrow accent="indigo">Get set up</Eyebrow>
            <Pill accent="indigo">
              {completed} of {total}
            </Pill>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-ink font-display">
            Finish setting up your account
          </h2>
          <p className="text-sm text-muted mt-0.5">
            A few quick steps so your records, payments, and reviews all work.
          </p>
        </div>
        <button
          onClick={() => {
            writeFlag(COLLAPSED_KEY, true);
            setCollapsed(true);
          }}
          className="pressable shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
          aria-label="Minimize setup checklist"
        >
          <Minus size={14} aria-hidden="true" />
          Minimize
        </button>
      </div>


      <ul className="mt-4 divide-y divide-line">
        {items.map((item) => {
          const Icon = item.icon;
          const rowInner = (
            <>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                  item.done
                    ? "bg-indigo text-(--on-accent) border-indigo"
                    : "bg-paper text-muted border-line"
                }`}
                aria-hidden="true"
              >
                {item.done ? <Check size={15} /> : <Icon size={14} />}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    item.done ? "text-muted line-through" : "text-ink"
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-xs text-muted">{item.hint}</div>
              </div>
              {!item.done && (
                <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
              )}
            </>
          );
          const rowCls =
            "py-3 flex items-center gap-3 -mx-2 px-2 rounded-lg transition-colors";
          if (item.done) {
            return (
              <li key={item.key} className={rowCls}>
                {rowInner}
              </li>
            );
          }
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                hash={item.hash}
                className={`${rowCls} hover:bg-soft active:bg-line/50`}
              >
                {rowInner}
              </Link>
            </li>
          );
        })}
      </ul>

      {completed === 0 && (
        <div className="mt-4 flex justify-end">
          <Link to="/pro/settings" hash="profile">
            <Btn variant="indigo" size="sm">
              Start setup
            </Btn>
          </Link>
        </div>
      )}
    </Card>
  );
}
