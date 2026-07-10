import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ChevronDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { HomeownerRow } from "@/components/home-shell";

/* Homeowner mirror of ProSetupChecklist: same collapsed bar, progress track,
   and step rows deep-linking into the wizard. Setup is never forced; this
   card is the only pull into /home/setup. */

type StepKey = "name" | "password" | "contact" | "home";

type ChecklistItem = {
  key: StepKey;
  label: string;
  done: boolean;
};

type HomeSetupState = {
  loading: boolean;
  items: ChecklistItem[];
  completed: number;
  total: number;
  allDone: boolean;
};

export function useHomeSetup(homeowner: HomeownerRow | null): HomeSetupState {
  const [userLoading, setUserLoading] = useState(true);
  const [isGoogle, setIsGoogle] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const u = data?.user;
      setIsGoogle(u?.app_metadata?.provider === "google");
      setHasPassword(u?.user_metadata?.has_password === true);
      setUserLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items: ChecklistItem[] = [
    { key: "name", label: "Your name", done: !!homeowner?.name?.trim() },
    // Google users sign back in with Google; a password step does not apply.
    ...(isGoogle ? [] : [{ key: "password" as const, label: "Set a password", done: hasPassword }]),
    {
      key: "contact",
      label: "Confirm how we reach you",
      done: !!homeowner?.contact_confirmed_at,
    },
    { key: "home", label: "Confirm your home", done: !!homeowner?.setup_completed_at },
  ];

  const completed = items.filter((i) => i.done).length;
  return {
    loading: userLoading || !homeowner,
    items,
    completed,
    total: items.length,
    allDone: completed === items.length,
  };
}

const COLLAPSED_KEY = "hb_home_setup_collapsed";

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

export function HomeSetupChecklist({ homeowner }: { homeowner: HomeownerRow | null }) {
  const { loading, items, completed, total, allDone } = useHomeSetup(homeowner);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readFlag(COLLAPSED_KEY));
    setHydrated(true);
  }, []);

  if (loading || !homeowner || !hydrated) return null;
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
        className="anim-fade-up mb-6 w-full pressable flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 hover:bg-soft transition-colors"
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
    <div className="anim-fade-up mb-6 rounded-xl border border-line bg-white p-3">
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
              to="/home/setup"
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
