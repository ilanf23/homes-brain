import { supabase } from "@/integrations/supabase/client";
import { forwardGeocode } from "@/lib/geo";
import { phCapture } from "@/lib/posthog";

export const TRADES = [
  { id: "water_treatment", label: "Water treatment" },
  { id: "hvac", label: "HVAC" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "appliance", label: "Appliance repair" },
  { id: "roofing", label: "Roofing" },
  { id: "pest_control", label: "Pest control" },
  { id: "landscaping", label: "Landscaping & lawn" },
  { id: "pool", label: "Pool & spa" },
  { id: "garage_door", label: "Garage door" },
  { id: "solar", label: "Solar" },
  { id: "chimney", label: "Chimney & fireplace" },
  { id: "septic", label: "Septic" },
  { id: "cleaning", label: "Cleaning" },
  { id: "handyman", label: "Handyman" },
  { id: "painting", label: "Painting" },
  { id: "flooring", label: "Flooring" },
  { id: "window_cleaning", label: "Window cleaning" },
  { id: "gutter", label: "Gutters" },
  { id: "pressure_washing", label: "Pressure washing" },
  { id: "irrigation", label: "Irrigation" },
  { id: "security", label: "Security & smart home" },
  { id: "carpentry", label: "Carpentry" },
  { id: "fencing", label: "Fencing" },
  { id: "masonry", label: "Masonry" },
  { id: "insulation", label: "Insulation" },
  { id: "locksmith", label: "Locksmith" },
  { id: "tree_care", label: "Tree care" },
] as const;

export type TradeId = (typeof TRADES)[number]["id"];

export function tradeLabel(id?: string | null) {
  return TRADES.find((t) => t.id === id)?.label ?? id ?? "";
}

/* Pros can now have multiple trades. The `trades` array is the source of truth;
   the legacy `trade` scalar is kept as the "primary" (first) trade for existing
   surfaces (SEO route, shell subtitle, log-a-job form) that still expect one. */
export function primaryTrade(input: {
  trades?: string[] | null;
  trade?: string | null;
}): string | null {
  const arr = input.trades ?? [];
  if (arr.length > 0) return arr[0];
  return input.trade ?? null;
}

export function proTrades(input: { trades?: string[] | null; trade?: string | null }): string[] {
  const arr = input.trades ?? [];
  if (arr.length > 0) return arr;
  return input.trade ? [input.trade] : [];
}

export function suggestTradeGaps(have: string[]): TradeId[] {
  const all = TRADES.map((t) => t.id);
  return all.filter((t) => !have.includes(t)) as TradeId[];
}

/* US phone helpers. formatPhone is idempotent - safe on stored formatted values. */
export function phoneDigits(value: string): string {
  let d = (value ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.slice(0, 10);
}

export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

export async function logEvent(
  actor: string | null,
  type: string,
  props: Record<string, unknown> = {},
) {
  console.log("[event]", type, { actor, ...props });
  // Mirror to PostHog when enabled (no-op otherwise).
  phCapture(type, { actor, ...props });
  // Events insert is authenticated-only (RLS); anonymous callers get a silent
  // 401 that we swallow so analytics never breaks a user flow.
  try {
    await supabase
      .from("events")
      .insert({ actor: actor ?? undefined, type, props: props as never });
  } catch {
    /* swallow */
  }
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

/* A unit already installed at a home, as offered to a pro who is about to log a
   job there. Identity and service cadence only: never the other pro's notes,
   never who they are. */
export type HomeUnit = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  attributes: Record<string, string | boolean> | null;
  last_job_at: string | null;
  job_count: number;
};

/* Units on file at an address, for any signed-in pro.

   Keyed on the ADDRESS, not on the pro's own customer list: a home is shared
   across pros, so the plumber a homeowner just invited must see the softener
   the water-treatment pro logged, even though they have never worked here. RLS
   cannot answer that (pro_serves_home is false until they have a row on the
   home), hence the security-definer RPC.

   Returns null (not []) when the RPC is unavailable, so the caller can tell
   "this home has no units" from "we could not ask" and fall back. Migrations
   ship through Lovable, so the client can run against a database that does not
   have the function yet. */
export async function fetchHomeUnits(address: string): Promise<HomeUnit[] | null> {
  const trimmed = address.trim();
  if (!trimmed) return [];
  // RPC added in migration 2026-07-14; cast until the Lovable-generated
  // Database types refresh.
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>
  )("home_units_for_address", { p_address: trimmed });
  if (error || !Array.isArray(data)) return null;
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    type: (r.type as string | null) ?? null,
    make: (r.make as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    warranty_until: (r.warranty_until as string | null) ?? null,
    attributes:
      r.attributes && typeof r.attributes === "object"
        ? (r.attributes as Record<string, string | boolean>)
        : null,
    last_job_at: (r.last_job_at as string | null) ?? null,
    job_count: Number(r.job_count ?? 0),
  }));
}

