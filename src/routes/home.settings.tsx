import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Eyebrow, Field, Input, KV, PageLoader, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { HomePageHead, HomeShell, NoHomeYet, useHomeownerGuard } from "@/components/home-shell";

export const Route = createFileRoute("/home/settings")({
  head: () => ({ meta: [{ title: "Settings - HomesBrain" }] }),
  component: HomeownerSettings,
});

type Prefs = { reminders: boolean; recalls: boolean; new_records: boolean };
const PREFS_KEY = "hb_homeowner_prefs";
const DEFAULT_PREFS: Prefs = { reminders: true, recalls: true, new_records: true };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Prefs) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

const PREF_ITEMS: { key: keyof Prefs; label: string; sub: string }[] = [
  {
    key: "reminders",
    label: "Service reminders",
    sub: "When something on your home is due for service.",
  },
  { key: "recalls", label: "Recall alerts", sub: "If an item on file is recalled." },
  { key: "new_records", label: "New records", sub: "When a pro logs a job on your home." },
];

function HomeownerSettings() {
  const { homeowner, setHomeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!homeowner) return;
    setName(homeowner.name ?? "");
    setPhone(homeowner.phone ?? "");
    setEmail(homeowner.email ?? "");
    setPrefs(loadPrefs());
  }, [homeowner]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveContact() {
    if (!homeowner) return;
    setSaving(true);
    const { data } = await supabase
      .from("homeowners")
      .update({ name: name || null, phone: phone || null, email: email || null })
      .eq("id", homeowner.id)
      .select("id,name,phone,email")
      .single();
    if (data) setHomeowner(data);
    setSaving(false);
    setToast("Contact info saved");
  }

  function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  if (guardLoading) return <PageLoader label="Loading settings" />;
  if (!home) return <NoHomeYet />;

  return (
    <HomeShell active="settings" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Settings"
        title="Your account"
        sub="How we reach you, and what we reach you about."
      />

      <div className="space-y-6">
        {/* Contact */}
        <Card className="anim-fade-up d-1">
          <Eyebrow accent="indigo">Contact</Eyebrow>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Ellis"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="904-555-0182"
              />
            </Field>
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="jordan@example.com"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Btn variant="indigo" disabled={saving} onClick={saveContact}>
              {saving ? "Saving…" : "Save"}
            </Btn>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="anim-fade-up d-2">
          <Eyebrow accent="indigo">Notifications</Eyebrow>
          <div className="mt-3 divide-y divide-line">
            {PREF_ITEMS.map(({ key, label, sub }) => (
              <div key={key} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-ink text-sm">{label}</div>
                  <div className="text-xs text-muted mt-0.5">{sub}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={label}
                  onClick={() => togglePref(key)}
                  className={`pressable relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                    prefs[key] ? "bg-indigo" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper shadow transition-all duration-200 ${
                      prefs[key] ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Reply STOP to any text to opt out. We only text between 8am and 9pm your time.
          </p>
        </Card>

        {/* Your home */}
        <Card className="anim-fade-up d-3">
          <Eyebrow accent="indigo">Your home</Eyebrow>
          <div className="mt-2">
            <KV k="Address" v={home.address} mono={false} />
            {home.claimed_at && <KV k="Claimed" v={formatDate(home.claimed_at)} />}
            <KV k="Your plan" v="Free for life" mono={false} />
          </div>
          <p className="mt-3 text-sm text-muted">
            This record sells as a $49 seller history report when homes change hands. Yours is
            free for life because your pros write it.
          </p>
        </Card>
      </div>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
