import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { setSession } from "@/lib/session";
import { Logo } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";

export const Route = createFileRoute("/claim/$recordId")({
  head: () => ({ meta: [{ title: "Claim your home - HomesBrain" }] }),
  component: ClaimFlow,
});

// OTP verification parked until real Supabase OTP ships - see OtpBoxes note in @/lib/ui.
function ClaimFlow() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
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
            celebrate={!!contact}
            className="w-48 mx-auto mb-2"
          />
        </div>

        <div className="anim-fade-up mt-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl tracking-tight">Claim your home</h1>
            <p className="mt-2 text-sm text-muted">Free, forever. Yours for life.</p>
          </div>

          <Card>
            <div className="space-y-4">
              <Field label="Email or phone" hint="You'll use this to log in.">
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@email.com or 555-555-1234"
                  autoFocus
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
                disabled={!contact || busy}
                onClick={complete}
              >
                {busy ? "Claiming…" : "Claim my home"}
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
