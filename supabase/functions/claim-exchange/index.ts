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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token || token.length < 20) {
      return json({ ok: false, code: "invalid" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tokenHash = await sha256Hex(token);
    // in_band is added by a pending migration. If this function deploys first,
    // the column won't exist yet: retry without it and treat in_band as false
    // (email-delivered) rather than failing every claim.
    const baseCols = "id,record_id,home_id,pro_id,email,expires_at,used_at,intent,first_name,locale";
    const initialRow = await admin
      .from("claim_tokens")
      .select(`${baseCols},in_band`)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    let row = initialRow.data as any;
    if (initialRow.error && initialRow.error.code === "42703") {
      const retry = await admin
        .from("claim_tokens")
        .select(baseCols)
        .eq("token_hash", tokenHash)
        .maybeSingle();
      row = retry.data;
    }

    if (!row) return json({ ok: false, code: "invalid" }, 404);
    if (row.used_at) {
      return json({
        ok: false,
        code: "used",
        record_id: row.record_id,
        locale: row.locale,
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({
        ok: false,
        code: "expired",
        record_id: row.record_id,
        locale: row.locale,
      });
    }

    // Login-only token: no record to claim, just establish a session.
    let preview: unknown = null;
    if (row.record_id) {
      // Load preview data even before finalizing, so the client can render.
      // hidden_fields is added by a pending migration: if this edge function
      // deploys first, the column won't exist yet and the select below
      // errors. Retry without it rather than losing the whole preview.
      const initial = await admin
        .from("records")
        .select(
          "id,created_at,hidden_fields,jobs(id,what_done,equipment_id,localized_content,homes(address))",
        )
        .eq("id", row.record_id)
        .maybeSingle();
      let recordRow = initial.data;
      if (initial.error && initial.error.code === "42703") {
        const retry = await admin
          .from("records")
          .select("id,created_at,jobs(id,what_done,equipment_id,localized_content,homes(address))")
          .eq("id", row.record_id)
          .maybeSingle();
        recordRow = retry.data as typeof recordRow;
      }
      const recordTyped = recordRow as unknown as {
        hidden_fields?: string[] | null;
        jobs?: {
          id?: string;
          what_done?: string;
          equipment_id?: string | null;
          localized_content?: Record<
            string,
            { what_done?: string; equipment_type?: string }
          >;
          homes?: { address?: string };
        };
      } | null;
      const job = recordTyped?.jobs;
      const address = job?.homes?.address ?? null;
      const localized = job?.localized_content?.[row.locale ?? "en"];
      const whatDone = localized?.what_done ?? job?.what_done ?? null;
      const equipmentId = job?.equipment_id ?? null;
      let equipment: {
        type: string | null;
        make: string | null;
        model: string | null;
        warranty_until: string | null;
      } | null = null;
      if (equipmentId) {
        const { data: eq } = await admin
          .from("equipment")
          .select("type,make,model,warranty_until")
          .eq("id", equipmentId)
          .maybeSingle();
        if (eq) {
          equipment = {
            ...eq,
            type: localized?.equipment_type ?? eq.type,
          };
        }
      }
      const { data: pro } = row.pro_id
        ? await admin.from("pros").select("id,business,logo").eq(
          "id",
          row.pro_id,
        ).maybeSingle()
        : { data: null };

      const hiddenFields: string[] = Array.isArray(recordTyped?.hidden_fields)
        ? recordTyped.hidden_fields
        : [];
      let media: Array<{ kind: string; url: string; thumbnail_url: string | null }> = [];
      const jobId = job?.id;
      if (jobId) {
        const { data: mediaRows } = await admin
          .from("job_media")
          .select("kind,url,thumbnail_url")
          .eq("job_id", jobId)
          .order("created_at", { ascending: true });
        const visibleRows = (mediaRows ?? []).filter((m) =>
          m.kind === "video" ? !hiddenFields.includes("video") : !hiddenFields.includes("photos"),
        );

        // job_media.url/thumbnail_url are storage paths (private bucket): sign
        // them here so the preview can render before the homeowner has a
        // session. A signing failure degrades to empty media, never breaks
        // the preview.
        const paths = new Set<string>();
        for (const m of visibleRows) {
          paths.add(m.url);
          if (m.thumbnail_url) paths.add(m.thumbnail_url);
        }
        if (paths.size > 0) {
          const { data: signedRows, error: signErr } = await admin.storage
            .from("job-media")
            .createSignedUrls(Array.from(paths), 3600);
          if (!signErr && signedRows) {
            const signed = new Map<string, string>();
            for (const item of signedRows) {
              if (item.error || !item.path || !item.signedUrl) continue;
              signed.set(item.path, item.signedUrl);
            }
            media = visibleRows.flatMap((m) => {
              const url = signed.get(m.url);
              if (!url) return [];
              const thumbnail_url = m.thumbnail_url ? (signed.get(m.thumbnail_url) ?? null) : null;
              return [{ kind: m.kind, url, thumbnail_url }];
            });
          }
        }
      }

      preview = {
        record_id: row.record_id,
        equipment_id: equipmentId,
        address,
        what_done: whatDone,
        equipment,
        pro: pro ? { business: pro.business, logo: pro.logo } : null,
        media,
      };
    }

    // Tokens returned in-band to the API caller (the QR flow) must not mint a
    // session directly: the bound email was asserted by the pro, not proven by
    // the recipient. Route the claimer through the emailed sign-in link
    // (homeowner-login) so only the real inbox owner can complete login. The
    // preview above still renders, so the in-person QR moment keeps its value.
    if (row.in_band) {
      return json({
        ok: false,
        code: "verify_email",
        preview,
        record_id: row.record_id,
        locale: row.locale ?? "en",
      });
    }

    // A session may only be minted for the email the token was bound to at
    // mint time (proven by delivery to that inbox). A request-body email is
    // never trusted here: accepting one would let a caller mint a login
    // session for any address they type. Tokens with no bound email cannot
    // establish a session.
    const email = row.email;
    if (!email) {
      return json({
        ok: false,
        code: "need_email",
        preview,
        locale: row.locale,
      });
    }

    // Mint a magic credential without a visible supabase.co redirect.
    const { data: linkData, error: linkErr } = await admin.auth.admin
      .generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("claim-exchange generateLink failed", linkErr);
      return json({ ok: false, code: "send_failed" }, 502);
    }

    // Single-use: mark consumed before returning the credential.
    await admin.from("claim_tokens").update({
      used_at: new Date().toISOString(),
    }).eq("id", row.id);

    return json({
      ok: true,
      hashed_token: linkData.properties.hashed_token,
      email,
      record_id: row.record_id,
      intent: row.intent ?? null,
      first_name: row.first_name ?? null,
      locale: row.locale ?? "en",
      preview,
    });
  } catch (e) {
    console.error("claim-exchange error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
