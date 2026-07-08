/* Stripe webhook: records payments after Stripe confirms them.

   verify_jwt=false because Stripe cannot send a Supabase JWT. Instead we
   verify Stripe's own signature (Stripe-Signature header) against the raw
   request body using the webhook secret. Requests that fail signature
   verification are rejected with 400 before we touch the DB.

   The connected-account event stream flows through the SAME platform
   webhook when we're using Stripe Connect direct charges (the event's
   `account` field tells us which connected account fired it).

   Writes: inserts a `payments` row on payment_intent.succeeded, marks the
   linked invoice paid. Runs with service role because RLS on `payments`
   grants no write access to any user (that's the point).
*/

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !webhookSecret || !supaUrl || !supaKey) {
    return new Response("server_misconfigured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing_signature", { status: 400 });

  const rawBody = await req.text();

  const stripe = new Stripe(secret, { apiVersion: "2024-11-20.acacia" });
  let event: Stripe.Event;
  try {
    // constructEventAsync uses SubtleCrypto (Deno-friendly, no Node crypto).
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`signature_verification_failed: ${msg}`, { status: 400 });
  }

  const db = createClient(supaUrl, supaKey);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const md = pi.metadata ?? {};
        const invoiceId = md.invoice_id;
        const proId = md.pro_id;
        const homeId = md.home_id;
        const jobId = md.job_id || null;
        const accountId = event.account ?? null;
        if (!invoiceId || !proId || !homeId || !accountId) {
          // Not one of our platform payments - ignore.
          break;
        }
        const { error: insErr } = await db.from("payments").upsert(
          {
            pro_id: proId,
            home_id: homeId,
            invoice_id: invoiceId,
            job_id: jobId,
            amount: pi.amount_received ?? pi.amount,
            application_fee_amount: pi.application_fee_amount ?? 0,
            currency: pi.currency,
            stripe_payment_intent_id: pi.id,
            stripe_account_id: accountId,
            status: "succeeded",
          },
          { onConflict: "stripe_payment_intent_id" },
        );
        if (insErr) throw insErr;

        await db
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", invoiceId)
          .eq("status", "open");
        break;
      }
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const md = s.metadata ?? {};
        const invoiceId = md.invoice_id;
        const accountId = event.account ?? null;
        if (!invoiceId || !accountId) break;
        // Best-effort: session id linkage; the PI event carries the real amount.
        await db
          .from("payments")
          .update({ stripe_checkout_session_id: s.id })
          .eq("invoice_id", invoiceId)
          .eq("stripe_account_id", accountId);
        break;
      }
      case "account.updated": {
        const a = event.data.object as Stripe.Account;
        await db
          .from("pros")
          .update({
            stripe_charges_enabled: !!a.charges_enabled,
            stripe_payouts_enabled: !!a.payouts_enabled,
            stripe_details_submitted: !!a.details_submitted,
          })
          .eq("stripe_account_id", a.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const md = pi.metadata ?? {};
        const invoiceId = md.invoice_id;
        const accountId = event.account ?? null;
        if (!invoiceId || !accountId) break;
        await db
          .from("payments")
          .upsert(
            {
              pro_id: md.pro_id!,
              home_id: md.home_id!,
              invoice_id: invoiceId,
              job_id: md.job_id || null,
              amount: pi.amount,
              application_fee_amount: pi.application_fee_amount ?? 0,
              currency: pi.currency,
              stripe_payment_intent_id: pi.id,
              stripe_account_id: accountId,
              status: "failed",
            },
            { onConflict: "stripe_payment_intent_id" },
          );
        break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 500 tells Stripe to retry; safer than swallowing.
    return new Response(`handler_error: ${msg}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
