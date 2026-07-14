/* HomesBrain AI record edit: the pro says in plain words what to change on a
   saved service record ("the date was July 3", "it was a Rheem water heater")
   and the model applies it to the record's fields. The client shows the diff
   and the pro confirms before anything is written. Same gateway pattern as
   extract-job. */

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

const SYSTEM = `You are HomesBrain AI. A home-services pro wants to fix a service record they already saved. You get the record's current fields and the pro's instruction in plain words.
Apply the instruction to the fields. Change ONLY what the instruction clearly asks to change. Never invent brands, models, dates, or work that was not mentioned. Keep the pro's meaning and wording where possible.
Today is {TODAY}. Use it for relative dates like "yesterday", "last Tuesday", or "in 6 months".
Respond with strict JSON, no markdown, using exactly these keys, and return ALL of them every time (keep the original value for anything the instruction does not mention):
{
  "understood": true if you could apply at least part of the instruction, else false,
  "note": a short plain-words sentence if something could not be applied or was unclear, else null,
  "what_done": the work description, past tense, 1-2 plain sentences,
  "done_date": "YYYY-MM-DD" the day the job was done,
  "next_service_date": "YYYY-MM-DD" or null,
  "equipment_type": short equipment type (e.g. "Water heater", "Water softener") or null,
  "equipment_make": brand name or null,
  "equipment_model": model number/name or null
}`;

type Fields = {
  what_done: string | null;
  done_date: string | null;
  next_service_date: string | null;
  equipment_type: string | null;
  equipment_make: string | null;
  equipment_model: string | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { instruction, fields } = await req.json();
    if (typeof instruction !== "string" || instruction.trim().length < 3) {
      return json({ error: "Tell me what to change first." }, 400);
    }
    if (!fields || typeof fields !== "object") {
      return json({ error: "Missing record fields" }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI gateway key not configured" }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const current = fields as Fields;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM.replace("{TODAY}", today) },
          {
            role: "user",
            content: `CURRENT RECORD FIELDS:\n${JSON.stringify(current, null, 2)}\n\nPRO'S INSTRUCTION:\n${instruction.trim()}`,
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
      return json({ error: "Couldn't apply that. Try again." }, 502);
    }

    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    let out: Record<string, unknown>;
    try {
      out = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Couldn't apply that. Try saying it a different way." }, 422);
    }

    const clean = (v: unknown) =>
      typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;
    /* A malformed date must never overwrite a good one: fall back to the
       current value instead. */
    const cleanDate = (v: unknown, fallback: string | null) => {
      const s = clean(v);
      return s && YMD.test(s) ? s : fallback;
    };

    return json({
      understood: out.understood !== false,
      note: clean(out.note),
      what_done: clean(out.what_done) ?? current.what_done,
      done_date: cleanDate(out.done_date, current.done_date),
      next_service_date:
        clean(out.next_service_date) === null
          ? null
          : cleanDate(out.next_service_date, current.next_service_date),
      equipment_type: clean(out.equipment_type),
      equipment_make: clean(out.equipment_make),
      equipment_model: clean(out.equipment_model),
    });
  } catch (e) {
    console.error("edit-record error", e);
    return json({ error: "Couldn't apply that. Try again." }, 500);
  }
});
