/* Public email unsubscribe endpoint.
   Supports:
     GET  ?token=...                 -> { ok, masked_email? }
     POST ?token=...                 -> one-click unsubscribe (RFC 8058)
     POST body { token, action }     -> "unsubscribe" | "resubscribe"
   Service role only; email is never returned in full (only masked). */

import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function resolveEmail(token: string): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  const { data } = await admin()
    .from("email_unsub_tokens")
    .select("email")
    .eq("token", token)
    .maybeSingle();
  return (data?.email as string | undefined) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const qsToken = url.searchParams.get("token") ?? "";

  try {
    if (req.method === "GET") {
      const email = await resolveEmail(qsToken);
      if (!email) return json({ ok: false });
      return json({ ok: true, masked_email: maskEmail(email) });
    }

    if (req.method === "POST") {
      // One-click (RFC 8058): plain POST with token in the query string, no body.
      let action = "unsubscribe";
      let bodyToken = qsToken;
      let source: string | null = null;
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          const b = await req.json();
          if (typeof b?.token === "string" && b.token) bodyToken = b.token;
          if (typeof b?.action === "string") action = b.action;
          if (typeof b?.source === "string") source = b.source;
        } catch {
          // ignore, treat as one-click
        }
      }

      const email = await resolveEmail(bodyToken);
      if (!email) return json({ ok: false }, 200);

      const db = admin();
      if (action === "resubscribe") {
        const { error } = await db
          .from("email_optouts")
          .update({ resubscribed_at: new Date().toISOString() })
          .eq("email", email);
        if (error) {
          console.error("resubscribe failed", error);
          return json({ ok: false }, 500);
        }
        return json({ ok: true, action: "resubscribe" });
      }

      // unsubscribe (default)
      const { error } = await db.from("email_optouts").upsert(
        {
          email,
          opted_out_at: new Date().toISOString(),
          resubscribed_at: null,
          source,
        },
        { onConflict: "email" },
      );
      if (error) {
        console.error("unsubscribe failed", error);
        return json({ ok: false }, 500);
      }
      return json({ ok: true, action: "unsubscribe" });
    }

    return json({ ok: false, code: "method_not_allowed" }, 405);
  } catch (e) {
    console.error("email-unsubscribe error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
