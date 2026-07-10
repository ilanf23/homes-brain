/* Mint a short-lived (20 min), single-use claim token and return the branded
   claim URL so the pro can render it as a QR on-screen. Mirrors invite-claim's
   ownership checks and token shape exactly - just no email is sent. */

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

const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [/^http:\/\/localhost(:\d+)?$/, /^https:\/\/(www\.)?homesbrain\.com$/];
const TOKEN_TTL_MS = 20 * 60 * 1000;

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

    const { data: pro } = await admin
      .from("pros")
      .select("id")
      .eq("id", pro_id)
      .maybeSingle();
    if (!pro) return json({ ok: false, code: "forbidden", stage: "pro" }, 403);

    const { data: customer } = await admin
      .from("customers")
      .select("id,pro_id,home_id,email")
      .eq("id", customer_id)
      .maybeSingle();
    if (!customer || customer.pro_id !== pro.id) {
      return json({ ok: false, code: "forbidden", stage: "customer" }, 403);
    }
    if (!customer.email) return json({ ok: false, code: "no_email" });

    // Resolve the record id the same way invite-claim does.
    const { data: jobRows } = await admin
      .from("jobs")
      .select("id,created_at,records(id,created_at)")
      .eq("home_id", customer.home_id)
      .eq("pro_id", pro.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestJob = jobRows?.[0] ?? null;
    const jobRecords = (latestJob?.records ?? []) as { id: string; created_at: string }[];
    const latestRecordId = jobRecords
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]?.id ?? null;

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
    if (!claimRecordId) return json({ ok: false, code: "no_record" });

    const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await sha256Hex(raw);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    const { error: tokErr } = await admin.from("claim_tokens").insert({
      token_hash: tokenHash,
      record_id: claimRecordId,
      home_id: customer.home_id,
      pro_id: pro.id,
      email: customer.email,
      expires_at: expiresAt,
    });
    if (tokErr) {
      console.error("claim-qr token insert failed", tokErr);
      return json({ ok: false, code: "error" }, 500);
    }

    const originUrl = claimOrigin(origin);
    return json({
      ok: true,
      claim_url: `${originUrl}/claim/${raw}`,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error("claim-qr error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
