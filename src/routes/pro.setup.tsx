import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill, PageLoader } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { Logo } from "@/components/svg";

/* Post-signup progressive-profile step for pros. Runs after magic-link
   or Google signup once the auth.uid()/pros row exists. Collects the
   remaining basics (business + trade + service area) that the platform
   needs before /pro is useful. Skips itself if already complete. */
export const Route = createFileRoute("/pro/setup")({
  head: () => ({ meta: [{ title: "Set up your business - HomesBrain" }] }),
  component: ProSetup,
});

type TradeOpt = { id: string; label: string };

function ProSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeOpt[]>([]);
  const [business, setBusiness] = useState("");
  const [trade, setTrade] = useState<string>("");
  const [area, setArea] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const [{ data: pro }, { data: tradeRows }] = await Promise.all([
        supabase
          .from("pros")
          .select("id,business,trade,service_area")
          .eq("auth_user_id", user.id)
          .maybeSingle(),
        supabase.from("trades").select("id,label").order("sort_order"),
      ]);
      if (cancelled) return;
      if (!pro) {
        // Shouldn't normally happen: claim-exchange creates the row. Fall
        // back to signup rather than crash.
        navigate({ to: "/pro/signup" });
        return;
      }
      setProId(pro.id);
      setTrades(
        (tradeRows ?? []).map((t) => ({ id: String(t.id), label: String(t.label ?? t.id) })),
      );
      const b = (pro.business ?? "").trim();
      const t = (pro.trade ?? "").trim();
      const a = (pro.service_area ?? "").trim();
      if (b && t && a) {
        navigate({ to: "/pro" });
        return;
      }
      setBusiness(b);
      setTrade(t);
      setArea(a);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const valid = business.trim().length > 1 && trade.length > 0 && area.trim().length > 0;

  async function save() {
    if (!proId || !valid) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("pros")
      .update({
        business: business.trim(),
        trade,
        service_area: area.trim(),
      })
      .eq("id", proId);
    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }
    await logEvent(`pro:${proId}`, "pro_setup_completed", { trade });
    navigate({ to: "/pro" });
  }

  if (loading) return <PageLoader label="Loading your account" />;

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <Pill accent="indigo">For pros</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl tracking-tight">A few last details</h1>
          <p className="mt-2 text-sm text-muted">
            This helps us brand your service records and route reviews.
          </p>
        </div>
        <Card>
          <div className="space-y-4">
            <Field label="Business name">
              <Input
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Aqua Works"
                autoFocus
              />
            </Field>
            <Field label="Trade">
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
              >
                <option value="">Choose your trade…</option>
                {trades.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service area" hint="City or ZIP.">
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Austin, TX"
              />
            </Field>
            {err && (
              <div role="alert" className="text-sm text-red bg-redbg rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!valid}
              loading={saving}
              onClick={save}
            >
              Finish setup
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
