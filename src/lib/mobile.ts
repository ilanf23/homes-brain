import { useEffect, useState } from "react";

/* Mobile-chrome feel helpers shared by the pro and homeowner shells. */

/* Instagram header behavior: slides away while scrolling down, returns on the
   first nudge up, always visible near the top of the page. */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - last;
        if (y < 64) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

/* Soft haptic tick. Android vibrates; iOS Safari has no vibrate API and
   ignores it silently, which is the correct fallback. */
export function haptic(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/* Resume-where-you-left-off: shells record the current app path; the login
   flows land returning users there instead of the generic dashboard. */
const LAST_PATH_KEY = "hb_last_path";

export function rememberLastPath(path: string) {
  try {
    localStorage.setItem(LAST_PATH_KEY, path);
  } catch {
    /* storage unavailable */
  }
}

/* Only paths on the caller's side of the app count; a pro never resumes into
   /home/* and vice versa. Bare prefixes fall through to the default landing. */
export function resumePath(prefix: "/pro" | "/home"): string | null {
  try {
    const path = localStorage.getItem(LAST_PATH_KEY);
    if (path && path.startsWith(prefix + "/") && !path.includes("signup")) return path;
  } catch {
    /* storage unavailable */
  }
  return null;
}
