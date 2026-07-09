/* Per-record homeowner notification. Every new job triggers one email
   telling the homeowner a new service record was added to their home.

   The CTA in the email is now a branded homesbrain.com/claim/:token
   link. That token is minted here (single-use, hashed at rest, 7-day
   TTL) and consumed by the /claim/:token page + claim-exchange edge
   function. No supabase.co URL is exposed to the homeowner.

   verify_jwt stays off (see supabase/config.toml) because the browser
   session is still mocked in v0; server-side we resolve the pro from
   the pro_id in the body and check that the customer belongs to them. */

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
const EMAIL_TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

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

function base64url(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isHttpsUrl(v: unknown): v is string {
  return typeof v === "string" && /^https:\/\//i.test(v);
}

type EquipmentPreview = {
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
};

function equipmentLine(eq: EquipmentPreview | null): string | null {
  if (!eq) return null;
  const parts = [eq.type, eq.make, eq.model].filter((x): x is string => !!x && !!x.trim());
  if (!parts.length) return null;
  return parts.join(" ");
}

function recordEmail(opts: {
  business: string;
  logo: string | null;
  address: string;
  whatDone: string | null;
  equipment: EquipmentPreview | null;
  ctaUrl: string;
  claimed: boolean;
}) {
  const { business, logo, address, whatDone, equipment, ctaUrl, claimed } = opts;
  const cta = claimed ? "Open my home" : "Claim your home record";
  const eqLine = equipmentLine(equipment);
  const warranty = equipment?.warranty_until ? `Warranty through ${equipment.warranty_until}` : null;
  const textLines = [
    `${business} added a new service record to your home at ${address}.`,
    "",
    "Record",
    `Address: ${address}`,
  ];
  if (whatDone?.trim()) textLines.push(`Work: ${whatDone.trim()}`);
  if (eqLine) textLines.push(`Equipment: ${eqLine}`);
  if (warranty) textLines.push(warranty);
  textLines.push("", `${cta}: ${ctaUrl}`, "", "Every visit builds your home's living record. Free for life.", "", "via HomesBrain");

  const b = esc(business);
  const a = esc(address);
  const w = whatDone?.trim() ? esc(whatDone.trim()) : "";
  const eqEsc = eqLine ? esc(eqLine) : "";
  const warrantyEsc = warranty ? esc(warranty) : "";

  const header = logo && isHttpsUrl(logo)
    ? `<img src="${esc(logo)}" alt="${b}" style="max-height:44px;max-width:220px;display:block;" />`
    : `<div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">${b}</div>`;

  const previewRows = [
    `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;width:110px;">Address</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${a}</td></tr>`,
    w
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">Work done</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${w}</td></tr>`
      : "",
    eqEsc
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">Equipment</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${eqEsc}</td></tr>`
      : "",
    warrantyEsc
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">Warranty</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${warrantyEsc}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:12px;">${header}</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">via HomesBrain</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">New service record from ${b}</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#73706a;">${b} added a new record to your home. It's saved to your address for life. Free.</p>
      <table role="presentation" style="width:100%;margin-top:18px;border-collapse:collapse;border-top:1px solid #e7e5de;">${previewRows}</table>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">${cta}</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">One tap opens your record and signs you in. This link only works from your inbox.</p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because ${b} services your home at ${a}. HomesBrain hosts the record on their behalf.</p>
  </div>
</body></html>`;
  return {
    subject: `New service record from ${business}`,
    text: textLines.join("\n"),
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
      .select("id,business,logo")
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
      .select("id,created_at,what_done,equipment_id,records(id,created_at)")
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

    // Equipment preview for the email body.
    let equipment: EquipmentPreview | null = null;
    if (latestJob?.equipment_id) {
      const { data: eq } = await admin
        .from("equipment")
        .select("type,make,model,warranty_until")
        .eq("id", latestJob.equipment_id)
        .maybeSingle();
      if (eq) equipment = eq;
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = claimOrigin(origin);
    const address = home?.address ?? "your home";
    const claimed = !!home?.claimed_at;

    // Mint a branded, single-use, hashed, expiring claim token when the
    // home is unclaimed and we have a record to point at. Otherwise fall
    // back to a plain /home link.
    let ctaUrl = `${originUrl}/home`;
    if (!claimed && claimRecordId) {
      const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await sha256Hex(raw);
      const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
      const { error: tokErr } = await admin.from("claim_tokens").insert({
        token_hash: tokenHash,
        record_id: claimRecordId,
        home_id: customer.home_id,
        pro_id: pro.id,
        email: customer.email,
        expires_at: expiresAt,
      });
      if (tokErr) {
        console.error("invite-claim token insert failed", tokErr);
      } else {
        ctaUrl = `${originUrl}/claim/${raw}`;
      }
    }

    const email = recordEmail({
      business: pro.business,
      logo: pro.logo ?? null,
      address,
      whatDone: latestJob?.what_done ?? null,
      equipment,
      ctaUrl,
      claimed,
    });

    // Display name is the pro; sending address stays on the verified
    // homesbrain.com domain so deliverability doesn't crater.
    const fromDisplay = `${pro.business.replace(/[<>]/g, "")} via HomesBrain`;
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromDisplay} <invites@homesbrain.com>`,
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
