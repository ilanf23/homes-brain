/* Homeowner sign-in via Resend + branded /claim/:token front door.
   Replaces Supabase's built-in magic-link email (unreliable delivery)
   with the same pipeline the claim invite already uses.

   verify_jwt = false: the homeowner has no session yet by design.
   We only ever email a link to an address that already has a
   homeowners row, and the token->session exchange happens server-side
   inside claim-exchange. */

import { createClient } from "npm:@supabase/supabase-js@2";
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
  const text = [
    "Tap to sign in to your HomesBrain home.",
    "",
    `Sign in: ${ctaUrl}`,
    "",
    "This link works from your inbox and expires in 30 minutes.",
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n");
  const bodyHtml = [
    renderH1("Sign in to your home"),
    renderBody(
      "Tap the button to sign in. This link works from your inbox and expires in 30 minutes.",
    ),
    renderCta(ctaUrl, "Sign in to HomesBrain"),
    renderFinePrint("If you didn't request this, you can ignore this email."),
  ].join("\n");
  const html = renderEmailShell({
    lang: "en",
    brandLine: "HomesBrain",
    eyebrow: "Every home remembers",
    bodyHtml,
  });
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

    // We used to reject unknown emails here with "no_account". Now the
    // homeowner side is also a signup path: one auth user (email) can
    // hold BOTH a homeowners row AND a pros row, and picking "Homeowner"
    // at /login for a pro-only or brand-new email should create the
    // homeowners row on the spot after the token exchange. claim-exchange
    // + get_home_view do that materialization; we just need to send the
    // link and tag the token's intent.
    const { data: ho } = await admin
      .from("homeowners")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    // Kept for logging/telemetry only.
    void ho;

    // Optional record to reopen/claim after login (an expired claim link
    // routed the homeowner here with the record preserved). Bind it to the
    // fresh token only when this email is already tied to that home, as
    // the customer the pro added or as the homeowner who claimed it.
    // Otherwise a login link would let any email claim any record id.
    const claimRaw = typeof body?.claim === "string" ? body.claim : "";
    let recordId: string | null = null;
    let homeId: string | null = null;
    let proId: string | null = null;
    if (claimRaw) {
      const { data: rec } = await admin
        .from("records")
        .select("id,jobs(home_id,pro_id)")
        .eq("id", claimRaw)
        .maybeSingle();
      const job = Array.isArray(rec?.jobs) ? rec?.jobs[0] : rec?.jobs;
      if (job?.home_id) {
        const { data: cust } = await admin
          .from("customers")
          .select("id")
          .eq("home_id", job.home_id)
          .ilike("email", email)
          .limit(1)
          .maybeSingle();
        let allowed = !!cust;
        if (!allowed) {
          const { data: homeRow } = await admin
            .from("homes")
            .select("claimed_by_homeowner")
            .eq("id", job.home_id)
            .maybeSingle();
          if (homeRow?.claimed_by_homeowner) {
            const { data: owner } = await admin
              .from("homeowners")
              .select("id")
              .eq("id", homeRow.claimed_by_homeowner)
              .ilike("email", email)
              .maybeSingle();
            allowed = !!owner;
          }
        }
        if (allowed) {
          recordId = claimRaw;
          homeId = job.home_id;
          proId = job.pro_id ?? null;
        }
      }
    }

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
      record_id: recordId,
      home_id: homeId,
      pro_id: proId,
      email,
      expires_at: expiresAt,
      intent: "homeowner",
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

    return json({ ok: true });

  } catch (e) {
    console.error("homeowner-login error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
