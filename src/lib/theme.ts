// Portal theme preference. Mirrors the session.ts pattern: localStorage +
// a window event so every mounted toggle stays in sync. Marketing pages
// never read this; only the portal shells apply the class.
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "hb_theme";
const EVENT = "hb_theme_change";

/* Private-mode fallback: if localStorage throws, the choice still works
   for the current page life via this module variable. */
let memoryTheme: Theme | null = null;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* fall through to memory */
  }
  return memoryTheme ?? "light";
}

export function setTheme(t: Theme) {
  memoryTheme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* memory-only */
  }
  window.dispatchEvent(new Event(EVENT));
}

/* SSR renders light; the effect corrects after hydration. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => set(getTheme());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [theme, setTheme];
}
