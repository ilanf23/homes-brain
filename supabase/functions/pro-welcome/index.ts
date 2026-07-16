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

  const bodyHtml = [
    renderH1(`${greeting}.`),
    renderBody(
      "You're in. HomesBrain keeps a service record for every job you do, so the customers you already earned come back to you instead of Googling a competitor.",
    ),
    renderBody("Your one first step: log your first job. It takes about 30 seconds."),
    renderCta(ctaUrl, "Log your first job"),
    renderFinePrint("Free for life. No credit card, no per-record fees."),
  ].join("\n");

  const html = renderEmailShell({
    lang: "en",
    brandLine: "HomesBrain",
    eyebrow: "Every home remembers",
    bodyHtml,
    reason:
      "You're receiving this because you just created a HomesBrain pro account. Questions? Just reply.",
  });

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
