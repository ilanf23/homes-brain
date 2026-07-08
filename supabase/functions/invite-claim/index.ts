/* Per-record homeowner notification. Fires on every new job:
   - If the home has not been claimed yet: send the "claim your home record"
     invite (magic-link style entry point at /claim/:id).
   - If the home is already claimed: send a lighter "new record added" notice
     that links straight to the record at /r/:id (and to their dashboard).

   No cooldown, no once-per-customer gate. Volume is bounded by a per-pro
   daily cap so a hostile account cannot torch the sending domain.

   verify_jwt stays off (see supabase/config.toml) because the browser
   session is still mocked in v0; server-side we resolve the pro from the
   pro_id in the body and check that the customer belongs to them. */

import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 200; // per-pro sends in a rolling 24h window
const FALLBACK_ORIGIN = "https://homesbrain.com";
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

/* Pre-claim: invite the homeowner to claim the home. */
function claimEmail(business: string, address: string, url: string) {
  const text = [
    `${business} just logged a service visit at ${address} and started your HomesBrain home record.`,
    "",
    "Every job they log builds a verified history for your home: what was done, when, and what's due next. Claim it free and it's yours for life.",
    "",
    `Claim your home record: ${url}`,
    "",
    `You're receiving this because ${business} logged a service visit at ${address}.`,
  ].join("\n");
  const b = esc(business);
  const a = esc(address);
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
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
</body></html>`;
  return {
    subject: `${business} started a home record for ${address}`,
    text,
    html,
  };
}

/* Post-claim: notify that a new record has been added. */
function newRecordEmail(
  business: string,
  address: string,
  what: string | null,
  recordUrl: string,
  dashboardUrl: string,
) {
  const summary = what?.trim() ? `: ${what.trim()}` : "";
  const text = [
    `${business} added a new service record to your home at ${address}${summary}.`,
    "",
    `View the record: ${recordUrl}`,
    `Your home dashboard: ${dashboardUrl}`,
    "",
    "Every visit builds your home's living record.",
  ].join("\n");
  const b = esc(business);
  const a = esc(address);
  const s = esc(summary);
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#473fb0;">HomesBrain</div>
    <div style="margin-top:16px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">New service record added</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#73706a;">${b} added a new record to your home at ${a}${s}.</p>
      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${recordUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 22px;">View the record</a>
        <a href="${dashboardUrl}" style="display:inline-block;background:#ffffff;border:1px solid #e7e5de;color:#16160f;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:11px 22px;">Open my home</a>
      </div>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because ${b} services your home at ${a}.</p>
  </div>
</body></html>`;
  return {
    subject: `New service record from ${business}`,
    text,
    html,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customer_id, pro_id, origin, record_id } = await req.json();
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
      console.error("invite-claim customer check failed", {
        customer_id,
        hasCustomer: !!customer,
        custPro: customer?.pro_id,
        pro: pro.id,
        custErr,
      });
      return json({ ok: false, code: "forbidden", stage: "customer" }, 403);
    }

    const home = Array.isArray(customer.homes) ? customer.homes[0] : customer.homes;
    if (!customer.email) return json({ ok: false, code: "no_email" });

    // Per-pro daily cap protects the sending domain reputation.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "record")
      .eq("channel", "email")
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) return json({ ok: false, code: "daily_limit" });

    // Resolve the record: prefer the one the caller sent, otherwise latest for this home+pro.
    let record: { id: string; jobs?: { what_done: string | null } | { what_done: string | null }[] } | null = null;
    if (typeof record_id === "string" && record_id) {
      const { data: r } = await admin
        .from("records")
        .select("id,jobs!inner(what_done,home_id,pro_id)")
        .eq("id", record_id)
        .maybeSingle();
      const j = r ? (Array.isArray(r.jobs) ? r.jobs[0] : r.jobs) : null;
      if (r && j && j.home_id === customer.home_id && j.pro_id === pro.id) {
        record = { id: r.id as string, jobs: { what_done: j.what_done ?? null } };
      }
    }
    if (!record) {
      const { data: jobRows } = await admin
        .from("jobs")
        .select("id,created_at,what_done,records(id)")
        .eq("home_id", customer.home_id)
        .eq("pro_id", pro.id)
        .order("created_at", { ascending: false });
      const latestJob = (jobRows ?? []).find((j) => (j.records ?? []).length > 0);
      const rec = latestJob?.records?.[0];
      if (!rec) return json({ ok: false, code: "no_record" });
      record = { id: rec.id, jobs: { what_done: latestJob?.what_done ?? null } };
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = claimOrigin(origin);
    const address = home?.address ?? "your home";
    const claimed = !!home?.claimed_at;

    const email = claimed
      ? newRecordEmail(
          pro.business,
          address,
          Array.isArray(record.jobs) ? record.jobs[0]?.what_done ?? null : record.jobs?.what_done ?? null,
          `${originUrl}/r/${record.id}`,
          `${originUrl}/home`,
        )
      : claimEmail(pro.business, address, `${originUrl}/claim/${record.id}`);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [customer.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!resp.ok) {
      console.error("resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const now = new Date().toISOString();
    // Stamp the first invite so the CRM shows "invited". Later notifications
    // don't move the stamp; they're not claim invites.
    if (!claimed && !customer.claim_invited_at) {
      const { error: stampError } = await admin
        .from("customers")
        .update({ claim_invited_at: now })
        .eq("id", customer.id);
      if (stampError) console.error("invite-claim stamp failed", stampError);
    }
    const { error: messageError } = await admin.from("messages").insert({
      channel: "email",
      to_contact: customer.email,
      body: email.text,
      kind: claimed ? "record_notice" : "invite",
    });
    if (messageError) console.error("invite-claim message log failed", messageError);

    return json({ ok: true, kind: claimed ? "notice" : "invite", sent_at: now });
  } catch (e) {
    console.error("invite-claim error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
