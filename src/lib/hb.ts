import { supabase } from "@/integrations/supabase/client";

export const TRADES = [
  { id: "water_treatment", label: "Water treatment" },
  { id: "hvac", label: "HVAC" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "appliance", label: "Appliance repair" },
] as const;

export type TradeId = (typeof TRADES)[number]["id"];

export function tradeLabel(id?: string | null) {
  return TRADES.find((t) => t.id === id)?.label ?? id ?? "";
}

export function suggestTradeGaps(have: string[]): TradeId[] {
  const all = TRADES.map((t) => t.id);
  return all.filter((t) => !have.includes(t)) as TradeId[];
}

// Stub recall check - always "no known recalls" for v0 per spec.
export function checkRecall(_make?: string, _model?: string) {
  return {
    status: "none" as const,
    label: "No known recalls, checked today",
    checked_at: new Date().toISOString(),
  };
}

export async function logEvent(
  actor: string | null,
  type: string,
  props: Record<string, unknown> = {},
) {
  console.log("[event]", type, { actor, ...props });
  await supabase.from("events").insert({ actor: actor ?? undefined, type, props: props as never });
}

export type NotificationType =
  | "connect_request"
  | "rebook_request"
  | "home_claimed"
  | "record_viewed";

export type ProNotification = {
  id: string;
  pro_id: string;
  type: NotificationType;
  title: string;
  detail: string | null;
  props: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/* The notifications table is not in the Lovable-generated Database types yet
   (types.ts regenerates on sync), so these helpers go through an untyped view
   of the client. Keep every notifications query in this file. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as unknown as { from: (table: string) => any };

/* Fire-and-forget: a failed notification must never break the homeowner's flow. */
export async function notifyPro(
  proId: string,
  type: NotificationType,
  title: string,
  detail?: string | null,
  props: Record<string, unknown> = {},
) {
  try {
    await untyped.from("notifications").insert({ pro_id: proId, type, title, detail, props });
  } catch (e) {
    console.warn("[notifyPro] failed", e);
  }
}

export async function fetchNotifications(proId: string, limit = 15) {
  try {
    const { data } = await untyped
      .from("notifications")
      .select("id,pro_id,type,title,detail,props,read_at,created_at")
      .eq("pro_id", proId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as ProNotification[];
  } catch {
    return [];
  }
}

export async function markNotificationsRead(proId: string) {
  try {
    await untyped
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("pro_id", proId)
      .is("read_at", null);
  } catch {
    /* non-fatal */
  }
}

/* ---- Customer map geocoding ----
   homes.lat/lng/geocoded_at ship in supabase/migrations but the generated
   Database types only refresh on the Lovable sync, so these helpers go
   through the same untyped cast as the notifications helpers above. */

export type ProHome = {
  id: string;
  address: string;
  claimed_at: string | null;
  lat: number | null;
  lng: number | null;
  geocoded_at: string | null;
};

/* Free Nominatim geocoding. Policy: identify the app (email param, since a
   browser fetch cannot set User-Agent) and stay at or under 1 request/second.
   Callers are responsible for sequencing; this never throws. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&email=ilanfridman23%40gmail.com&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const hit = rows?.[0];
    if (!hit) return null;
    const lat = Number.parseFloat(hit.lat);
    const lng = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/* Reverse geocode via Nominatim. Returns a compact street address string. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&email=ilanfridman23%40gmail.com&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        house_number?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
      };
    };
    const a = data.address;
    if (a) {
      const street = [a.house_number, a.road].filter(Boolean).join(" ");
      const locality = a.city || a.town || a.village || "";
      const parts = [street, locality, a.state].filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

/* Normalize an address for loose comparison (lowercase, collapse whitespace,
   strip punctuation). Two addresses that normalize equally are considered the
   same home for the geolocation match. */
export function normalizeAddress(a: string): string {
  return a
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Great-circle distance between two lat/lng points, in meters. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}



/* Geocode one home and persist the result. geocoded_at is stamped even on
   failure so bad addresses are not retried every visit. Never throws. */
export async function geocodeHome(
  homeId: string,
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address);
  try {
    await untyped
      .from("homes")
      .update({
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", homeId);
  } catch (e) {
    console.warn("[geocodeHome] failed", e);
  }
  return coords;
}

export async function fetchProHomes(proId: string): Promise<ProHome[]> {
  try {
    const { data } = await untyped
      .from("homes")
      .select("id,address,claimed_at,lat,lng,geocoded_at")
      .eq("created_by_pro", proId)
      .order("claimed_at", { ascending: false });
    return (data ?? []) as ProHome[];
  } catch {
    return [];
  }
}

/* Lazy backfill: geocode up to `limit` ungeocoded homes, sequentially,
   1 second apart (Nominatim rate limit). Calls onUpdate after each home
   so pins can appear without a reload. */
export async function backfillHomeGeocodes(
  homes: ProHome[],
  onUpdate: (home: ProHome) => void,
  limit = 5,
): Promise<void> {
  const targets = homes.filter((h) => !h.geocoded_at).slice(0, limit);
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000));
    const h = targets[i];
    const coords = await geocodeHome(h.id, h.address);
    onUpdate({
      ...h,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      geocoded_at: new Date().toISOString(),
    });
  }
}

export async function mockSend(args: {
  channel: "sms" | "email";
  to: string;
  body: string;
  kind: "record" | "review_request" | "invite" | "other";
}) {
  await supabase.from("messages").insert({
    channel: args.channel,
    to_contact: args.to,
    body: args.body,
    kind: args.kind,
  });
}

/* Accepts a pasted Google Maps / business link and returns a normalized https URL,
   or null when it is not a recognizable Google link. Stored in pros.google_place_id
   until the real Places integration lands (nothing parses that column as a place ID). */
export function normalizeGoogleUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const ok =
    host === "maps.app.goo.gl" ||
    host === "g.page" ||
    host === "share.google" ||
    (host === "goo.gl" && path.startsWith("/maps")) ||
    (host === "search.google.com" && path.startsWith("/local/writereview")) ||
    (/(^|\.)google\.[a-z.]{2,6}$/.test(host) && path.startsWith("/maps"));
  if (!ok) return null;
  url.protocol = "https:";
  return url.toString();
}

/* True when a stored google_place_id value is actually a link we can send people to
   (older stub rows hold "demo_place_id", which is not). */
export function isGoogleUrl(value?: string | null): value is string {
  return !!value && value.startsWith("https://");
}

export function buildRecordUrl(recordId: string) {
  if (typeof window === "undefined") return `/r/${recordId}`;
  return `${window.location.origin}/r/${recordId}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
