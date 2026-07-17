import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/mobile";

/* Instagram-style bottom sheet: slides up from the bottom edge, follows the
   finger while dragging the handle or header, and a flick (or a drag past a
   third of its height) dismisses it. Mobile chrome; on desktop callers should
   keep their dropdown/dialog patterns. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const touch = useRef({ startY: 0, lastY: 0, lastT: 0, velocity: 0, dragging: false });

  /* Lock the page under the sheet. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setDragY(0);
      setClosing(false);
    }
  }, [open]);

  if (!open) return null;

  function requestClose() {
    setClosing(true);
    haptic(6);
    window.setTimeout(onClose, 180);
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      lastT: e.timeStamp,
      velocity: 0,
      dragging: true,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current.dragging) return;
    const y = e.touches[0].clientY;
    const dt = Math.max(1, e.timeStamp - touch.current.lastT);
    touch.current.velocity = (y - touch.current.lastY) / dt;
    touch.current.lastY = y;
    touch.current.lastT = e.timeStamp;
    setDragY(Math.max(0, y - touch.current.startY));
  };
  const onTouchEnd = () => {
    if (!touch.current.dragging) return;
    touch.current.dragging = false;
    const height = panelRef.current?.offsetHeight ?? 320;
    if (dragY > height / 3 || touch.current.velocity > 0.55) {
      requestClose();
    } else {
      setDragY(0);
    }
  };

  /* Portal to <body>: the sheet is often opened from inside the sticky header,
     whose backdrop-filter/transform would otherwise capture position:fixed. */
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm ${closing ? "anim-fade-out" : "anim-fade-in"}`}
      />
      <div
        ref={panelRef}
        className={`absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-paper shadow-[0_-24px_60px_-24px_rgba(22,22,15,0.35)] ${
          closing ? "" : dragY === 0 ? "anim-sheet-up" : ""
        }`}
        style={{
          transform: `translateY(${closing ? "100%" : `${dragY}px`})`,
          transition: touch.current.dragging ? "none" : "transform 180ms ease-out",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Grab zone: handle + header both drag. */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="cursor-grab select-none"
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <span className="h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          </div>
          {title && (
            <div className="px-5 py-2 text-sm font-bold text-ink border-b border-line">{title}</div>
          )}
        </div>
        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
