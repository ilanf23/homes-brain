/* PWA registration wrapper.
 *
 * The service worker is only registered on the PRODUCTION published site.
 * It is refused in dev, iframe previews, Lovable preview domains, and when
 * the URL carries `?sw=off` (kill switch). In any refused context we
 * proactively unregister any prior /sw.js so returning users recover. */

const APP_SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    /* cross-origin frame - treat as iframe */
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(APP_SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function registerPWA() {
  if (isRefusedContext()) {
    await unregisterAppSW();
    return;
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(APP_SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("[pwa] register failed", err);
  }
}
