import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, notifyPro } from "@/lib/hb";
import { setSession } from "@/lib/session";
import { Logo } from "@/components/svg";
import { CoreLoopScene } from "@/components/core-loop-scene";

export const Route = createFileRoute("/claim/$recordId")({
  head: () => ({ meta: [{ title: "Claim your home - HomesBrain" }] }),
  component: ClaimFlow,
});

// Homeowner claim uses a security-definer RPC so the anon key can create the
// homeowner + link the home even though direct table access is closed.
function ClaimFlow() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function complete() {
    if (!homeId) {
      setErr("Record not found");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_home", {
      p_record_id: recordId,
      p_contact: contact.trim(),
    });
    if (error || !data) {
      setErr(error?.message ?? "Could not create account");
      setBusy(false);
      return;
    }
    const homeownerId = data as string;
    setSession({ role: "homeowner", homeownerId });
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
          <div className="text-center mb-6">
            <h1 className="text-3xl tracking-tight">Claim your home</h1>
            <p className="mt-2 text-sm text-muted">
              {homeAddress ? homeAddress : "Free. Yours for life."}
            </p>
          </div>
          <Card>
            <div className="space-y-4">
              <Field label="Email or phone">
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@email.com or 555-555-1234"
                  autoFocus
                />
              </Field>
              {err && (
                <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>
              )}
              <Btn
                variant="indigo"
                size="lg"
                className="w-full"
                disabled={!contact.trim() || busy}
                onClick={complete}
              >
                {busy ? "Claiming…" : "Claim my home"}
              </Btn>
              <p className="text-center text-[11px] text-muted">
                Free forever. We'll text or email when there's something to know.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
