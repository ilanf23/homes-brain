import { supabase } from "@/integrations/supabase/client";

/* Thin wrapper around the `send-sms` edge function. Normalizes success/error
   into a single shape so callers can react to the real delivery state
   instead of a generic "check your connection" fallback. */

export type SmsErrorCode =
  | "disabled"
  | "bad_number"
  | "opted_out"
  | "quiet_hours"
  | "twilio_error"
  | "bad_request"
  | "send_failed";

export type SmsResult =
  | { ok: true; sid: string | null }
  | { ok: false; code: SmsErrorCode | string };

export async function sendSms(to: string, body: string, kind = "other"): Promise<SmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { to, body, kind },
    });
    let parsed = data as { ok?: boolean; code?: string; sid?: string | null } | null;
    // On non-2xx the client puts the JSON body on error.context (a Response).
    if (error && !parsed) {
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx && typeof ctx.clone === "function") {
        try {
          parsed = (await ctx.clone().json()) as {
            ok?: boolean;
            code?: string;
            sid?: string | null;
          };
        } catch {
          /* body was not JSON, fall through */
        }
      }
    }
    if (!error && parsed?.ok === true) {
      return { ok: true, sid: parsed.sid ?? null };
    }
    return { ok: false, code: parsed?.code || error?.message || "send_failed" };
  } catch {
    return { ok: false, code: "send_failed" };
  }
}

export function smsErrorMessage(code: string | undefined): string {
  switch (code) {
    case "opted_out":
      return "This number replied STOP. Send by email instead.";
    case "bad_number":
      return "That phone number isn't valid for SMS.";
    case "quiet_hours":
      return "Outside SMS hours (8am–9pm ET). We'll send in the morning.";
    case "disabled":
      return "SMS isn't configured. Only email was sent.";
    case "twilio_error":
    case "send_failed":
    default:
      return "The text didn't go through. Try again in a minute.";
  }
}
