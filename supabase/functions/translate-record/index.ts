/* Translate the customer-facing dynamic fields shown on Review. Fixed email
   copy is translated deterministically in invite-claim; this function only
   handles the pro-authored work summary and equipment type. */

import { authenticatePro } from "../_shared/pro-auth.ts";
import {
  isSupportedLocale,
  LOCALE_NAMES,
  type SupportedLocale,
} from "../_shared/locales.ts";

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

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if (!result || result.length > max) return null;
  return result;
}

function translationPrompt(locale: SupportedLocale) {
  return `Translate home-service record fields into ${LOCALE_NAMES[locale]}.
Return strict JSON with exactly these keys: {"what_done": string|null, "equipment_type": string|null}.
Preserve meaning and professional tone. Never add facts.
Do not translate personal names, business names, street addresses, email addresses, phone numbers, brand names, product names, model numbers, serial numbers, measurements, or dates.
Keep each null input null. Return JSON only, without markdown.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  try {
    const auth = await authenticatePro(req);
    if (!auth) return json({ ok: false, code: "unauthorized" }, 401);

    const body = await req.json();
    const target = body?.target_locale;
    if (!isSupportedLocale(target)) {
      return json({ ok: false, code: "unsupported_locale" }, 400);
    }

    const whatDone = clean(body?.what_done, 4000);
    const equipmentType = clean(body?.equipment_type, 300);
    if (!whatDone && !equipmentType) {
      return json({ ok: false, code: "nothing_to_translate" }, 400);
    }

    // English is a real translation target: the caller only asks when the
    // record was authored in another language, so never echo the input back.

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" }, 503);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            { role: "system", content: translationPrompt(target) },
            {
              role: "user",
              content: JSON.stringify({
                what_done: whatDone,
                equipment_type: equipmentType,
              }),
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (response.status === 429) {
      return json({ ok: false, code: "rate_limited" }, 429);
    }
    if (response.status === 402) {
      return json({ ok: false, code: "credits_exhausted" }, 402);
    }
    if (!response.ok) {
      console.error(
        "translate-record gateway error",
        response.status,
        await response.text(),
      );
      return json({ ok: false, code: "translation_failed" }, 502);
    }

    const payload = await response.json();
    const raw: string = payload.choices?.[0]?.message?.content ?? "";
    let translated: Record<string, unknown>;
    try {
      translated = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return json({ ok: false, code: "invalid_translation" }, 502);
    }

    const translatedWork = whatDone ? clean(translated.what_done, 4000) : null;
    const translatedEquipment = equipmentType
      ? clean(translated.equipment_type, 300)
      : null;
    if (
      (whatDone && !translatedWork) || (equipmentType && !translatedEquipment)
    ) {
      return json({ ok: false, code: "incomplete_translation" }, 502);
    }

    return json({
      ok: true,
      locale: target,
      what_done: translatedWork,
      equipment_type: translatedEquipment,
    });
  } catch (error) {
    console.error("translate-record error", error);
    return json({ ok: false, code: "translation_failed" }, 500);
  }
});
