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

export async function startStripeOnboarding(proId: string): Promise<OnboardResult> {
  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { action: "onboard", pro_id: proId, return_url: originForRedirect() },
  });
  if (error || !data?.url) throw new Error(data?.error ?? error?.message ?? "onboard_failed");
  return data as OnboardResult;
}

export async function refreshStripeStatus(proId: string): Promise<RefreshResult> {
  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { action: "refresh", pro_id: proId },
  });
  if (error || !data?.account_id) throw new Error(data?.error ?? error?.message ?? "refresh_failed");
  return data as RefreshResult;
}

export async function startInvoiceCheckout(invoiceId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { invoice_id: invoiceId, origin: originForRedirect() },
  });
  if (error || !data?.url) throw new Error(data?.error ?? error?.message ?? "checkout_failed");
  return data as { url: string };
}
