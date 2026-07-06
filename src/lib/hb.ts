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
