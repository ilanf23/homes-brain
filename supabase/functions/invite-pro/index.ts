/* Homeowner-initiated email invite to an off-platform pro.

   Auth: verify_jwt = true. We resolve the caller via their JWT (a client
   that carries the caller's Authorization header) and look up their
   homeowner row + home address. Only the authenticated homeowner can
   send, and the email truthfully names their home.

   Service role is used only for the outbound Resend send and for the
   messages log — never for identity. */

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

const DAILY_LIMIT = 50; // per-recipient sends in a rolling 24h window
const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [/^http:\/\/localhost(:\d+)?$/, /^https:\/\/(www\.)?homesbrain\.com$/];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickOrigin(raw: unknown): string {
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

function inviteEmail(opts: {
  fromName: string;
  address: string;
  toName: string;
  trade: string | null;
  ctaUrl: string;
}) {
  const { fromName, address, toName, trade, ctaUrl } = opts;
  const tradeLine = trade ? ` (${trade})` : "";
  const subject = `A homeowner invited you to HomesBrain`;
  const text = [
    `Hi ${toName},`,
    "",
    `${fromName} at ${address} invited you${tradeLine} to keep their home's service record on HomesBrain — free for pros.`,
    "",
    "Log the work in 30 seconds, own the customer relationship, and get rebooked.",
    "",
    `Join HomesBrain: ${ctaUrl}`,
    "",
    "Free to start. No card.",
    "",
    "— HomesBrain",
  ].join("\n");

  const b = esc(fromName);
  const a = esc(address);
  const t = esc(toName);
  const tr = trade ? esc(trade) : null;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">HomesBrain</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">A Carfax for homes</div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">You've been invited to HomesBrain</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#16160f;">Hi ${t},</p>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#16160f;"><strong>${b}</strong> at <strong>${a}</strong> invited you${tr ? ` (${tr})` : ""} to keep their home's service record on HomesBrain.</p>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#73706a;">Log the work in 30 seconds, own the customer relationship, and get rebooked. Free for pros.</p>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Join HomesBrain</a>
      </div>
      <p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:#73706a;">Free to start. No card.</p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because a HomesBrain homeowner invited you. If this wasn't for you, ignore this email.</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ ok: false, code: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const toName = typeof body?.to_name === "string" ? body.to_name.trim() : "";
    const toEmail =
      typeof body?.to_email === "string" ? body.to_email.trim().toLowerCase() : "";
    const trade = typeof body?.trade === "string" ? body.trade.trim() : "";
    const originRaw = body?.origin;

    if (!toName || !toEmail || !EMAIL_RE.test(toEmail)) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Caller-scoped client — RLS + SECURITY DEFINER helpers see the user's JWT.
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, code: "unauthorized" }, 401);
    }

    const { data: hoId, error: hoErr } = await asCaller.rpc("my_homeowner_id");
    if (hoErr || !hoId) {
      return json({ ok: false, code: "forbidden" }, 403);
    }

    // Fetch homeowner name + home address as the caller (RLS-scoped).
    const [{ data: ho }, { data: home }] = await Promise.all([
      asCaller.from("homeowners").select("name").eq("id", hoId as string).maybeSingle(),
      asCaller
        .from("homes")
        .select("address")
        .eq("claimed_by_homeowner", hoId as string)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!home?.address) {
      return json({ ok: false, code: "no_home" }, 400);
    }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Per-recipient daily cap protects deliverability and prevents spam.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "pro_invite")
      .eq("channel", "email")
      .eq("to_contact", toEmail)
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) return json({ ok: false, code: "daily_limit" });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = pickOrigin(originRaw);
    const fromName =
      (ho?.name && typeof ho.name === "string" && ho.name.trim()) || "A homeowner";

    const email = inviteEmail({
      fromName,
      address: home.address,
      toName,
      trade: trade || null,
      ctaUrl: `${originUrl}/pro/signup`,
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [toEmail],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!resp.ok) {
      console.error("invite-pro resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const { error: msgErr } = await admin.from("messages").insert({
      channel: "email",
      to_contact: toEmail,
      body: email.text,
      kind: "pro_invite",
    });
    if (msgErr) console.error("invite-pro message log failed", msgErr);

    return json({ ok: true });
  } catch (e) {
    console.error("invite-pro error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
