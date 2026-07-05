import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar, Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, tradeLabel } from "@/lib/hb";
import { setSession } from "@/lib/session";
import { Logo } from "@/components/svg";

// NOTE: OTP verification is parked until real Supabase OTP auth ships.
// The archived OtpBoxes component lives in @/lib/ui. Restore a "Verify"
// step here (and in signup/claim) when codes are actually sent.

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - HomesBrain" }] }),
  component: Login,
});

type ProMatch = { id: string; business: string; trade: string };
type HomeownerMatch = { id: string; address: string | null };

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState("");
  const [pro, setPro] = useState<ProMatch | null>(null);
  const [homeowner, setHomeowner] = useState<HomeownerMatch | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function complete(role: "pro" | "homeowner", p = pro, ho = homeowner) {
    if (role === "pro" && p) {
      setSession({ role: "pro", proId: p.id });
      await logEvent(`pro:${p.id}`, "logged_in", { role: "pro" });
      navigate({ to: "/pro" });
    } else if (role === "homeowner" && ho) {
      setSession({ role: "homeowner", homeownerId: ho.id });
      await logEvent(`homeowner:${ho.id}`, "logged_in", { role: "homeowner" });
      navigate({ to: "/home" });
    }
  }

  async function logIn() {
    setBusy(true);
    setErr(null);
    const c = contact.trim();
    const isEmail = c.includes("@");
    const col = isEmail ? "email" : "phone";

    const [{ data: p }, { data: ho }] = await Promise.all([
      supabase
        .from("pros")
        .select("id,business,trade")
        .eq(col, c)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("homeowners")
        .select("id, homes!homes_homeowner_fk(address)")
        .eq(col, c)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!p && !ho) {
      setErr(
        isEmail
          ? "No account found for that email."
          : "No account found for that phone. Try it exactly as you entered it when you signed up.",
      );
      setBusy(false);
      return;
    }

    const proMatch = (p as ProMatch | null) ?? null;
    const hoRow = ho as unknown as { id: string; homes: { address: string }[] | null } | null;
    const hoMatch = hoRow ? { id: hoRow.id, address: hoRow.homes?.[0]?.address ?? null } : null;
    setPro(proMatch);
    setHomeowner(hoMatch);

    if (proMatch && hoMatch) {
      setBusy(false);
      setStep(2);
      return;
    }
    complete(proMatch ? "pro" : "homeowner", proMatch, hoMatch);
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Log in</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div key={step} className="anim-fade-up">
          <div className="text-center mb-6">
            <h1 className="text-3xl tracking-tight">
              {step === 1 ? "Welcome back" : "Choose account"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {step === 1
                ? "Enter the email or phone you signed up with."
                : "That contact has two accounts. Where to?"}
            </p>
          </div>

          <Card>
            {step === 1 && (
              <div className="space-y-4">
                <Field label="Email or phone">
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="you@email.com or 555-555-1234"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && contact.trim() && !busy) logIn();
                    }}
                  />
                </Field>
                {err && (
                  <div
                    role="alert"
                    className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2"
                  >
                    {err}
                  </div>
                )}
                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!contact.trim() || busy}
                  onClick={logIn}
                >
                  {busy ? "Logging in…" : "Log in"}
                </Btn>
                <div className="text-center text-xs text-muted">
                  New here?{" "}
                  <Link to="/pro/signup" className="font-semibold text-indigo hover:underline">
                    Pros start free
                  </Link>
                  {" · "}
                  Homeowners join from a record their pro sends.
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {pro && (
                  <button
                    type="button"
                    onClick={() => complete("pro")}
                    className="pressable liftable w-full text-left rounded-xl border border-line bg-paper p-4 flex items-center gap-3 hover:border-indigo transition-colors"
                  >
                    <Avatar name={pro.business} accent="indigo" />
                    <div className="flex-1">
                      <div className="font-semibold text-ink">{pro.business}</div>
                      <div className="text-xs text-muted">{tradeLabel(pro.trade)}</div>
                    </div>
                    <Pill accent="indigo">Pro</Pill>
                  </button>
                )}
                {homeowner && (
                  <button
                    type="button"
                    onClick={() => complete("homeowner")}
                    className="pressable liftable w-full text-left rounded-xl border border-line bg-paper p-4 flex items-center gap-3 hover:border-indigo transition-colors"
                  >
                    <Avatar name={homeowner.address ?? "My home"} accent="indigo" />
                    <div className="flex-1">
                      <div className="font-semibold text-ink">My home</div>
                      <div className="text-xs text-muted">
                        {homeowner.address ?? "No home claimed yet"}
                      </div>
                    </div>
                    <Pill accent="indigo">Homeowner</Pill>
                  </button>
                )}
                <Btn variant="secondary" className="w-full" onClick={() => setStep(1)}>
                  Back
                </Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
