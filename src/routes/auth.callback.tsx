import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageLoader } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in - HomesBrain" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      // Supabase client picks up the tokens from the URL hash on load.
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      // Read one-tap claim record from ?claim=<recordId> (set by the
      // invite-claim email's magic link).
      const params =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const claimRecordId = params?.get("claim") ?? null;

      if (!user) {
        // Magic link expired or already used. Route back to login with the
        // context so we can offer a fresh one-tap link that still claims
        // the right record.
        const hashParams =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
            : null;
        const stashedEmail = hashParams?.get("email") ?? "";
        const search: Record<string, string> = { note: "expired" };
        if (claimRecordId) search.claim = claimRecordId;
        if (stashedEmail) search.email = stashedEmail;
        navigate({ to: "/login", search });
        return;
      }

      // If Google signup path stashed pro-signup intent, create the pros row.
      let pending: {
        business?: string;
        owner_first_name?: string;
        trade?: string;
        service_area?: string;
      } | null = null;
      try {
        const raw = localStorage.getItem("hb_pending_pro_signup");
        if (raw) pending = JSON.parse(raw);
      } catch {
        // ignore
      }

      const { data: existingPro } = await supabase
        .from("pros")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!existingPro && pending?.business && pending?.trade) {
        const { data: inserted, error: insertErr } = await supabase
          .from("pros")
          .insert({
            auth_user_id: user.id,
            business: pending.business,
            trade: pending.trade,
            service_area: pending.service_area ?? null,
            email: user.email ?? null,
            plan: "free",
            owner_first_name: pending.owner_first_name ?? null,
          })
          .select("id")
          .single();
        localStorage.removeItem("hb_pending_pro_signup");
        if (!insertErr && inserted) {
          await logEvent(`pro:${inserted.id}`, "pro_signed_up", {
            trade: pending.trade,
            business: pending.business,
            via: "google",
          });
          navigate({ to: "/pro" });
          return;
        }
      }

      if (existingPro) {
        await logEvent(`pro:${existingPro.id}`, "pro_email_verified", {});
        navigate({ to: "/pro" });
        return;
      }
      // Default: homeowner. Auto-claim the home linked to the emailed
      // record so first-tap lands on their own home, not empty state.
      if (claimRecordId) {
        const { error: claimErr } = await supabase.rpc("claim_home", {
          p_record_id: claimRecordId,
        });
        if (claimErr) console.error("claim_home failed", claimErr);
        else await logEvent(`user:${user.id}`, "home_claimed", { record_id: claimRecordId });
      }
      await logEvent(`user:${user.id}`, "homeowner_signed_in", {});
      navigate({ to: "/home" });
    })();
  }, [navigate]);
  return <PageLoader label="Signing you in" />;
}
