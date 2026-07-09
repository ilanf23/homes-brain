/* Branded claim front door exchange. The client calls this with the raw
   token from /claim/:token. We validate against claim_tokens (hashed,
   single-use, expiring), mint a Supabase magic-credential (hashed_token)
   for the token's email, and return it along with a preview of the
   record so the page can show value immediately.

   verify_jwt is off (see supabase/config.toml): the whole point is that
   the homeowner has no session yet. All authorization comes from
   possession of the high-entropy token, which is hashed at rest.
*/

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const providedEmail =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!token || token.length < 20) return json({ ok: false, code: "invalid" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tokenHash = await sha256Hex(token);
    const { data: row } = await admin
      .from("claim_tokens")
      .select("id,record_id,home_id,pro_id,email,expires_at,used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!row) return json({ ok: false, code: "invalid" }, 404);
    if (row.used_at) return json({ ok: false, code: "used", record_id: row.record_id });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ ok: false, code: "expired", record_id: row.record_id });
    }

    // Login-only token: no record to claim, just establish a session.
    let preview: unknown = null;
    if (row.record_id) {
      // Load preview data even before finalizing, so the client can render.
      const { data: recordRow } = await admin
        .from("records")
        .select("id,created_at,jobs(what_done,equipment_id,homes(address))")
        .eq("id", row.record_id)
        .maybeSingle();
      const job = (recordRow as unknown as {
        jobs?: { what_done?: string; equipment_id?: string | null; homes?: { address?: string } };
      } | null)?.jobs;
      const address = job?.homes?.address ?? null;
      const whatDone = job?.what_done ?? null;
      let equipment: {
        type: string | null;
        make: string | null;
        model: string | null;
        warranty_until: string | null;
      } | null = null;
      if (job?.equipment_id) {
        const { data: eq } = await admin
          .from("equipment")
          .select("type,make,model,warranty_until")
          .eq("id", job.equipment_id)
          .maybeSingle();
        if (eq) equipment = eq;
      }
      const { data: pro } = row.pro_id
        ? await admin.from("pros").select("id,business,logo").eq("id", row.pro_id).maybeSingle()
        : { data: null };

      preview = {
        record_id: row.record_id,
        address,
        what_done: whatDone,
        equipment,
        pro: pro ? { business: pro.business, logo: pro.logo } : null,
      };
    }

    // If the token has no email, ask for it (one-time capture path).
    const email = row.email ?? providedEmail;
    if (!email) return json({ ok: false, code: "need_email", preview });


    // Mint a magic credential without a visible supabase.co redirect.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("claim-exchange generateLink failed", linkErr);
      return json({ ok: false, code: "send_failed" }, 502);
    }

    // Single-use: mark consumed before returning the credential.
    await admin.from("claim_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);

    return json({
      ok: true,
      hashed_token: linkData.properties.hashed_token,
      email,
      record_id: row.record_id,
      preview,
    });
  } catch (e) {
    console.error("claim-exchange error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
