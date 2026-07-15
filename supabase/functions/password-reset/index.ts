/* Send password-reset emails via Resend instead of Supabase's built-in
   email (which has not been delivering reliably in this project).

   We mint the recovery link with admin.auth.admin.generateLink and
   forward that link inside our own branded Resend email. Landing page
   is /reset-password, which already handles the recovery hash.

   verify_jwt = false: caller is unauthenticated (they forgot their
   password). We only ever email a link to an address that already has
   an auth user, and never reveal whether the email exists. */

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resetOrigin(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_ORIGIN;
  return ALLOWED_ORIGINS.some((re) => re.test(raw)) ? raw : FALLBACK_ORIGIN;
}

function resetEmail(link: string) {
  const url = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const text = [
    "You asked to reset your HomesBrain password.",
    "",
    `Reset your password: ${link}`,
    "",
    "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">HomesBrain</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">Password reset</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">Reset your password</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#73706a;">Tap the button to choose a new password. This link expires in 1 hour.</p>
      <div style="margin-top:22px;">
        <a href="${url}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Reset password</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">If you didn't request this, you can ignore this email.</p>
    </div>
  </div>
</body></html>`;
  return { subject: "Reset your HomesBrain password", text, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();
    const origin = resetOrigin(body?.origin);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Per-address daily cap to protect sender reputation. Applied before
    // the user lookup so it can't be used to enumerate accounts.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "password_reset")
      .eq("channel", "email")
      .eq("to_contact", email)
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) {
      // Silent success: don't reveal rate-limit state either.
      return json({ ok: true });
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    // generateLink returns an action_link for /auth/v1/verify that will
    // redirect to our /reset-password page with the recovery hash.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/reset-password` },
    });

    // If the user doesn't exist we don't leak that: respond ok.
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("password-reset generateLink failed", linkErr);
      return json({ ok: true });
    }

    const mail = resetEmail(linkData.properties.action_link);
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
      kind: "password_reset",
    });
    if (msgErr) console.error("password-reset message log failed", msgErr);

    return json({ ok: true });
  } catch (e) {
    console.error("password-reset error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
