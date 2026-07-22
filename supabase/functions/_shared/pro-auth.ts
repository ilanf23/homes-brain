import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined } };

type AuthenticatedPro = {
  admin: SupabaseClient;
  userId: string;
  pro: {
    id: string;
    business: string;
    logo: string | null;
    owner_first_name: string | null;
  };
};

/** Validate the caller's session JWT, then resolve the only pro row it owns. */
export async function authenticatePro(
  req: Request,
): Promise<AuthenticatedPro | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return null;

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: pro } = await admin
    .from("pros")
    .select("id,business,logo,owner_first_name")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!pro) return null;

  return {
    admin,
    userId: data.user.id,
    pro: {
      id: pro.id,
      business: pro.business ?? "Your service pro",
      logo: pro.logo ?? null,
      owner_first_name: pro.owner_first_name ?? null,
    },
  };
}
