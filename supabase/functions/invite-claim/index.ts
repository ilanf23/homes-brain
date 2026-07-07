/* Claim invite email: a pro emails a homeowner in their CRM an invite to claim
   their home record. Everything is enforced server-side: the pro is resolved
   from the JWT, ownership is checked, the 7 day cooldown is checked, and the
   email goes out through Resend. Ships in the repo; Lovable deploys on git
   sync. Requires the RESEND_API_KEY secret; until it exists the function
   answers { ok: false, code: "not_configured" }. verify_jwt stays on (the
   default), so only signed-in users reach this code at all. */

import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_MS = 7 * 24 * 3600 * 1000;
const DAILY_LIMIT = 50;
const FALLBACK_ORIGIN = "https://homesbrain.com";
// Wildcard Lovable patterns would let a lookalike Lovable app receive
// genuine DKIM-signed claim links, so the allowlist stays narrow: local
// dev and the real domain only. Preview environments fall back to
// https://homesbrain.com.
const ALLOWED_ORIGINS = [/^http:\/\/localhost(:\d+)?$/, /^https:\/\/(www\.)?homesbrain\.com$/];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function claimOrigin(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_ORIGIN;
  return ALLOWED_ORIGINS.some((re) => re.test(raw)) ? raw : FALLBACK_ORIGIN;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailText(business: string, address: string, url: string) {
  return [
    `${business} keeps a service record for ${address} on HomesBrain.`,
    "",
    "Every job they log builds a verified history for your home: what was done, when, and what's due next. Claim it free and it's yours for life.",
    "",
    `Claim your home record: ${url}`,
    "",
    `You're receiving this because ${business} logged a service visit at ${address}.`,
  ].join("\n");
}

function emailHtml(business: string, address: string, url: string) {
  const b = esc(business);
  const a = esc(address);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#473fb0;">HomesBrain</div>
      <div style="margin-top:16px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">${b} started a home record for ${a}</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#73706a;">Every job they log builds a verified history for your home: what was done, when, and what's due next. Claim it free and it's yours for life.</p>
        <div style="margin-top:22px;">
          <a href="${url}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Claim your home record</a>
        </div>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because ${b} logged a service visit at ${a}.</p>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customer_id, pro_id, origin } = await req.json();
    if (typeof customer_id !== "string" || !customer_id) {
      return json({ ok: false, code: "bad_request" }, 400);
    }
    if (typeof pro_id !== "string" || !pro_id) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pro, error: proErr } = await admin
      .from("pros")
      .select("id,business")
      .eq("id", pro_id)
      .maybeSingle();
    if (!pro) {
      console.error("invite-claim pro lookup failed", { pro_id, proErr });
      return json({ ok: false, code: "forbidden", stage: "pro" }, 403);
    }

    const { data: customer, error: custErr } = await admin
      .from("customers")
      .select("id,pro_id,home_id,email,claim_invited_at,homes(address,claimed_at)")
      .eq("id", customer_id)
      .maybeSingle();
    if (!customer || customer.pro_id !== pro.id) {
      console.error("invite-claim customer check failed", { customer_id, hasCustomer: !!customer, custPro: customer?.pro_id, pro: pro.id, custErr });
      return json({ ok: false, code: "forbidden", stage: "customer" }, 403);
    }

    const home = Array.isArray(customer.homes) ? customer.homes[0] : customer.homes;
    if (!customer.email) return json({ ok: false, code: "no_email" });
    if (home?.claimed_at) return json({ ok: false, code: "already_claimed" });
    if (
      customer.claim_invited_at &&
      Date.now() - new Date(customer.claim_invited_at).getTime() < COOLDOWN_MS
    ) {
      return json({ ok: false, code: "cooldown", invited_at: customer.claim_invited_at });
    }

    // Volume cap: a pro controls customer emails, so without a cap a hostile
    // account could burn the sending domain's reputation. Counted on
    // claim_invited_at, which only this function writes.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("pro_id", pro.id)
      .gt("claim_invited_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) return json({ ok: false, code: "daily_limit" });

    const { data: jobRows } = await admin
      .from("jobs")
      .select("id,created_at,records(id)")
      .eq("home_id", customer.home_id)
      .eq("pro_id", pro.id)
      .order("created_at", { ascending: false });
    const record = (jobRows ?? []).flatMap((j) => j.records ?? [])[0];
    if (!record) return json({ ok: false, code: "no_record" });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const claimUrl = `${claimOrigin(origin)}/claim/${record.id}`;
    const address = home?.address ?? "your home";
    const text = emailText(pro.business, address, claimUrl);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [customer.email],
        subject: `${pro.business} started a home record for ${address}`,
        html: emailHtml(pro.business, address, claimUrl),
        text,
      }),
    });
    if (!resp.ok) {
      console.error("resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const invited_at = new Date().toISOString();
    const { error: stampError } = await admin
      .from("customers")
      .update({ claim_invited_at: invited_at })
      .eq("id", customer.id);
    const { error: messageError } = await admin.from("messages").insert({
      channel: "email",
      to_contact: customer.email,
      body: text,
      kind: "invite",
    });
    if (stampError || messageError) {
      console.error("invite-claim post-send write failed", stampError ?? messageError);
    }

    return json({ ok: true, invited_at });
  } catch (e) {
    console.error("invite-claim error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
