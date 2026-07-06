import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, notifyPro } from "@/lib/hb";
import { Logo } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";

export const Route = createFileRoute("/claim/$recordId")({
  head: () => ({ meta: [{ title: "Claim your home - HomesBrain" }] }),
  component: ClaimFlow,
});

/* Homeowner claim: real Supabase magic-link auth. On authenticated return,
   the browser lands back on this same URL and we call claim_home with the
   record id. The RPC uses auth.uid() - no client-passed identity. */
function ClaimFlow() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_record", { p_record_id: recordId });
      const rec = data as {
        job?: { pro?: { id: string } | null; home?: { id: string; address: string } | null };
      } | null;
      if (rec?.job?.home) {
        setHomeId(rec.job.home.id);
        setHomeAddress(rec.job.home.address);
      }
      if (rec?.job?.pro) setProId(rec.job.pro.id);
    })();
  }, [recordId]);

  // If the user is already signed in (or returns from a magic link), claim
  // automatically and navigate to the home dashboard.
  useEffect(() => {
    let cancelled = false;
    const attempt = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      setClaiming(true);
      const consentPref = localStorage.getItem("hb_claim_consent") === "1";
      const { data, error } = await supabase.rpc("claim_home", {
        p_record_id: recordId,
        p_marketing_consent: consentPref,
      });
      if (error || !data) {
        setErr(error?.message ?? "Could not claim home");
        setClaiming(false);
        return;
      }
      const homeownerId = data as string;
      await logEvent(`homeowner:${homeownerId}`, "home_claimed", {
        home_id: homeId,
        record_id: recordId,
      });
      if (proId) {
        await notifyPro(
          proId,
          "home_claimed",
          "Home claimed",
          homeAddress
            ? `${homeAddress} was claimed by the homeowner`
            : "A homeowner claimed their home from your record",
          { home_id: homeId, record_id: recordId, homeowner_id: homeownerId },
        );
      }
      localStorage.removeItem("hb_claim_consent");
      navigate({ to: "/home" });
    };
    attempt();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") attempt();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [recordId, homeId, proId, homeAddress, navigate]);

  async function sendMagicLink() {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    localStorage.setItem("hb_claim_consent", consent ? "1" : "0");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/claim/${recordId}` },
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
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Claim</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="anim-fade-up">
          <CoreLoopScene
            variant="compact"
            pose="owner"
            celebrate={!!email || !!linkSent}
            className="w-48 mx-auto mb-2"
          />
          <div className="text-center mb-6">
            <h1 className="text-3xl tracking-tight">Claim your home</h1>
            <p className="mt-2 text-sm text-muted">
              {homeAddress ? homeAddress : "Free. Yours for life."}
            </p>
          </div>
          <Card>
            {claiming ? (
              <div className="py-6 text-center text-sm text-muted">Claiming your home…</div>
            ) : linkSent ? (
              <div className="space-y-3">
                <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
                  Check your email at <span className="font-semibold">{linkSent}</span> and click
                  the link to finish claiming your home.
                </div>
                <p className="text-center text-[11px] text-muted">
                  The link opens this page again and completes the claim automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoFocus
                  />
                </Field>
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to receive service records and updates about my home.
                  </span>
                </label>
                {err && (
                  <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>
                )}
                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!email.trim() || busy}
                  onClick={sendMagicLink}
                >
                  {busy ? "Sending…" : "Email me a claim link"}
                </Btn>
                <p className="text-center text-[11px] text-muted">
                  Free forever. We'll email you when there's something to know.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
