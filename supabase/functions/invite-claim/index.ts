/* Per-record homeowner notification. Every new job triggers one email
   telling the homeowner a new service record was added to their home.
   The CTA is a real Supabase magic link that signs them in with one tap
   and drops them at /auth/callback?claim=<recordId>, which claims the
   home for their account and lands them on /home. Falls back to a plain
   /home link if magic-link generation fails so the email still ships.

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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function recordEmail(
  business: string,
  address: string,
  what: string | null,
  ctaUrl: string,
  claimed: boolean,
) {
  const summary = what?.trim() ? `: ${what.trim()}` : "";
  const cta = claimed ? "Open my home" : "See it in HomesBrain";
  const text = [
    `${business} added a new service record to your home at ${address}${summary}.`,
    "",
    `${cta}: ${ctaUrl}`,
    "",
    "Every visit builds your home's living record. Free for life.",
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
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#73706a;">${b} added a new record to your home at ${a}${s}. Every visit builds your home's living record. Free for life.</p>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">${cta}</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">One tap signs you in. This link only works from your inbox.</p>
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
      .eq("kind", "record_notice")
      .eq("channel", "email")
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) return json({ ok: false, code: "daily_limit" });

    // Latest job for this home + pro gives us the "what was done" summary
    // and (via records) the record id we hand to /auth/callback for claim.
    const { data: jobRows } = await admin
      .from("jobs")
      .select("id,created_at,what_done,records(id,created_at)")
      .eq("home_id", customer.home_id)
      .eq("pro_id", pro.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestJob = jobRows?.[0] ?? null;
    const jobRecords = (latestJob?.records ?? []) as { id: string; created_at: string }[];
    const latestRecordId = jobRecords
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]?.id ?? null;

    // Trust an explicit record_id only when it actually belongs to a job by
    // this pro on this customer's home.
    let claimRecordId: string | null = null;
    if (typeof record_id === "string" && record_id) {
      const { data: verify } = await admin
        .from("records")
        .select("id,jobs!inner(pro_id,home_id)")
        .eq("id", record_id)
        .maybeSingle();
      const jrec = verify as unknown as { jobs?: { pro_id: string; home_id: string } } | null;
      if (jrec?.jobs?.pro_id === pro.id && jrec.jobs.home_id === customer.home_id) {
        claimRecordId = record_id;
      }
    }
    if (!claimRecordId) claimRecordId = latestRecordId;

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = claimOrigin(origin);
    const address = home?.address ?? "your home";
    const claimed = !!home?.claimed_at;

    // Prefer a real Supabase magic link for one-tap sign-in. generateLink
    // auto-creates the auth user for new emails and works for returning
    // users too. The link opens /auth/callback which auto-claims the home
    // (when we have a valid record id). Fall back to plain /home so the
    // email still ships if magic-link generation errors.
    const redirectTo = claimRecordId
      ? `${originUrl}/auth/callback?claim=${claimRecordId}`
      : `${originUrl}/auth/callback`;
    let ctaUrl = `${originUrl}/home`;
    if (!claimed) {
      try {
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: customer.email,
          options: { redirectTo },
        });
        if (linkErr) {
          console.error("invite-claim generateLink error", linkErr);
        } else {
          const action = linkData?.properties?.action_link;
          if (typeof action === "string" && action) ctaUrl = action;
        }
      } catch (e) {
        console.error("invite-claim generateLink threw", e);
      }
    }

    const email = recordEmail(
      pro.business,
      address,
      latestJob?.what_done ?? null,
      ctaUrl,
      claimed,
    );

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
    if (!customer.claim_invited_at) {
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
      kind: "record_notice",
    });
    if (messageError) console.error("invite-claim message log failed", messageError);

    return json({ ok: true, sent_at: now });
  } catch (e) {
    console.error("invite-claim error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
