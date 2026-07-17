import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

/* Lightweight, dismissible "Add to Home Screen" hint for signed-in pros on
 * mobile. Android/Chrome uses the native beforeinstallprompt event; iOS
 * Safari has no programmatic prompt so we show a one-time tip pointing at
 * the Share icon. Dismissal is remembered in localStorage. */

const DISMISS_KEY = "hb_pwa_install_dismissed_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (window.navigator as any).standalone === true;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true || iosStandalone
  );
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!isMobile()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* storage unavailable */
    }

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBefore);

    if (isIOS()) {
      setShowIosTip(true);
      setVisible(true);
    }

    const onInstalled = () => dismiss();
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    setVisible(false);
    setDeferred(null);
    setShowIosTip(false);
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40 mx-auto max-w-md">
      <div className="rounded-2xl border border-line bg-white shadow-lg p-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigobg text-indigo">
          <Download size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">
            Add HomesBrain to your home screen
          </p>
          {showIosTip ? (
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              Tap the <Share size={12} className="inline align-[-2px]" /> Share icon, then
              "Add to Home Screen."
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              One tap to open, no browser, always where you left off.
            </p>
          )}
          {deferred && !showIosTip && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center rounded-full bg-indigo px-3.5 py-1.5 text-[13px] font-semibold text-white"
            >
              Add to home screen
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted hover:text-ink -m-1 p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
