import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, OtpBoxes, Pill, StepBar } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { setSession } from "@/lib/session";
import { HouseScene, LogoMark } from "@/components/svg";

export const Route = createFileRoute("/claim/$recordId")({
  head: () => ({ meta: [{ title: "Claim your home — HomesBrain" }] }),
  component: ClaimFlow,
});

function ClaimFlow() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [homeId, setHomeId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("records")
        .select("jobs!inner(homes(id))")
        .eq("id", recordId)
        .maybeSingle();
      const hid = (data as unknown as { jobs: { homes: { id: string } } } | null)?.jobs?.homes?.id;
      if (hid) setHomeId(hid);
    })();
  }, [recordId]);

  async function complete() {
    if (!homeId) {
      setErr("Record not found");
      return;
    }
    setBusy(true);
    const isEmail = contact.includes("@");
    const { data: ho, error } = await supabase
      .from("homeowners")
      .insert({ email: isEmail ? contact : null, phone: isEmail ? null : contact })
      .select("id")
      .single();
    if (error || !ho) {
      setErr(error?.message ?? "Could not create account");
      setBusy(false);
      return;
    }
    await supabase
      .from("homes")
      .update({ claimed_by_homeowner: ho.id, claimed_at: new Date().toISOString() })
      .eq("id", homeId);
    setSession({ role: "homeowner", homeownerId: ho.id });
    await logEvent(`homeowner:${ho.id}`, "home_claimed", { home_id: homeId, record_id: recordId });
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <LogoMark className="transition-transform duration-300 group-hover:rotate-[-6deg]" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <Pill accent="coral">Claim</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="anim-fade-up">
          <HouseScene active={step === 2 ? "owner" : null} className="w-48 mx-auto mb-2" />
          <StepBar steps={["Claim", "Verify"]} current={step - 1} accent="coral" />
        </div>

        <div key={step} className="anim-fade-up mt-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl tracking-tight">{step === 1 ? "Claim your home" : "Verify"}</h1>
            <p className="mt-2 text-sm text-muted">
              {step === 1
                ? "Free, forever. Yours for life."
                : `We sent a 4-digit code to ${contact}.`}
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
                  />
                </Field>
                <Btn
                  variant="coral"
                  size="lg"
                  className="w-full"
                  disabled={!contact}
                  onClick={() => setStep(2)}
                >
                  Send code
                </Btn>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <Field label="4-digit code" hint="Demo mode — any 4 digits will work.">
                  <div className="mt-2">
                    <OtpBoxes value={otp} onChange={setOtp} accent="coral" />
                  </div>
                </Field>
                {err && (
                  <div
                    role="alert"
                    className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2"
                  >
                    {err}
                  </div>
                )}
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Btn>
                  <Btn
                    variant="coral"
                    size="lg"
                    className="flex-1"
                    disabled={otp.length !== 4 || busy}
                    onClick={complete}
                  >
                    {busy ? "Claiming…" : "Claim my home"}
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
