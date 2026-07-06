import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/* customer_notes ships in supabase/migrations but the generated Database
   types (types.ts) only refresh on the Lovable sync, so access goes through
   this one untyped cast, same pattern as src/lib/invoices.ts. */
const db = supabase as unknown as SupabaseClient;
const notes = () => db.from("customer_notes");

export type CustomerNote = {
  id: string;
  pro_id: string;
  customer_id: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

export async function listNotes(proId: string, customerId: string): Promise<CustomerNote[]> {
  const { data } = await notes()
    .select("*")
    .eq("pro_id", proId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomerNote[];
}

export async function addNote(args: {
  proId: string;
  customerId: string;
  body: string;
}): Promise<CustomerNote | null> {
  const { data, error } = await notes()
    .insert({ pro_id: args.proId, customer_id: args.customerId, body: args.body })
    .select("*")
    .single();
  return error ? null : (data as CustomerNote);
}

export async function deleteNote(note: Pick<CustomerNote, "id" | "pro_id">): Promise<boolean> {
  const { error } = await notes().delete().eq("id", note.id).eq("pro_id", note.pro_id);
  return !error;
}
