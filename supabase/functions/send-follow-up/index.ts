/* Pro-triggered follow-up reminder email to a homeowner.
 *
 * The pro dashboard's "What's Next" list uses this when the pro taps
 * "Send reminder" on a dated follow-up. Emails from the verified
 * homesbrain.com domain in the pro's voice, links back to the
 * homeowner's record via the standard branded /claim/:token flow.
 *
 * Authorization: authenticated pro (session bearer in Authorization).
 * Body: { job_id: string, origin?: string }
 */

import {
  buildUnsubUrl,
  complianceFooterText,
  getUnsubToken,
  isEmailOptedOut,
  listUnsubscribeHeaders,
} from "../_shared/email-compliance.ts";
import {
  renderBody,
  renderCta,
  renderEmailShell,
  renderFinePrint,
  renderH1,
} from "../_shared/email-shell.ts";
import { authenticatePro } from "../_shared/pro-auth.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/(www\.)?homesbrain\.com$/,
];
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
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isHttpsUrl(v: unknown): v is string {
  return typeof v === "string" && /^https:\/\//i.test(v);
}

function itemLine(equipmentType: string | null, whatDone: string | null) {
  const eq = equipmentType?.trim();
  if (eq) return eq;
  const w = whatDone?.trim();
  if (w) return w.length > 60 ? w.slice(0, 57) + "…" : w;
  return "service";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }
  try {
    const auth = await authenticatePro(req);
    if (!auth) return json({ ok: false, code: "unauthorized" }, 401);
    const { admin, pro } = auth;

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    if (!jobId) return json({ ok: false, code: "bad_request" }, 400);

    const { data: job } = await admin
      .from("jobs")
      .select(
        "id,pro_id,home_id,what_done,next_service_date,equipment_id,customers(id,name,email),homes(id,address,claimed_at),equipment(type),records(id,created_at)",
      )
      .eq("id", jobId)
      .maybeSingle();
    if (!job || job.pro_id !== pro.id) {
      return json({ ok: false, code: "forbidden" }, 403);
    }
    const customer = Array.isArray(job.customers)
      ? job.customers[0]
      : job.customers;
    const home = Array.isArray(job.homes) ? job.homes[0] : job.homes;
    const equipment = Array.isArray(job.equipment)
      ? job.equipment[0]
      : job.equipment;
    const email = customer?.email ?? null;
    if (!email) return json({ ok: false, code: "no_email" });

    if (await isEmailOptedOut(admin, email)) {
      return json({ ok: false, code: "opted_out" });
    }
    const unsubToken = await getUnsubToken(admin, email);
    if (!unsubToken) return json({ ok: false, code: "unsub_token_failed" }, 500);
    const unsubUrl = buildUnsubUrl(unsubToken);

    const records = (job.records ?? []) as { id: string; created_at: string }[];
    const latestRecordId =
      records.slice().sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      )[0]?.id ?? null;

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = claimOrigin(body?.origin);
    const address = home?.address ?? "your home";
    const claimed = !!home?.claimed_at;
    const item = itemLine(equipment?.type ?? null, job.what_done ?? null);
    const firstName = (customer?.name ?? "").trim().split(/\s+/)[0] || "there";

    let ctaUrl = `${originUrl}/home`;
    if (latestRecordId) {
      const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await sha256Hex(raw);
      const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
      const { error: tokErr } = await admin.from("claim_tokens").insert({
        token_hash: tokenHash,
        record_id: latestRecordId,
        home_id: job.home_id,
        pro_id: pro.id,
        email,
        locale: "en",
        expires_at: expiresAt,
      });
      if (!tokErr) ctaUrl = `${originUrl}/claim/${raw}`;
    }

    const cta = claimed ? "Open my home" : "Open my record";
    const subject = `Time for a check-up on your ${item}`;
    const intro =
      `Hi ${firstName}, it's ${pro.business}. It's been a while since we serviced your ${item} at ${address}. If you'd like to get on the schedule, just reply to this email and we'll take care of it.`;
    const text = [
      intro,
      "",
      `${cta}: ${ctaUrl}`,
      "",
      "Every visit builds your home's living record. Free for life.",
      "",
      complianceFooterText(
        unsubUrl,
        `You're receiving this because ${pro.business} services your home at ${address}. HomesBrain hosts the record on their behalf.`,
        {
          unsubscribe: "Unsubscribe",
          optOut: "You can opt out of these emails at any time.",
          questions: "Questions?",
          email: "Email",
        },
      ),
    ].join("\n");

    const b = esc(pro.business);
    const header =
      pro.logo && isHttpsUrl(pro.logo)
        ? `<img src="${esc(pro.logo)}" alt="${b}" style="max-height:44px;max-width:220px;display:block;" />`
        : `<div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">${b}</div>`;

    const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:12px;">${header}</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">via HomesBrain</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">${esc(subject)}</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#16160f;">${esc(intro)}</p>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">${esc(cta)}</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">Reply to this email and we'll get back to you.</p>
    </div>
    ${complianceFooterHtml(
      unsubUrl,
      undefined,
      {
        unsubscribe: "Unsubscribe",
        optOut: "You can opt out of these emails at any time.",
        questions: "Questions?",
        email: "Email",
      },
    )}
  </div>
</body></html>`;

    const fromDisplay = `${pro.business.replace(/[<>]/g, "")} via HomesBrain`;
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromDisplay} <invites@homesbrain.com>`,
        to: [email],
        subject,
        html,
        text,
        headers: listUnsubscribeHeaders(unsubToken),
      }),
    });
    if (!resp.ok) {
      console.error("send-follow-up resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const now = new Date().toISOString();
    await admin
      .from("jobs")
      .update({ follow_up_handled_at: now })
      .eq("id", job.id)
      .eq("pro_id", pro.id);
    await admin.from("messages").insert({
      channel: "email",
      to_contact: email,
      body: text,
      kind: "other",
      locale: "en",
    });
    await admin.from("events").insert({
      actor: `pro:${pro.id}`,
      type: "follow_up_reminder_sent",
      props: { job_id: job.id, customer_id: customer?.id ?? null },
    });

    return json({ ok: true, sent_at: now });
  } catch (e) {
    console.error("send-follow-up error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
