/* Stripe Connect onboarding for pros.

   Two actions:
   - "onboard"  → create Express account if the pro has none, then return an
                  Account Link URL to Stripe's hosted onboarding.
   - "refresh"  → after onboarding return, re-fetch charges/payouts flags and
                  persist them to pros so the UI can show "Payments on".

   verify_jwt=false to match the app's mocked v0 sessions. We validate by
   requiring pro_id in the body and reading the pros row with the service
   role. Every action is scoped to the caller's own account. The Stripe
   secret key is only read here (edge-function env), never client-side.
*/

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supaUrl || !supaKey) return json({ error: "server_misconfigured" }, 500);

  const stripe = new Stripe(secret, { apiVersion: "2024-11-20.acacia" });
  const db = createClient(supaUrl, supaKey);

  let body: { action?: string; pro_id?: string; return_url?: string; refresh_url?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const proId = body.pro_id;
  if (!proId || typeof proId !== "string") return json({ error: "missing_pro_id" }, 400);

  const { data: pro, error: proErr } = await db
    .from("pros")
    .select("id, business, email, stripe_account_id")
    .eq("id", proId)
    .maybeSingle();
  if (proErr || !pro) return json({ error: "pro_not_found" }, 404);

  const action = body.action ?? "onboard";

  try {
    if (action === "onboard") {
      let accountId = pro.stripe_account_id as string | null;
      if (!accountId) {
        // Create the Express connected account. Country is US in v0.
        const account = await stripe.accounts.create({
          type: "express",
          email: pro.email ?? undefined,
          business_type: "company",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { pro_id: proId, business: pro.business ?? "" },
        });
        accountId = account.id;
        const { error: updErr } = await db
          .from("pros")
          .update({ stripe_account_id: accountId })
          .eq("id", proId);
        if (updErr) return json({ error: "db_update_failed" }, 500);
      }

      const origin = body.return_url || body.refresh_url || "https://homesbrain.com";
      const base = new URL(origin);
      const returnUrl = `${base.origin}/pro/settings?stripe=return`;
      const refreshUrl = `${base.origin}/pro/settings?stripe=refresh`;

      const link = await stripe.accountLinks.create({
        account: accountId,
        return_url: returnUrl,
        refresh_url: refreshUrl,
        type: "account_onboarding",
      });

      return json({ url: link.url, account_id: accountId });
    }

    if (action === "refresh") {
      if (!pro.stripe_account_id) return json({ error: "no_account" }, 400);
      const account = await stripe.accounts.retrieve(pro.stripe_account_id);
      const patch = {
        stripe_charges_enabled: !!account.charges_enabled,
        stripe_payouts_enabled: !!account.payouts_enabled,
        stripe_details_submitted: !!account.details_submitted,
      };
      const { error: updErr } = await db.from("pros").update(patch).eq("id", proId);
      if (updErr) return json({ error: "db_update_failed" }, 500);
      return json({ ...patch, account_id: pro.stripe_account_id });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stripe_error";
    console.error("stripe-connect error:", msg);
    return json({ error: "stripe_error", detail: msg }, 500);
  }
});
