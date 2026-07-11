import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageLoader } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { phIdentify } from "@/lib/posthog";

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

      phIdentify(user.id, { email: user.email ?? undefined });

      // If Google signup path stashed pro-signup intent, create the pros row.
      let pending: {
        intent?: string;
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
        .select("id,business,trade,service_area")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      // New pro coming from the pro signup path (either the legacy full
      // form or the new 2-field intent flow).
      const isProSignup =
        !!pending && (pending.intent === "pro" || (!!pending.business && !!pending.trade));

      if (!existingPro && isProSignup) {
        const firstName =
          pending!.owner_first_name?.trim() ||
          (user.user_metadata?.full_name?.toString().split(" ")[0] ?? null) ||
          null;
        const { data: inserted, error: insertErr } = await supabase
          .from("pros")
          .insert({
            auth_user_id: user.id,
            business: pending!.business?.trim() || null,
            trade: pending!.trade || null,
            service_area: pending!.service_area?.trim() || null,
            email: user.email ?? null,
            plan: "free",
            owner_first_name: firstName,
          })
          .select("id,business,trade,service_area")
          .single();
        localStorage.removeItem("hb_pending_pro_signup");
        if (!insertErr && inserted) {
          await logEvent(`pro:${inserted.id}`, "pro_signed_up", {
            trade: pending!.trade ?? null,
            business: pending!.business ?? null,
            via: "google",
          });
          navigate({ to: "/pro" });
          return;
        }
      }

      // Login role stashed by /login's Homeowner|Pro toggle when the user
      // clicked "Continue with Google". Lets one email hold both account
      // types: picking the other role here creates that row on the spot.
      let loginRole: "pro" | "homeowner" | null = null;
      try {
        const raw = localStorage.getItem("hb_pending_login_role");
        if (raw === "pro" || raw === "homeowner") loginRole = raw;
      } catch {
        // ignore
      }
      if (loginRole) localStorage.removeItem("hb_pending_login_role");

      // If the user chose "Pro" at login and doesn't have a pros row yet,
      // create one via SECURITY DEFINER RPC. Also honors existing pros.
      if (loginRole === "pro") {
        if (!existingPro) {
          const firstName = user.user_metadata?.full_name?.toString().split(" ")[0] ?? null;
          const { error: ensureErr } = await supabase.rpc("pro_ensure", {
            p_first_name: firstName ?? undefined,
          });
          if (ensureErr) console.error("pro_ensure failed", ensureErr);
        }
        await logEvent(`user:${user.id}`, "pro_signed_in", { via: "google" });
        navigate({ to: "/pro" });
        return;
      }

      // Default and explicit-homeowner path. If a pros row exists but no
      // homeowner role was chosen, keep the legacy behavior of routing
      // pros to their dashboard.
      if (existingPro && loginRole !== "homeowner") {
        await logEvent(`pro:${existingPro.id}`, "pro_email_verified", {});
        navigate({ to: "/pro" });
        return;
      }

      // Homeowner (explicit or default). Ensure a homeowners row exists.
      const { error: ensureHoErr } = await supabase.rpc("get_home_view");
      if (ensureHoErr) console.error("get_home_view failed", ensureHoErr);
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
