import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";

/* The invoices table ships in supabase/migrations but the generated
   Database types (types.ts) only refresh on the Lovable sync, so all
   access goes through this one untyped cast and the hand-written types
   below. Delete the cast once types.ts includes invoices. */
const db = supabase as unknown as SupabaseClient;
const invoices = () => db.from("invoices");

export type InvoiceItem = { description: string; amount: number };
export type InvoiceStatus = "open" | "paid" | "void";

export type Invoice = {
  id: string;
  pro_id: string;
  customer_id: string;
  home_id: string;
  job_id: string | null;
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
};

export type ProInvoice = Invoice & {
  customers: { name: string } | null;
  homes: { address: string } | null;
};

export type HomeInvoice = Invoice & {
  pros: { business: string; trade: string; stripe_charges_enabled: boolean } | null;
};

export function invoiceTotal(items: InvoiceItem[]) {
  return items.reduce((sum, it) => sum + (Number.isFinite(it.amount) ? it.amount : 0), 0);
}

export function isOverdue(inv: Pick<Invoice, "status" | "due_date">) {
  if (inv.status !== "open" || !inv.due_date) return false;
  return new Date(inv.due_date + "T23:59:59") < new Date();
}

export function formatMoney(n: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(n);
}

export async function listInvoicesForPro(proId: string): Promise<ProInvoice[]> {
  const { data } = await invoices()
    .select("*,customers(name),homes(address)")
    .eq("pro_id", proId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProInvoice[];
}

export async function listInvoicesForCustomer(
  proId: string,
  customerId: string,
): Promise<Invoice[]> {
  const { data } = await invoices()
    .select("*")
    .eq("pro_id", proId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Invoice[];
}

export async function listInvoicesForHome(homeId: string): Promise<HomeInvoice[]> {
  const { data } = await invoices()
    .select("*,pros(business,trade,stripe_charges_enabled)")
    .eq("home_id", homeId)
    .neq("status", "void")
    .order("created_at", { ascending: false });
  return (data ?? []) as HomeInvoice[];
}

export async function createInvoice(args: {
  proId: string;
  customerId: string;
  homeId: string;
  jobId?: string | null;
  items: InvoiceItem[];
  dueDate?: string | null;
  note?: string | null;
}): Promise<Invoice | null> {
  const { data, error } = await invoices()
    .insert({
      pro_id: args.proId,
      customer_id: args.customerId,
      home_id: args.homeId,
      job_id: args.jobId ?? null,
      items: args.items,
      total: invoiceTotal(args.items),
      due_date: args.dueDate || null,
      note: args.note || null,
    })
    .select("*")
    .single();
  if (error) return null;
  const inv = data as Invoice;
  await logEvent(args.proId, "invoice_created", {
    invoice_id: inv.id,
    customer_id: args.customerId,
    job_id: args.jobId ?? null,
    total: inv.total,
  });
  return inv;
}

export async function markInvoicePaid(inv: Pick<Invoice, "id" | "pro_id" | "total">) {
  const { error } = await invoices()
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", inv.id)
    .eq("pro_id", inv.pro_id);
  if (!error) {
    await logEvent(inv.pro_id, "invoice_paid", { invoice_id: inv.id, total: inv.total });
  }
  return !error;
}

export async function voidInvoice(inv: Pick<Invoice, "id" | "pro_id">) {
  const { error } = await invoices()
    .update({ status: "void" })
    .eq("id", inv.id)
    .eq("pro_id", inv.pro_id);
  if (!error) {
    await logEvent(inv.pro_id, "invoice_voided", { invoice_id: inv.id });
  }
  return !error;
}
