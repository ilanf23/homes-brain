/* Thin client for the Stripe edge functions. No Stripe.js on the client:
   we use hosted Stripe Checkout, so cards never touch our code. */

import { supabase } from "@/integrations/supabase/client";

export type OnboardResult = { url: string; account_id: string };
export type RefreshResult = {
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  account_id: string;
};

const originForRedirect = () =>
  typeof window === "undefined" ? "https://homesbrain.com" : window.location.origin;

/* supabase.functions.invoke exposes non-2xx bodies via error.context (a
   Response). Pull the real {error, detail} so the UI can show something
   diagnosable instead of "Failed to send a request". */
async function extractError(
  err: unknown,
  data: { error?: string; detail?: string } | null,
  fallback: string,
): Promise<string> {
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (err && typeof err === "object" && "context" in err) {
    const ctx = (err as { context?: Response }).context;
    if (ctx && typeof ctx === "object" && "json" in ctx) {
      try {
        const body = await ctx.clone().json();
        if (body?.detail) return String(body.detail);
        if (body?.error) return String(body.error);
      } catch {
        try {
          const txt = await ctx.clone().text();
          if (txt) return `${ctx.status ?? ""} ${txt}`.trim();
        } catch {
          // ignore
        }
      }
      if (typeof ctx.status === "number") return `HTTP ${ctx.status}`;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function startStripeOnboarding(proId: string): Promise<OnboardResult> {
  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { action: "onboard", pro_id: proId, return_url: originForRedirect() },
  });
  if (error || !data?.url) {
    throw new Error(await extractError(error, data, "onboard_failed"));
  }
  return data as OnboardResult;
}

export async function refreshStripeStatus(proId: string): Promise<RefreshResult> {
  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { action: "refresh", pro_id: proId },
  });
  if (error || !data?.account_id) {
    throw new Error(await extractError(error, data, "refresh_failed"));
  }
  return data as RefreshResult;
}

export async function startInvoiceCheckout(invoiceId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { invoice_id: invoiceId, origin: originForRedirect() },
  });
  if (error || !data?.url) {
    throw new Error(await extractError(error, data, "checkout_failed"));
  }
  return data as { url: string };
}
