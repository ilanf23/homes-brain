import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Eyebrow, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { setSession } from "@/lib/session";

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
    if (!homeId) { setErr("Record not found"); return; }
    setBusy(true);
    const isEmail = contact.includes("@");
    const { data: ho, error } = await supabase
      .from("homeowners")
      .insert({ email: isEmail ? contact : null, phone: isEmail ? null : contact })
      .select("id")
      .single();
    if (error || !ho) { setErr(error?.message ?? "Could not create account"); setBusy(false); return; }
    await supabase
      .from("homes")
      .update({ claimed_by_homeowner: ho.id, claimed_at: new Date().toISOString() })
      .eq("id", homeId);
    setSession({ role: "homeowner", homeownerId: ho.id });
    await logEvent(`homeowner:${ho.id}`, "home_claimed", { home_id: homeId, record_id: recordId });
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen bg-soft">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-indigo" />
            <span className="font-extrabold tracking-tight">HomesBrain</span>
          </Link>
          <Pill accent="coral">Claim</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-6">
          <Eyebrow accent="coral">{step === 1 ? "Step 1 of 2" : "Step 2 of 2"}</Eyebrow>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            {step === 1 ? "Claim your home" : "Verify"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {step === 1 ? "Free, forever. Yours for life." : `We sent a 4-digit code to ${contact}.`}
          </p>
        </div>

        <Card>
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Email or phone">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@email.com or 555-555-1234" />
              </Field>
              <Btn variant="coral" size="lg" className="w-full" disabled={!contact} onClick={() => setStep(2)}>
                Send code
              </Btn>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="4-digit code" hint="Demo mode — any 4 digits will work.">
                <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" inputMode="numeric" />
              </Field>
              {err && <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>}
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                <Btn variant="coral" size="lg" className="flex-1" disabled={otp.length !== 4 || busy} onClick={complete}>
                  {busy ? "Claiming…" : "Claim my home"}
                </Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
