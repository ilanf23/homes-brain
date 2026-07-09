/* Homeowner sign-in via Resend + branded /claim/:token front door.
   Replaces Supabase's built-in magic-link email (unreliable delivery)
   with the same pipeline the claim invite already uses.

   verify_jwt = false: the homeowner has no session yet by design.
   We only ever email a link to an address that already has a
   homeowners row, and the token->session exchange happens server-side
   inside claim-exchange. */

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

const DAILY_LIMIT = 200;
const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [/^http:\/\/localhost(:\d+)?$/, /^https:\/\/(www\.)?homesbrain\.com$/];
const LOGIN_TOKEN_TTL_MS = 30 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function loginOrigin(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_ORIGIN;
  return ALLOWED_ORIGINS.some((re) => re.test(raw)) ? raw : FALLBACK_ORIGIN;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function base64url(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loginEmail(ctaUrl: string) {
  const url = esc(ctaUrl);
  const text = [
    "Tap to sign in to your HomesBrain home.",
    "",
    `Sign in: ${ctaUrl}`,
    "",
    "This link works from your inbox and expires in 30 minutes.",
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">HomesBrain</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">Sign-in link</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">Sign in to your home</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#73706a;">Tap the button to sign in. This link works from your inbox and expires in 30 minutes.</p>
      <div style="margin-top:22px;">
        <a href="${url}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Sign in to HomesBrain</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">If you didn't request this, you can ignore this email.</p>
    </div>
  </div>
</body></html>`;
  return { subject: "Your HomesBrain sign-in link", text, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();
    const origin = loginOrigin(body?.origin);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ho } = await admin
      .from("homeowners")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!ho) return json({ ok: false, code: "no_account" });

    // Per-address daily cap protects the sending domain reputation.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "login_link")
      .eq("channel", "email")
      .eq("to_contact", email)
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) return json({ ok: false, code: "daily_limit" });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await sha256Hex(raw);
    const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();
    const { error: tokErr } = await admin.from("claim_tokens").insert({
      token_hash: tokenHash,
      record_id: null,
      home_id: null,
      pro_id: null,
      email,
      expires_at: expiresAt,
    });
    if (tokErr) {
      console.error("homeowner-login token insert failed", tokErr);
      return json({ ok: false, code: "error" }, 500);
    }

    const ctaUrl = `${origin}/claim/${raw}`;
    const mail = loginEmail(ctaUrl);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [email],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!resp.ok) {
      console.error("resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const { error: msgErr } = await admin.from("messages").insert({
      channel: "email",
      to_contact: email,
      body: mail.text,
      kind: "login_link",
    });
    if (msgErr) console.error("homeowner-login message log failed", msgErr);

    // Do not log the raw token; only success + email.
    void esc;
    return json({ ok: true });
  } catch (e) {
    console.error("homeowner-login error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
