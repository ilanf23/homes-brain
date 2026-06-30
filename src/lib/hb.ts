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

// Stub recall check — always "no known recalls" for v0 per spec.
export function checkRecall(_make?: string, _model?: string) {
  return {
    status: "none" as const,
    label: "No known recalls, checked today",
    checked_at: new Date().toISOString(),
  };
}

export async function logEvent(actor: string | null, type: string, props: Record<string, unknown> = {}) {
  console.log("[event]", type, { actor, ...props });
  await supabase.from("events").insert({ actor: actor ?? undefined, type, props });
}

export async function mockSend(args: {
  channel: "sms" | "email";
  to: string;
  body: string;
  kind: "record" | "review_request" | "invite" | "other";
}) {
  await supabase.from("messages").insert(args satisfies Record<string, unknown>);
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
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
