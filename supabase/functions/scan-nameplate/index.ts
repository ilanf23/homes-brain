/* Nameplate scan: extracts equipment fields from a photo via the Lovable AI gateway.
   Ships in the repo; Lovable deploys it on git sync. LOVABLE_API_KEY is auto-provisioned
   in Lovable-managed projects. */

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `You are reading a photo of an equipment nameplate / data plate (water softener, water heater, furnace, AC, appliance, etc).
Extract ONLY what is printed on the plate. Respond with strict JSON, no markdown, using exactly these keys:
{
  "type": short equipment type like "Water softener", "Water heater", "Furnace": infer from the brand/model context when clear, else null,
  "make": brand name, else null,
  "model": model number, else null,
  "serial": serial number, else null,
  "warranty_until": "YYYY-MM-DD" ONLY if a warranty end date is explicitly printed, else null
}
If the photo is not a nameplate or nothing is readable, return all nulls.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return json({ error: "Missing image" }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI gateway key not configured" }, 500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (resp.status === 429)
      return json({ error: "Too many scans right now. Try again in a moment." }, 429);
    if (resp.status === 402)
      return json({ error: "AI credits exhausted. Add credits in Lovable." }, 402);
    if (!resp.ok) {
      console.error("gateway error", resp.status, await resp.text());
      return json({ error: "Scan failed. Try again." }, 502);
    }

    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Couldn't read the nameplate. Try a closer, straighter shot." }, 422);
    }

    const clean = (v: unknown) =>
      typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;

    return json({
      type: clean(fields.type),
      make: clean(fields.make),
      model: clean(fields.model),
      serial: clean(fields.serial),
      warranty_until: clean(fields.warranty_until),
    });
  } catch (e) {
    console.error("scan-nameplate error", e);
    return json({ error: "Scan failed. Try again." }, 500);
  }
});
