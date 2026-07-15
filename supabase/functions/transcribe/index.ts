/* Voice transcription: turns a recorded audio clip into text via the Lovable AI
   gateway. Same key/pattern as scan-nameplate and extract-job. Used by log-a-job
   so the transcript is accurate and handles mixed-language speech (an English
   name inside a Russian sentence), which the browser Web Speech API cannot.
   Ships in the repo; Lovable deploys it on git sync. */

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ---- Upstream call (swap this block if the gateway path/model differs) ----
   The gateway is OpenAI-compatible; transcription uses the audio endpoint with
   the gateway's default transcription model. Kept isolated because it is the
   one thing that cannot be verified without a live round-trip. */
const TRANSCRIBE_ENDPOINT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
/* A hard language lock biases the model and can transliterate/mangle a foreign
   proper noun (e.g. an English name spoken inside Russian) - the exact case this
   feature exists to fix. Default off; rely on auto-detect + code-switching. Flip
   to true (and it uses the locale below) only if auto-detect proves worse. */
const HINT_LANGUAGE = false;
const ISO_639_1: Record<string, string> = { en: "en", es: "es", ru: "ru", uk: "uk" };

/* Guard against clips large enough to time out the gateway. ~24MB of base64 is
   roughly 18MB of audio, minutes of Opus - well past a job note. */
const MAX_BASE64_LEN = 24_000_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* Pick a filename extension from the recorder's MIME type. The transcription
   model infers the audio format from the extension, so this must be right. */
function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio, mime, locale } = await req.json();
    if (typeof audio !== "string" || audio.length < 32) {
      return json({ error: "Missing audio" }, 400);
    }
    if (audio.length > MAX_BASE64_LEN) {
      return json({ error: "Recording too long. Keep it under a couple of minutes." }, 413);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI gateway key not configured" }, 500);

    const contentType = typeof mime === "string" && mime ? mime : "audio/webm";
    const bytes = decodeBase64(audio);
    const filename = `audio.${extForMime(contentType)}`;

    const form = new FormData();
    form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: contentType }), filename);
    form.append("model", TRANSCRIBE_MODEL);
    form.append("response_format", "json");
    const langCode = typeof locale === "string" ? ISO_639_1[locale] : undefined;
    if (HINT_LANGUAGE && langCode) form.append("language", langCode);

    const resp = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      // No Content-Type header: fetch sets the multipart boundary from FormData.
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (resp.status === 429)
      return json({ error: "Too many requests. Try again in a moment." }, 429);
    if (resp.status === 402)
      return json({ error: "AI credits exhausted. Add credits in Lovable." }, 402);
    if (!resp.ok) {
      console.error("gateway error", resp.status, await resp.text());
      return json({ error: "Transcription failed. Try again." }, 502);
    }

    const data = await resp.json();
    const text: string = typeof data?.text === "string" ? data.text : "";
    return json({ text: text.trim() });
  } catch (e) {
    console.error("transcribe error", e);
    return json({ error: "Transcription failed. Try again." }, 500);
  }
});
