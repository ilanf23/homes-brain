/* Homeowner-initiated email invite to an off-platform pro.

   Auth: verify_jwt = true. We resolve the caller via their JWT (a client
   that carries the caller's Authorization header) and look up their
   homeowner row + home address. Only the authenticated homeowner can
   send, and the email truthfully names their home.

   Service role is used only for the outbound Resend send and for the
   messages log: never for identity. */

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildUnsubUrl,
  complianceFooterText,
  getUnsubToken,
  isEmailOptedOut,
  listUnsubscribeHeaders,
} from "../_shared/email-compliance.ts";
import {
  emphasize,
  renderBody,
  renderBodyHtml,
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
  unsubUrl: string;
}) {
  const { fromName, address, toName, trade, ctaUrl, unsubUrl } = opts;
  const tradeLine = trade ? ` (${trade})` : "";
  const subject = `A homeowner invited you to HomesBrain`;
  const reason = `You're receiving this because a HomesBrain homeowner invited you. If this wasn't for you, ignore this email.`;
  const text = [
    `Hi ${toName},`,
    "",
    `${fromName} at ${address} invited you${tradeLine} to keep their home's service record on HomesBrain: free for pros.`,
    "",
    "Log the work in 30 seconds, own the customer relationship, and get rebooked.",
    "",
    `Join HomesBrain: ${ctaUrl}`,
    "",
    "Free to start. No card.",
    "",
    "- HomesBrain",
    complianceFooterText(unsubUrl, reason),
  ].join("\n");

  const invitedHtml = `${emphasize(fromName)} at ${emphasize(address)} invited you${trade ? ` (${esc(trade)})` : ""} to keep their home's service record on HomesBrain.`;

  const bodyHtml = [
    renderH1("You've been invited to HomesBrain"),
    renderBody(`Hi ${toName},`),
    renderBodyHtml(invitedHtml, { marginTop: 12 }),
    renderBody(
      "Log the work in 30 seconds, own the customer relationship, and get rebooked. Free for pros.",
      { marginTop: 12 },
    ),
    renderCta(ctaUrl, "Join HomesBrain"),
    renderFinePrint("Free to start. No card."),
  ].join("\n");

  const html = renderEmailShell({
    lang: "en",
    brandLine: "HomesBrain",
    eyebrow: "Every home remembers",
    bodyHtml,
    reason,
    unsubUrl,
  });

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

    // Caller-scoped client: RLS + SECURITY DEFINER helpers see the user's JWT.
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

    // Honor CAN-SPAM opt-outs before any send-side work.
    if (await isEmailOptedOut(admin, toEmail)) {
      return json({ ok: false, code: "opted_out" });
    }

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

    const unsubToken = await getUnsubToken(admin, toEmail);
    if (!unsubToken) return json({ ok: false, code: "unsub_token_failed" }, 500);
    const unsubUrl = buildUnsubUrl(unsubToken);

    const email = inviteEmail({
      fromName,
      address: home.address,
      toName,
      trade: trade || null,
      ctaUrl: `${originUrl}/pro/signup`,
      unsubUrl,
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
        headers: listUnsubscribeHeaders(unsubToken),
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
