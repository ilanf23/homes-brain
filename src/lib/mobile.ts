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
