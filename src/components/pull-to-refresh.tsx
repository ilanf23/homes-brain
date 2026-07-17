import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/mobile";

const TRIGGER = 70;

/* Instagram-style pull-to-refresh, mobile only. Drag down from the very top:
   an indicator follows the finger, arms at 70px (haptic tick), and a release
   past that reloads the page; SSR + cache make that fast enough to feel like
   a refetch. Render once inside a shell. */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    let startY = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      active =
        e.touches.length === 1 &&
        window.scrollY <= 0 &&
        !window.matchMedia("(min-width: 768px)").matches;
      startY = active ? e.touches[0].clientY : 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) {
        setPull(0);
        armed.current = false;
        return;
      }
      /* Finger resistance: the indicator moves at half finger speed, capped. */
      const next = Math.min(dy * 0.5, TRIGGER + 30);
      setPull(next);
      if (next >= TRIGGER && !armed.current) {
        armed.current = true;
        haptic();
      }
      if (next < TRIGGER) armed.current = false;
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;
      if (armed.current) {
        armed.current = false;
        setRefreshing(true);
        haptic([8, 40, 8]);
        window.location.reload();
      } else {
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const visible = pull > 4 || refreshing;
  return (
    <div
      aria-hidden={!refreshing}
      role={refreshing ? "status" : undefined}
      className="md:hidden fixed inset-x-0 top-0 z-[60] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${refreshing ? 24 : pull - 40}px)`,
        transition: pull === 0 || refreshing ? "transform 200ms ease-out" : "none",
      }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-indigo shadow-[0_8px_20px_-8px_rgba(22,22,15,0.35)]"
        style={{ opacity: refreshing ? 1 : Math.min(pull / TRIGGER, 1) }}
      >
        <RefreshCw
          size={17}
          className={refreshing ? "animate-spin" : ""}
          style={refreshing ? undefined : { transform: `rotate(${(pull / TRIGGER) * 270}deg)` }}
        />
      </span>
    </div>
  );
}
