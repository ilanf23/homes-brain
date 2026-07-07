import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn, Field, Input } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "@/components/svg";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password - HomesBrain" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts an access token in the URL hash and fires
    // a PASSWORD_RECOVERY event when the client picks it up.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasRecovery(true);
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      // If the hash carries type=recovery, the client has already exchanged it.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery") || data.session) setHasRecovery(true);
      setReady(true);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function updatePassword() {
    setBusy(true);
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      setBusy(false);
      return;
    }
    if (password !== confirmPw) {
      setErr("Passwords don't match.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
    setTimeout(() => navigate({ to: "/pro" }), 1500);
  }

  return (
    <AuthShell>
      {!ready && <div className="text-sm text-muted">Loading…</div>}
      {ready && done && (
        <div className="text-center space-y-3">
          <ShieldCheck size={36} className="mx-auto text-indigo" />
          <h1 className="text-2xl tracking-tight">Password updated</h1>
          <p className="text-sm text-muted">Redirecting you to your dashboard…</p>
        </div>
      )}
      {ready && !done && hasRecovery && (
        <div className="space-y-4">
          <h1 className="text-2xl tracking-tight">Set a new password</h1>
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {err && <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>}
          <Btn
            variant="indigo"
            size="lg"
            className="w-full"
            loading={busy}
            onClick={updatePassword}
          >
            Update password
          </Btn>
        </div>
      )}
      {ready && !done && !hasRecovery && (
        <div className="space-y-3 text-center">
          <h1 className="text-2xl tracking-tight">Reset link required</h1>
          <p className="text-sm text-muted">
            Open the reset link from your email to set a new password. If it expired, request a new
            one on the login page.
          </p>
          <Link to="/login">
            <Btn variant="indigo" className="w-full">
              Back to login
            </Btn>
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
