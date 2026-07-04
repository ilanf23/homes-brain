import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { TRADES } from "@/lib/hb";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/settings")({
  head: () => ({ meta: [{ title: "Settings — HomesBrain" }] }),
  component: ProSettings,
});

function ProSettings() {
  const { proId, pro, setPro } = useProGuard();
  const [business, setBusiness] = useState("");
  const [trade, setTrade] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!pro) return;
    setBusiness(pro.business);
    setTrade(pro.trade);
    setArea(pro.service_area ?? "");
  }, [pro]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!pro || !proId) {
    return (
      <ProShell pro={pro} active="settings">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  const dirty =
    business !== pro.business || trade !== pro.trade || area !== (pro.service_area ?? "");

  async function save() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("pros")
      .update({ business, trade, service_area: area })
      .eq("id", proId!);
    if (error) {
      setErr(error.message);
    } else {
      setPro({ ...pro!, business, trade, service_area: area });
      setToast("Saved");
    }
    setSaving(false);
  }

  async function toggleGoogle() {
    setBusyGoogle(true);
    setErr(null);
    const connecting = !pro!.google_place_id;
    // Stub connect, same as signup — real Google Business OAuth comes later.
    const patch = connecting
      ? { google_place_id: "demo_place_id", google_rating: 4.8 }
      : { google_place_id: null, google_rating: null };
    const { error } = await supabase.from("pros").update(patch).eq("id", proId!);
    if (error) {
      setErr(error.message);
    } else {
      setPro({ ...pro!, ...patch });
      setToast(connecting ? "Google connected" : "Google disconnected");
    }
    setBusyGoogle(false);
  }

  return (
    <ProShell pro={pro} active="settings">
      <ProPageHead
        eyebrow="Settings"
        title="Business profile"
        sub="What homeowners see on every record you send."
      />

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-5 items-start max-w-4xl">
        <Card className="anim-fade-up d-1">
          <Eyebrow accent="teal">Basics</Eyebrow>
          <div className="mt-4 space-y-4">
            <Field label="Business name">
              <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
            </Field>
            <div>
              <div className="text-sm font-semibold text-ink mb-2">Trade</div>
              <div className="grid grid-cols-2 gap-2">
                {TRADES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrade(t.id)}
                    aria-pressed={trade === t.id}
                    className={`pressable text-left rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                      trade === t.id
                        ? "border-teal bg-tealbg text-teal shadow-sm"
                        : "border-line bg-paper text-ink hover:bg-soft hover:border-ink/20"
                    }`}
                  >
                    <TradeIcon
                      trade={t.id}
                      size={18}
                      className={trade === t.id ? "text-teal" : "text-muted"}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Service area" hint="City or ZIP.">
              <Input value={area} onChange={(e) => setArea(e.target.value)} />
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-3">
                <Avatar name={business || "?"} accent="teal" />
                <div className="text-xs text-muted">
                  Using initials for now. Upload comes later.
                </div>
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
            <Btn
              variant="teal"
              size="lg"
              className="w-full"
              loading={saving}
              disabled={!dirty || !business}
              onClick={save}
            >
              Save changes
            </Btn>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Google Business</Eyebrow>
            {pro.google_place_id ? (
              <div className="mt-3">
                <div className="rounded-xl border border-teal/30 bg-tealbg/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={22} className="text-teal" />
                    <div>
                      <div className="font-semibold text-ink">Connected</div>
                      <div className="text-xs text-muted tnum">
                        Rating {pro.google_rating ?? "—"} ★
                      </div>
                    </div>
                  </div>
                  <Pill accent="teal">Live</Pill>
                </div>
                <button
                  onClick={toggleGoogle}
                  disabled={busyGoogle}
                  className="mt-3 text-xs font-semibold text-muted hover:text-red transition-colors"
                >
                  {busyGoogle ? "Working…" : "Disconnect"}
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-muted">
                  Route review asks to your Google profile and show your rating on every record.
                </p>
                <Btn
                  variant="indigo"
                  className="w-full mt-3"
                  loading={busyGoogle}
                  onClick={toggleGoogle}
                >
                  Connect Google
                </Btn>
              </div>
            )}
          </Card>

          <Card className="anim-fade-up d-3">
            <Eyebrow accent="teal">Plan</Eyebrow>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-ink capitalize">{pro.plan}</div>
                <div className="text-xs text-muted">Unlimited records. No card required.</div>
              </div>
              <Pill accent="teal">Current</Pill>
            </div>
          </Card>
        </div>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
