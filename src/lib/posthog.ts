// Optional PostHog analytics layer. Fully dormant (no init, no network) unless
// VITE_POSTHOG_KEY is set. Our events table remains the source of truth; when
// enabled, we mirror events into PostHog for funnels/retention/replay.

import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

export const posthogEnabled: boolean = typeof KEY === "string" && KEY.length > 0;

let initialized = false;

export function initPosthog(): void {
  if (!posthogEnabled || initialized) return;
  if (typeof window === "undefined") return;
  try {
    posthog.init(KEY as string, {
      api_host: HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
    initialized = true;
  } catch (e) {
    console.warn("[posthog] init failed", e);
  }
}

export function phCapture(event: string, props?: Record<string, unknown>): void {
  if (!posthogEnabled || !initialized) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* swallow */
  }
}

export function phIdentify(id: string, props?: Record<string, unknown>): void {
  if (!posthogEnabled || !initialized) return;
  try {
    posthog.identify(id, props);
  } catch {
    /* swallow */
  }
}

export function phReset(): void {
  if (!posthogEnabled || !initialized) return;
  try {
    posthog.reset();
  } catch {
    /* swallow */
  }
}
