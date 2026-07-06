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
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: pro } = await supabase
        .from("pros")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (pro) {
        await logEvent(`pro:${pro.id}`, "pro_email_verified", {});
        navigate({ to: "/pro" });
      } else {
        navigate({ to: "/login" });
      }
    })();
  }, [navigate]);
  return <PageLoader label="Signing you in" />;
}
