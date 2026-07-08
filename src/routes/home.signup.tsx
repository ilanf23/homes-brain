import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { logEvent } from "@/lib/hb";
import { Logo } from "@/components/svg";

export const Route = createFileRoute("/home/signup")({
  head: () => ({ meta: [{ title: "Create your home account - HomesBrain" }] }),
  component: HomeownerSignup,
});

const PENDING_KEY = "hb_pending_signup";

/* Homeowner signup via magic link. If a session already exists on mount
   (return-from-email), finish setup with the address/name stashed in
   localStorage and hop to /home. */
function HomeownerSignup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      setFinishing(true);
      let pending: { name?: string; address?: string; consent?: boolean } = {};
      try {
        pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "{}");
      } catch {
        // ignore
      }
      const { data, error } = await supabase.rpc("homeowner_signup", {
        p_address: pending.address ?? "",
        p_marketing_consent: pending.consent ?? false,
      });
      if (error || !data) {
        setErr(error?.message ?? "Could not finish signup");
        setFinishing(false);
        return;
      }
      const homeownerId = data as string;
      if (pending.name && pending.name.trim()) {
        await supabase.rpc("homeowner_update_profile", { p_name: pending.name.trim() });
      }
      await logEvent(`homeowner:${homeownerId}`, "homeowner_signed_up", {
        has_address: !!pending.address,
      });
      localStorage.removeItem(PENDING_KEY);
      navigate({ to: "/home" });
    };
    finish();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") finish();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function sendLink() {
    setBusy(true);
    setErr(null);
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ name: name.trim(), address: address.trim(), consent }),
    );
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/home/signup` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setLinkSent(email.trim());
    setBusy(false);
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">For homeowners</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-6">
          <h1 className="text-3xl tracking-tight">Start your home's record</h1>
          <p className="mt-2 text-sm text-muted">Free. Yours for life. No card.</p>
        </div>
        <Card>
          {finishing ? (
            <div className="py-6 text-center text-sm text-muted">Finishing your account…</div>
          ) : linkSent ? (
            <div className="space-y-3">
              <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
                Check your email at <span className="font-semibold">{linkSent}</span> and click
                the link to finish creating your account.
              </div>
              <p className="text-center text-[11px] text-muted">
                The link opens this page again and completes signup automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Your name (optional)">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Home address (optional)">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Austin, TX"
                />
              </Field>
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I agree to receive service records and updates about my home.</span>
              </label>
              {err && (
                <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>
              )}
              <Btn
                variant="indigo"
                size="lg"
                className="w-full"
                disabled={!email.trim() || busy}
                onClick={sendLink}
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </Btn>
              <p className="text-center text-xs text-muted">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-indigo hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