/* Units on a home the pro already serves, read straight from the table under
   RLS. This is the pre-RPC path: it only works once the pro has a customer, job,
   or created-home row on the home, so it cannot see a home they are new to. Kept
   as the fallback for when home_units_for_address is not deployed yet. */
export async function fetchHomeUnitsByHomeId(homeId: string): Promise<HomeUnit[]> {
  const { data } = await supabase
    .from("equipment")
    .select("id,type,make,model,warranty_until,attributes,jobs(created_at)")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const jobs = (r as { jobs?: { created_at: string }[] }).jobs ?? [];
    const last =
      jobs
        .map((j) => j.created_at)
        .sort()
        .at(-1) ?? null;
    const attrs = (r as { attributes?: unknown }).attributes;
    return {
      id: r.id as string,
      type: (r.type as string | null) ?? null,
      make: (r.make as string | null) ?? null,
      model: (r.model as string | null) ?? null,
      warranty_until: (r.warranty_until as string | null) ?? null,
      attributes:
        attrs && typeof attrs === "object" ? (attrs as Record<string, string | boolean>) : null,
      last_job_at: last,
      job_count: jobs.length,
    } satisfies HomeUnit;
  });
}

/* Normalize an address for loose comparison (lowercase, collapse whitespace,
   strip punctuation). Two addresses that normalize equally are considered the
   same home for the geolocation match. */
export function normalizeAddress(a: string): string {
  return a.toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();
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

/* Geocode one home and persist the result. Pass `known` coords (e.g. from a
   Places details lookup the user already made) to skip the geocode call.
   geocoded_at is stamped even on failure so bad addresses are not retried every
   visit. Never throws. */
export async function geocodeHome(
  homeId: string,
  address: string,
  known?: { lat: number; lng: number } | null,
): Promise<{ lat: number; lng: number } | null> {
  const coords = known ?? (await forwardGeocode(address));
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
   ~1 second apart to stay polite to the geocoding API. Calls onUpdate after
   each home so pins can appear without a reload. */
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
  // Real sends go through the invite-claim edge function (service role).
  // The messages table is server-only now, so this client-side log is a
  // no-op preserved for legacy callers.
  console.log("[mockSend]", args.channel, args.kind, args.to);
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

/* Records no longer have a public shareable page. We keep this helper so the
   `records.public_url` column (NOT NULL) stays populated, but every link now
   points the homeowner into their own dashboard. */
export function buildRecordUrl(_recordId: string) {
  if (typeof window === "undefined") return `/home`;
  return `${window.location.origin}/home`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(iso?: string | null, locale?: string) {
  if (!iso) return "";
  // A bare YYYY-MM-DD is a calendar date, not a UTC timestamp. Parsing it as
  // UTC shifts it to the prior day in US time zones.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Turn a snake/kebab/space string into Title Case. */
function toTitleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Clean, human, title-cased headline for a service record.
 * Prefers "<Equipment type> service" when equipment exists; otherwise
 * a trimmed, title-cased version of the pro's raw note.
 */
export function recordTitle(
  whatDone: string | null | undefined,
  equipmentType?: string | null,
): string {
  const eq = equipmentType?.trim();
  if (eq) return `${toTitleCase(eq)} service`;
  const raw = (whatDone ?? "").trim();
  if (!raw) return "Service record";
  const cleaned = raw.replace(/\s+/g, " ");
  const short = cleaned.length > 80 ? cleaned.slice(0, 77).trimEnd() + "…" : cleaned;
  // Sentence-ish title case: capitalize each word but preserve common
  // small words lowercase (except first).
  const small = new Set(["a", "an", "and", "of", "the", "for", "to", "on", "in", "with"]);
  const words = short.split(" ").filter(Boolean);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower[0]?.toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
