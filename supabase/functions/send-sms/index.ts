// send-sms: dormant Twilio sender. Safe no-op until SMS_ENABLED="true"
// and TWILIO_* env vars are set. Called by other server functions
// (service role), NOT by the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SendBody = { to?: string; body?: string; kind?: string };

function normalizeE164(raw: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // Already E.164
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function withinQuietHoursET(): boolean {
  // Allowed window: 8:00 - 20:59 America/New_York (through 9pm exclusive at 21:00).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = parseInt(hourStr, 10);
  return hour >= 8 && hour < 21;
}

async function logMessage(
  supabase: ReturnType<typeof createClient>,
  to: string,
  body: string,
  kind: string,
) {
  try {
    await supabase.from("messages").insert({
      channel: "sms",
      to_contact: to,
      body,
      kind: kind || "other",
    });
  } catch (_e) {
    // swallow: never break the caller
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: SendBody = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, code: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const toRaw = (payload.to ?? "").toString();
  const body = (payload.body ?? "").toString();
  const kind = (payload.kind ?? "other").toString();

  const SMS_ENABLED = Deno.env.get("SMS_ENABLED");
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const MSID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  // (a) disabled / missing credentials
  if (SMS_ENABLED !== "true" || !SID || !TOKEN || !MSID) {
    await logMessage(supabase, toRaw, body, kind);
    return new Response(JSON.stringify({ ok: false, code: "disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (b) normalize E.164
  const to = normalizeE164(toRaw);
  if (!to || !body.trim()) {
    return new Response(JSON.stringify({ ok: false, code: "bad_number" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (c) opt-out check
  try {
    const { data: optedOut } = await supabase.rpc("is_sms_opted_out", { p_phone: to });
    if (optedOut === true) {
      return new Response(JSON.stringify({ ok: false, code: "opted_out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (_e) {
    // if the check fails, be safe and refuse to send
    return new Response(JSON.stringify({ ok: false, code: "opted_out" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (d) quiet hours (America/New_York, 8am-9pm)
  if (!withinQuietHoursET()) {
    return new Response(JSON.stringify({ ok: false, code: "quiet_hours" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Send via Twilio REST API
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const form = new URLSearchParams({
    MessagingServiceSid: MSID,
    To: to,
    Body: body,
  });
  const auth = btoa(`${SID}:${TOKEN}`);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = (await resp.json().catch(() => ({}))) as { sid?: string; message?: string };
    await logMessage(supabase, to, body, kind);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, code: "twilio_error", detail: json?.message ?? resp.statusText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: true, sid: json.sid ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, code: "twilio_error", detail: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
