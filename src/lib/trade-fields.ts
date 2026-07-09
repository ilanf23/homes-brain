import { supabase } from "@/integrations/supabase/client";

/* Trade-driven equipment field config. Both tables are public-read and can be
   edited in the database without a code deploy - the log-a-job form and the
   homeowner item page both render whatever is active. */

export type TradeInputType = "text" | "number" | "select" | "date" | "toggle";

export type TradeOption = { id: string; label: string; sort_order: number };

export type TradeField = {
  id: string;
  trade_id: string;
  key: string;
  label: string;
  input_type: TradeInputType;
  options: string[] | null;
  unit: string | null;
  required: boolean;
  help: string | null;
  sort_order: number;
};

/* Untyped client: trades / trade_fields aren't in the generated Database types
   until the next Lovable sync. Keep all reads in this file. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as unknown as { from: (table: string) => any };

export async function fetchTrades(): Promise<TradeOption[]> {
  try {
    const { data } = await untyped
      .from("trades")
      .select("id,label,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as TradeOption[];
  } catch {
    return [];
  }
}

export async function fetchTradeFields(tradeId: string): Promise<TradeField[]> {
  if (!tradeId) return [];
  try {
    const { data } = await untyped
      .from("trade_fields")
      .select("id,trade_id,key,label,input_type,options,unit,required,help,sort_order")
      .eq("trade_id", tradeId)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((f: TradeField & { options: unknown }) => ({
      ...f,
      options: Array.isArray(f.options) ? (f.options as string[]) : null,
    })) as TradeField[];
  } catch {
    return [];
  }
}

/* Fetch every field def across all trades, so the homeowner item view can look
   up labels/units for whatever keys were stored on equipment.attributes. */
export async function fetchAllTradeFields(): Promise<TradeField[]> {
  try {
    const { data } = await untyped
      .from("trade_fields")
      .select("id,trade_id,key,label,input_type,options,unit,required,help,sort_order");
    return (data ?? []).map((f: TradeField & { options: unknown }) => ({
      ...f,
      options: Array.isArray(f.options) ? (f.options as string[]) : null,
    })) as TradeField[];
  } catch {
    return [];
  }
}

/* Turn a stored attribute value into a display string. */
export function formatAttrValue(value: unknown, field?: TradeField): string {
  if (value === null || value === undefined || value === "") return "";
  if (field?.input_type === "toggle") return value ? "Yes" : "No";
  if (field?.input_type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
  }
  const base = String(value);
  return field?.unit ? `${base} ${field.unit}` : base;
}

/* Humanize a snake_case key when we don't have a field definition to consult. */
export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
