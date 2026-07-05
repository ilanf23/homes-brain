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
    const isEmail = c.includes("@");
    const col = isEmail ? "email" : "phone";

    // If an account already exists for this contact, log in instead.
    const { data: existing } = await supabase
      .from("homeowners")
      .select("id")
      .eq(col, c)
      .maybeSingle();

    if (existing) {
      setSession({ role: "homeowner", homeownerId: existing.id });
      await logEvent(`homeowner:${existing.id}`, "logged_in", { role: "homeowner" });
      navigate({ to: "/home" });
      return;
    }

    const { data, error } = await supabase
      .from("homeowners")
      .insert({
        name: name.trim() || null,
        email: isEmail ? c : null,
        phone: isEmail ? null : c,
      })
      .select("id")
      .single();

    if (error || !data) {
      setErr(error?.message ?? "Could not create account");
      setBusy(false);
      return;
    }

    // Attach a home to this homeowner. Try to claim an existing unclaimed
    // record for the same address first; otherwise create a new one.
    if (addr) {
      const { data: existingHome } = await supabase
        .from("homes")
        .select("id, claimed_by_homeowner")
        .eq("address", addr)
        .maybeSingle();

      if (existingHome && existingHome.claimed_by_homeowner && existingHome.claimed_by_homeowner !== data.id) {
        setErr("That address is already claimed by another homeowner. Sign in or use a different address.");
        setBusy(false);
        return;
      }

      if (existingHome && !existingHome.claimed_by_homeowner) {
        const { error: claimErr } = await supabase
          .from("homes")
          .update({ claimed_by_homeowner: data.id, claimed_at: new Date().toISOString() })
          .eq("id", existingHome.id);
        if (claimErr) {
          setErr(claimErr.message);
          setBusy(false);
          return;
        }
      } else if (!existingHome) {
        const { error: insertErr } = await supabase.from("homes").insert({
          address: addr,
          claimed_by_homeowner: data.id,
          claimed_at: new Date().toISOString(),
        });
        if (insertErr) {
          setErr(insertErr.message);
          setBusy(false);
          return;
        }
      }
    }

    setSession({ role: "homeowner", homeownerId: data.id });
    await logEvent(`homeowner:${data.id}`, "homeowner_signed_up", { has_address: !!addr });
    navigate({ to: "/home" });
  }


  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Homeowners</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="anim-fade-up text-center mb-6">
          <h1 className="text-3xl tracking-tight">Create your home account</h1>
          <p className="mt-2 text-sm text-muted">
            Free for life. Start your home's record, invite pros later.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                autoFocus
              />
            </Field>
            <Field label="Email or phone" hint="You'll use this to log in.">
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@email.com or 555-555-1234"
              />
            </Field>
            <Field label="Home address" hint="Optional. You can add it later from your dashboard.">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Austin, TX"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && contact.trim() && !busy) createAccount();
                }}
              />
            </Field>
            {err && (
              <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!contact.trim() || busy}
              onClick={createAccount}
            >
              {busy ? "Creating…" : "Create account"}
            </Btn>
            <div className="text-center text-xs text-muted">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo hover:underline">
                Log in
              </Link>
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          Have a record link from your pro? Open it to claim your home in one tap.
        </p>
      </div>
    </div>
  );
}
