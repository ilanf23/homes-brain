// sms-inbound: Twilio inbound webhook. Parses form-encoded From/Body,
// tracks opt-out/opt-in in sms_optouts, and replies with TwiML so the
// carrier delivers the auto-reply. Twilio also handles STOP natively,
// but we mirror it so the app never texts an opted-out number.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const XML_HEADERS = { "Content-Type": "text/xml; charset=utf-8" };

function twiml(message: string | null): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: XML_HEADERS });
}

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "UNSTOP", "YES", "JOIN"]);
const HELP_WORDS = new Set(["HELP", "INFO"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return twiml(null);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let from = "";
  let body = "";
  try {
    const form = await req.formData();
    from = (form.get("From") ?? "").toString();
    body = (form.get("Body") ?? "").toString();
  } catch {
    return twiml(null);
  }

  const keyword = body.trim().toUpperCase();
  const phone = from.trim();
  if (!phone) return twiml(null);

  if (STOP_WORDS.has(keyword)) {
    try {
      await supabase
        .from("sms_optouts")
        .upsert(
          { phone, opted_out_at: new Date().toISOString(), resubscribed_at: null },
          { onConflict: "phone" },
        );
    } catch (_e) {
      // fall through: still send the courtesy reply
    }
    return twiml(
      "You're unsubscribed from HomesBrain texts and won't receive more. Reply START to resubscribe.",
    );
  }

  if (START_WORDS.has(keyword)) {
    try {
      await supabase
        .from("sms_optouts")
        .upsert(
          { phone, resubscribed_at: new Date().toISOString() },
          { onConflict: "phone" },
        );
    } catch (_e) {
      // ignore
    }
    return twiml("You're resubscribed to HomesBrain texts. Reply STOP to opt out.");
  }

  if (HELP_WORDS.has(keyword)) {
    return twiml(
      "HomesBrain: service records & reminders for your home. Help: support@homesbrain.com. Msg & data rates may apply. Reply STOP to opt out.",
    );
  }

  // Unknown keyword: no auto-reply (silent).
  return twiml(null);
});
