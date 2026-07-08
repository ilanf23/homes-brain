/* Address geocoding proxy: keeps GOOGLE_MAPS_API_KEY server-side and exposes a
   small set of operations the log-a-job flow needs. Ships in the repo; Lovable
   deploys it on git sync. Set the secret in Supabase (Project Settings -> Edge
   Functions -> Secrets) as GOOGLE_MAPS_API_KEY.

   Ops (JSON body { op, ... }):
     autocomplete { input, lat?, lng?, sessionToken? } -> { predictions: [{ placeId, description }] }
     details      { placeId, sessionToken? }            -> { address, lat, lng }
     reverse      { lat, lng }                          -> { address, lat, lng }
     forward      { address }                           -> { lat, lng }

   Autocomplete + details share a sessionToken so Google bills them as one
   session (much cheaper than per-keystroke). Places API (New) for search,
   Geocoding API for reverse/forward. */

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

type Body = {
  op?: "autocomplete" | "details" | "reverse" | "forward";
  input?: string;
  placeId?: string;
  sessionToken?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return json({ error: "Geocoding key not configured" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    switch (body.op) {
      case "autocomplete": {
        const input = (body.input ?? "").trim();
        if (input.length < 3) return json({ predictions: [] });
        const payload: Record<string, unknown> = {
          input,
          includedRegionCodes: ["us"],
          sessionToken: body.sessionToken,
        };
        if (typeof body.lat === "number" && typeof body.lng === "number") {
          payload.locationBias = {
            circle: { center: { latitude: body.lat, longitude: body.lng }, radius: 30000 },
          };
        }
        const resp = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          console.error("autocomplete error", resp.status, await resp.text());
          return json({ predictions: [], error: "autocomplete_failed" }, 200);
        }
        const data = await resp.json();
        const predictions = (data.suggestions ?? [])
          .map((s: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => {
            const p = s.placePrediction;
            if (!p?.placeId || !p.text?.text) return null;
            return { placeId: p.placeId, description: p.text.text };
          })
          .filter(Boolean);
        return json({ predictions });
      }

      case "details": {
        const placeId = (body.placeId ?? "").trim();
        if (!placeId) return json({ error: "placeId required" }, 400);
        const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
        if (body.sessionToken) url.searchParams.set("sessionToken", body.sessionToken);
        const resp = await fetch(url.toString(), {
          headers: {
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "formattedAddress,location",
          },
        });
        if (!resp.ok) {
          console.error("details error", resp.status, await resp.text());
          return json({ error: "details_failed" }, 502);
        }
        const data = await resp.json();
        return json({
          address: data.formattedAddress ?? null,
          lat: data.location?.latitude ?? null,
          lng: data.location?.longitude ?? null,
        });
      }

      case "reverse": {
        if (typeof body.lat !== "number" || typeof body.lng !== "number") {
          return json({ error: "lat/lng required" }, 400);
        }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.lat},${body.lng}&key=${key}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const hit = data.results?.[0];
        if (!hit) return json({ address: null, lat: body.lat, lng: body.lng });
        return json({
          address: hit.formatted_address ?? null,
          lat: hit.geometry?.location?.lat ?? body.lat,
          lng: hit.geometry?.location?.lng ?? body.lng,
        });
      }

      case "forward": {
        const address = (body.address ?? "").trim();
        if (!address) return json({ error: "address required" }, 400);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const loc = data.results?.[0]?.geometry?.location;
        if (!loc) return json({ lat: null, lng: null });
        return json({ lat: loc.lat, lng: loc.lng });
      }

      default:
        return json({ error: "unknown op" }, 400);
    }
  } catch (e) {
    console.error("geo error", e);
    return json({ error: "geo_failed" }, 500);
  }
});
