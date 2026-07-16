/* One-time welcome email for a newly created pro. Idempotent: guarded by
   pros.welcomed_at (set to now() on the same UPDATE that claims the send).
   Called from the auth callback + Google claim flow right after pro_ensure.
   Safe to call on every login; only the first call actually sends. */

import { authenticatePro } from "../_shared/pro-auth.ts";
import {
  renderBody,
  renderCta,
  renderEmailShell,
  renderFinePrint,
  renderH1,
} from "../_shared/email-shell.ts";

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeOrigin(raw: unknown): string {
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

function welcomeEmail(opts: { firstName: string | null; ctaUrl: string }) {
  const { firstName, ctaUrl } = opts;
  const greeting = firstName ? `Welcome to HomesBrain, ${firstName}` : `Welcome to HomesBrain`;
  const subject = greeting;

  const text = [
    `${greeting}.`,
    "",
    "You're in. HomesBrain keeps a service record for every job you do, so the customers you already earned come back to you instead of Googling a competitor.",
    "",
    "Your one first step: log your first job. It takes about 30 seconds.",
    "",
    `Log your first job: ${ctaUrl}`,
    "",
    "Free for life. Every home remembers.",
    "",
    "HomesBrain",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div translate="no" class="notranslate" style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">HomesBrain</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">Every home remembers</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:#16160f;">${esc(greeting)}.</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#16160f;">You're in. <span translate="no" class="notranslate">HomesBrain</span> keeps a service record for every job you do, so the customers you already earned come back to you instead of Googling a competitor.</p>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#16160f;">Your one first step: log your first job. It takes about 30 seconds.</p>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Log your first job</a>
      </div>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#73706a;">Free for life. No credit card, no per-record fees.</p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because you just created a <span translate="no" class="notranslate">HomesBrain</span> pro account. Questions? Just reply.</p>
  </div>
</body></html>`;

  return { subject, text, html };
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

    let origin: unknown = undefined;
    try {
      const body = await req.json();
      origin = body?.origin;
    } catch { /* body is optional */ }

    // Pull the full pro row so we can guard on welcomed_at + read email/first name.
    const { data: full, error: readErr } = await admin
      .from("pros")
      .select("id,email,owner_first_name,welcomed_at")
      .eq("id", pro.id)
      .maybeSingle();
    if (readErr || !full) return json({ ok: false, code: "pro_not_found" }, 404);

    if (full.welcomed_at) return json({ ok: true, skipped: "already_welcomed" });
    if (!full.email) {
      // Nothing to send to yet. Don't stamp welcomed_at so a later email
      // update can still trigger the greeting.
      return json({ ok: true, skipped: "no_email" });
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: true, skipped: "not_configured" });

    // Atomically claim the send: only proceed if no one else stamped
    // welcomed_at between our read and this update. Two concurrent calls
    // can race here, but only one will get affected_rows > 0.
    const { data: claimed, error: claimErr } = await admin
      .from("pros")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", full.id)
      .is("welcomed_at", null)
      .select("id")
      .maybeSingle();
    if (claimErr) {
      console.error("pro-welcome claim failed", claimErr);
      return json({ ok: false, code: "claim_failed" }, 500);
    }
    if (!claimed) return json({ ok: true, skipped: "raced" });

    const originUrl = safeOrigin(origin);
    const ctaUrl = `${originUrl}/pro/jobs/new`;
    const firstName = (full.owner_first_name ?? "").toString().trim() || null;
    const email = welcomeEmail({ firstName, ctaUrl });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [full.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!resp.ok) {
      // Roll the guard back so a future login retries the send.
      const errText = await resp.text();
      console.error("pro-welcome resend error", resp.status, errText);
      await admin
        .from("pros")
        .update({ welcomed_at: null })
        .eq("id", full.id);
      return json({ ok: false, code: "send_failed" }, 502);
    }

    await admin.from("messages").insert({
      channel: "email",
      to_contact: full.email,
      body: email.text,
      kind: "pro_welcome",
    });

    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("pro-welcome error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
