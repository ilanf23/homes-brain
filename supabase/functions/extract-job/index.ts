/* Extract equipment fields + next-service date from a pro's free-text note
   ("What was done") via the Lovable AI gateway. Same pattern as scan-nameplate.

   Two modes:
   - default: extracts equipment + next-service + a clean whatDone sentence.
   - mode: "full": also extracts the customer (name, phone, email) and the
     service address, for the "speak the whole job on one screen" flow. */

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_WORK = `You are helping a home-services pro fill out a service record from a short free-text note about the work they just did.
Extract ONLY what the note clearly says or strongly implies. Never invent brands, models, or dates.
Respond with strict JSON, no markdown, using exactly these keys:
{
  "type": short equipment type (e.g. "Water softener", "Water heater", "Furnace", "AC condenser", "Dishwasher") or null,
  "make": brand name if mentioned (e.g. "EcoWater", "Rheem", "Carrier") or null,
  "model": model number/name if mentioned or null,
  "next_service_date": "YYYY-MM-DD" if the note says when to come back (e.g. "next service in 6 months", "check back in a year"), computed from today = {TODAY}. Only set if a duration or explicit date is present. Otherwise null,
  "charge_amount": a positive number in US dollars if the note clearly states what the pro charged/billed/quoted for THIS job (e.g. "charged 145", "it was $220", "total 89.50", "cost was two hundred bucks"). Numbers only, no currency symbol, no thousands separators. Do NOT infer from prices of parts alone unless clearly the total. Otherwise null,
  "what_done_clean": a tidy one-to-two sentence version of the work performed, in past tense, professional tone, no fluff. Preserve the pro's meaning. Do not add facts.
}`;

const SYSTEM_FULL = `You are helping a home-services pro fill out a whole service record from ONE spoken note that describes who the customer is, where the job was, and what was done.
Extract ONLY what the note clearly says or strongly implies. Never invent names, addresses, brands, models, phone numbers, or dates.
Respond with strict JSON, no markdown, using exactly these keys:
{
  "customer_name": the homeowner's name if mentioned (e.g. "Jane Smith", "the Millers"), else null,
  "customer_phone": phone number if mentioned, digits only or in a normal format, else null,
  "customer_email": email address if mentioned, else null,
  "address": the service street address if mentioned (e.g. "123 Maple St", "123 Maple Street, Austin TX"), else null,
  "type": short equipment type (e.g. "Water softener", "Water heater", "Furnace", "AC condenser", "Dishwasher") or null,
  "make": brand name if mentioned or null,
  "model": model number/name if mentioned or null,
  "next_service_date": "YYYY-MM-DD" if the note says when to come back (e.g. "next service in 6 months", "check back in a year"), computed from today = {TODAY}. Only set if a duration or explicit date is present. Otherwise null,
  "charge_amount": a positive number in US dollars if the note clearly states what the pro charged/billed/quoted for THIS job (e.g. "charged 145", "it was $220", "total 89.50", "cost was two hundred bucks"). Numbers only, no currency symbol, no thousands separators. Otherwise null,
  "what_done_clean": a tidy one-to-two sentence version of the work performed, in past tense, professional tone, no fluff. Preserve the pro's meaning. Do not add facts.
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { note, trade, mode } = await req.json();
    if (typeof note !== "string" || note.trim().length < 3) {
      return json({ error: "Note too short" }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI gateway key not configured" }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const full = mode === "full";
    const prompt = (full ? SYSTEM_FULL : SYSTEM_WORK).replace("{TODAY}", today);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Pro's trade: ${typeof trade === "string" ? trade : "unknown"}\nNote: ${note.trim()}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429)
      return json({ error: "Too many requests. Try again in a moment." }, 429);
    if (resp.status === 402)
      return json({ error: "AI credits exhausted. Add credits in Lovable." }, 402);
    if (!resp.ok) {
      console.error("gateway error", resp.status, await resp.text());
      return json({ error: "Extraction failed. Try again." }, 502);
    }

    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Couldn't parse the note." }, 422);
    }
    const clean = (v: unknown) =>
      typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;

    const cleanAmount = (v: unknown): number | null => {
      const n =
        typeof v === "number"
          ? v
          : typeof v === "string"
            ? parseFloat(v.replace(/[^0-9.\-]/g, ""))
            : NaN;
      return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
    };

    const base = {
      type: clean(fields.type),
      make: clean(fields.make),
      model: clean(fields.model),
      next_service_date: clean(fields.next_service_date),
      charge_amount: cleanAmount(fields.charge_amount),
      what_done_clean: clean(fields.what_done_clean),
    };
    if (!full) return json(base);

    return json({
      ...base,
      customer_name: clean(fields.customer_name),
      customer_phone: clean(fields.customer_phone),
      customer_email: clean(fields.customer_email),
      address: clean(fields.address),
    });
  } catch (e) {
    console.error("extract-job error", e);
    return json({ error: "Extraction failed. Try again." }, 500);
  }
});
