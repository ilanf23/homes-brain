import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { haptic } from "@/lib/mobile";

const CREATE_TAPPED_KEY = "hb_create_tapped";

/* Instagram-style mobile tab bar, floated: five equal icon-only slots in a
   pill lifted off the bottom and sides so content peeks behind it
   (translucent paper + blur). Persistent (never hides on scroll) so the same
   five destinations always sit in the thumb zone. Desktop keeps the sidebar;
   this is md:hidden.

   The active slot gets a soft indigo tint pill behind an indigo icon (a
   color change animates; stroke weight alone was too quiet), and the center
   create action is a filled indigo button: it is the product's primary CTA,
   so it carries the brand accent. No labels; each slot has an aria-label
   and is a full-height fifth of the bar, well past the 48px target
   minimum. */

export type TabItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

/* The icon presses down the instant the finger lands (duration-0 on active)
   and springs back on release. The whole slot is the target; only the icon
   moves. */
const ICON_PRESS =
  "transition-transform duration-200 ease-out group-active:scale-[0.85] group-active:duration-0";

/* A swipe must not fight things that already own horizontal touch: sideways
   scrollers, the customer map (canvas), and text fields mid-edit. */
function swipeBlocked(start: EventTarget | null): boolean {
  for (
    let node = start instanceof Element ? start : null;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (node.matches("input, textarea, select, canvas, [data-noswipe]")) return true;
    const style = getComputedStyle(node);
    if (
      (style.overflowX === "auto" || style.overflowX === "scroll") &&
      node.scrollWidth > node.clientWidth + 8
    )
      return true;
  }
  return false;
}

export function BottomTabBar({
  items,
  activeKey,
  create,
  createActive = false,
  swipeEnabled = true,
}: {
  /* Exactly four: two left of the create button, two right. */
  items: [TabItem, TabItem, TabItem, TabItem];
  activeKey: string;
  create: { to: string; label: string };
  /* True on the create flow itself so the + reads as the current place. */
  createActive?: boolean;
  /* Off on form pages (log a job, add to home): an accidental swipe there
     would throw away typed work. */
  swipeEnabled?: boolean;
}) {
  const navigate = useNavigate();
  /* One-time "start here" pulse for a brand-new user; dies forever on the
     first tap of the + on this device. */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(CREATE_TAPPED_KEY)) setPulse(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  /* Refs so the document listeners bind once, not on every render. */
  const state = useRef({ items, activeKey, swipeEnabled });
  state.current = { items, activeKey, swipeEnabled };

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let fromEdge = false;

    const onTouchStart = (e: TouchEvent) => {
      tracking = false;
      /* Bar (and swipe) are mobile-only; the md breakpoint hides them. */
      if (e.touches.length !== 1 || window.matchMedia("(min-width: 768px)").matches) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      /* A touch born on the left edge is a back gesture, not a tab swipe. */
      fromEdge = startX <= 24;
      if (!fromEdge && (!state.current.swipeEnabled || swipeBlocked(e.target))) return;
      tracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      /* Deliberate horizontal swipe only: long enough, and clearly not a scroll. */
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (fromEdge) {
        if (dx > 0 && window.history.length > 1) {
          haptic();
          window.history.back();
        }
        return;
      }
      const { items: tabs, activeKey: current } = state.current;
      const index = tabs.findIndex((tab) => tab.key === current);
      if (index < 0) return;
      const next = tabs[index + (dx < 0 ? 1 : -1)];
      if (!next) return;
      /* Direction attribute drives the view-transition slide in styles.css. */
      document.documentElement.dataset.swipeDir = dx < 0 ? "left" : "right";
      window.setTimeout(() => {
        delete document.documentElement.dataset.swipeDir;
      }, 450);
      navigate({ to: next.to, viewTransition: true });
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);

  const renderTab = ({ key, label, to, icon: Icon }: TabItem) => {
    const isActive = activeKey === key;
    return (
      <Link
        key={key}
        to={to}
        preload="intent"
        onClick={() => haptic()}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`group flex h-full items-center justify-center ${
          isActive ? "text-indigo" : "text-muted"
        }`}
      >
        {/* The tint pill is always in the layout so activation animates as a
            color fade instead of popping in. */}
        <span
          className={`${ICON_PRESS} flex h-9 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
            isActive ? "bg-indigobg" : "bg-transparent"
          }`}
        >
          <Icon size={24} strokeWidth={isActive ? 2.4 : 1.9} />
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={create.label}
      className="md:hidden fixed inset-x-4 z-50 select-none touch-manipulation rounded-full border border-line bg-paper/90 backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(22,22,15,0.3)]"
      style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      <div className="grid h-[56px] grid-cols-5 items-stretch">
        {renderTab(items[0])}
        {renderTab(items[1])}
        <Link
          to={create.to}
          preload="intent"
          onClick={() => {
            haptic();
            if (pulse) {
              setPulse(false);
              try {
                localStorage.setItem(CREATE_TAPPED_KEY, "1");
              } catch {
                /* storage unavailable */
              }
            }
          }}
          aria-label={create.label}
          aria-current={createActive ? "page" : undefined}
          className="group relative flex h-full items-center justify-center"
        >
          {pulse && (
            <span
              className="absolute h-10 w-10 rounded-full bg-indigo/35 animate-ping motion-reduce:hidden"
              aria-hidden="true"
            />
          )}
          <span
            className={`${ICON_PRESS} relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo text-(--on-accent) shadow-[0_8px_18px_-8px_rgba(71,63,176,0.7)] ${
              createActive ? "ring-2 ring-indigo/30" : ""
            }`}
          >
            <Plus size={22} strokeWidth={2.6} />
          </span>
        </Link>
        {renderTab(items[2])}
        {renderTab(items[3])}
      </div>
    </nav>
  );
}

/* Bottom padding for page content rendered above the bar: 56px bar + 10px
   float gap + breathing room + safe-area. Apply on <main> alongside md:pb-*
   for desktop. */
export const TAB_BAR_CONTENT_PAD = "pb-[calc(92px+env(safe-area-inset-bottom))]";
