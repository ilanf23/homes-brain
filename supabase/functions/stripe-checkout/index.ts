/* Create a Stripe Checkout Session so a homeowner can pay a pro.

   Direct charge on the pro's connected account with an application fee for
   HomesBrain. Amount is looked up SERVER-SIDE from the invoice (never
   trusted from the client). Idempotency keyed on invoice id so retries
   don't create duplicate sessions.

   verify_jwt=false to match v0 mocked sessions. We validate:
   - invoice exists and is open,
   - the pro's connected account has charges_enabled,
   - the caller (implicit) can only pay something that already exists.

   The homeowner is redirected to a hosted Stripe page; raw card data
   never touches this server.
*/

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_APP_FEE_BPS = 0; // basis points; 0% for now, configurable via env

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
  const feeBpsRaw = Deno.env.get("STRIPE_APP_FEE_BPS");
  const appFeeBps = Number.isFinite(Number(feeBpsRaw)) ? Number(feeBpsRaw) : DEFAULT_APP_FEE_BPS;
  if (!secret || !supaUrl || !supaKey) return json({ error: "server_misconfigured" }, 500);

  const stripe = new Stripe(secret, { apiVersion: "2024-11-20.acacia" });
  const db = createClient(supaUrl, supaKey);

  let body: { invoice_id?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const invoiceId = body.invoice_id;
  if (!invoiceId || typeof invoiceId !== "string") return json({ error: "missing_invoice_id" }, 400);

  const { data: inv, error: invErr } = await db
    .from("invoices")
    .select("id, pro_id, home_id, job_id, total, status, items")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invErr || !inv) return json({ error: "invoice_not_found" }, 404);
  if (inv.status !== "open") return json({ error: "invoice_not_payable", status: inv.status }, 400);

  // Server-side amount. total is stored in dollars; convert to cents.
  const amountCents = Math.round(Number(inv.total) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 50) {
    return json({ error: "invalid_amount" }, 400);
  }

  const { data: pro, error: proErr } = await db
    .from("pros")
    .select("id, business, stripe_account_id, stripe_charges_enabled")
    .eq("id", inv.pro_id)
    .maybeSingle();
  if (proErr || !pro) return json({ error: "pro_not_found" }, 404);
  if (!pro.stripe_account_id || !pro.stripe_charges_enabled) {
    return json({ error: "pro_not_ready_for_payments" }, 400);
  }

  const originRaw = body.origin ?? "https://homesbrain.com";
  const origin = /^https?:\/\//.test(originRaw) ? new URL(originRaw).origin : "https://homesbrain.com";

  const firstItem = Array.isArray(inv.items) && inv.items[0]?.description
    ? String(inv.items[0].description)
    : `Invoice from ${pro.business ?? "your pro"}`;

  const appFee = Math.floor((amountCents * appFeeBps) / 10000);

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: `${pro.business ?? "Service"} - ${firstItem}`.slice(0, 250),
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: appFee > 0 ? appFee : undefined,
          metadata: {
            invoice_id: invoiceId,
            pro_id: inv.pro_id,
            home_id: inv.home_id,
            job_id: inv.job_id ?? "",
          },
        },
        metadata: {
          invoice_id: invoiceId,
          pro_id: inv.pro_id,
          home_id: inv.home_id,
          job_id: inv.job_id ?? "",
        },
        success_url: `${origin}/home?paid=${invoiceId}`,
        cancel_url: `${origin}/home?paycancel=${invoiceId}`,
      },
      {
        stripeAccount: pro.stripe_account_id, // direct charge on connected account
        idempotencyKey: `checkout:${invoiceId}`,
      },
    );

    return json({ url: session.url, id: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stripe_error";
    return json({ error: "stripe_error", detail: msg }, 500);
  }
});
