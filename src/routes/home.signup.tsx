import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { setSession } from "@/lib/session";
import { logEvent } from "@/lib/hb";
import { Logo } from "@/components/svg";

export const Route = createFileRoute("/home/signup")({
  head: () => ({ meta: [{ title: "Create your home account - HomesBrain" }] }),
  component: HomeownerSignup,
});

function HomeownerSignup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createAccount() {
    setBusy(true);
    setErr(null);
    const c = contact.trim();
    const addr = address.trim();

    // If an account already exists for this contact, log in instead.
    const { data: existing } = await supabase.rpc("get_homeowner_by_contact", { p_contact: c });
    if (existing) {
      const match = existing as { id: string };
      setSession({ role: "homeowner", homeownerId: match.id });
      await logEvent(`homeowner:${match.id}`, "logged_in", { role: "homeowner" });
      navigate({ to: "/home" });
      return;
    }

    const { data, error } = await supabase.rpc("homeowner_signup", {
      p_contact: c,
      p_address: addr || "",
    });
    if (error || !data) {
      setErr(error?.message ?? "Could not create account");
      setBusy(false);
      return;
    }
    const homeownerId = data as string;

    // Save name via profile update if provided (address is set by the RPC).
    if (name.trim()) {
      await supabase.rpc("homeowner_update_profile", {
        p_homeowner_id: homeownerId,
        p_name: name.trim(),
      });
    }

    setSession({ role: "homeowner", homeownerId });
    await logEvent(`homeowner:${homeownerId}`, "homeowner_signed_up", { has_address: !!addr });
    navigate({ to: "/home" });
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
          <div className="space-y-4">
            <Field label="Your name (optional)">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
            </Field>
            <Field label="Email or phone">
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@email.com or 555-555-1234"
              />
            </Field>
            <Field label="Home address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Austin, TX"
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
              onClick={createAccount}
            >
              {busy ? "Creating…" : "Create free account"}
            </Btn>
            <p className="text-center text-xs text-muted">
              Already have a record link from a pro?{" "}
              <Link to="/login" className="font-semibold text-indigo hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
