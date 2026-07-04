import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Copy, FileUp, Mail } from "lucide-react";
import { Btn, Card, Eyebrow, Field, Input, PageLoader, Pill, Select, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { HomePageHead, HomeShell, NoHomeYet, useHomeownerGuard } from "@/components/home-shell";
import { InviteProsCard } from "@/components/invite-pros";

export const Route = createFileRoute("/home/add")({
  head: () => ({ meta: [{ title: "Add to your home — HomesBrain" }] }),
  component: AddToHome,
});

const ITEM_TYPES = [
  "Water heater",
  "HVAC system",
  "Water softener",
  "Refrigerator",
  "Washer",
  "Dryer",
  "Dishwasher",
  "Range / oven",
  "Garage door opener",
  "Other",
];

function AddToHome() {
  const navigate = useNavigate();
  const { homeownerId, homeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [knownTrades, setKnownTrades] = useState<string[]>([]);
  const [prosCount, setProsCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Snap-an-item form
  const [itemType, setItemType] = useState(ITEM_TYPES[0]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Attach-a-file (mock, local only)
  const [attached, setAttached] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const { data: jb } = await supabase.from("jobs").select("pro_id").eq("home_id", home.id);
      const proIds = Array.from(new Set((jb ?? []).map((j) => j.pro_id)));
      setProsCount(proIds.length);
      if (proIds.length) {
        const { data: pr } = await supabase.from("pros").select("trade").in("id", proIds);
        setKnownTrades(Array.from(new Set((pr ?? []).map((p) => p.trade))));
      }
    })();
  }, [home]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveItem() {
    if (!home) return;
    setSaving(true);
    await supabase.from("equipment").insert({
      home_id: home.id,
      type: itemType,
      make: make || null,
      model: model || null,
      serial: serial || null,
      source: "self",
    });
    await logEvent(`homeowner:${homeownerId}`, "item_self_added", { type: itemType });
    setSaving(false);
    setToast(`${itemType} added to your home`);
    setMake("");
    setModel("");
    setSerial("");
    setPhotoName(null);
    setTimeout(() => navigate({ to: "/home" }), 1200);
  }

  async function copyInbox() {
    const addr = `home-${home?.id.slice(0, 8)}@in.homesbrain.com`;
    try {
      await navigator.clipboard.writeText(addr);
      setToast("Inbox address copied");
    } catch {
      setToast(addr);
    }
  }

  if (guardLoading) return <PageLoader label="Loading" />;
  if (!home) return <NoHomeYet />;

  const inboxAddr = `home-${home.id.slice(0, 8)}@in.homesbrain.com`;

  return (
    <HomeShell active="add" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Add to your home"
        title="Put it on the record"
        sub="Anything your pros haven't logged yet — appliances, receipts, manuals, or the pros themselves."
      />

      <div className="space-y-6">
        {/* Snap an item */}
        <Card className="anim-fade-up d-1">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-coral" />
            <Eyebrow accent="coral">Snap an item</Eyebrow>
          </div>
          <p className="mt-2 text-sm text-muted">
            Snap the nameplate and fill in what you know. Items your pros log carry the Verified
            badge; yours show as self-added.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="What is it">
              <Select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Photo (optional)">
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
              />
              <Btn
                variant="secondary"
                className="w-full"
                onClick={() => photoRef.current?.click()}
              >
                <Camera size={15} /> {photoName ?? "Snap the nameplate"}
              </Btn>
            </Field>
            <Field label="Make">
              <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Rheem" />
            </Field>
            <Field label="Model">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="XE50T10H45U0"
              />
            </Field>
            <Field label="Serial (optional)">
              <Input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Q231512345"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Btn variant="coral" disabled={saving} onClick={saveItem}>
              {saving ? "Adding…" : "Add to my home"}
            </Btn>
          </div>
        </Card>

        {/* Forward an email */}
        <Card className="anim-fade-up d-2">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-coral" />
            <Eyebrow accent="coral">Forward an email</Eyebrow>
          </div>
          <p className="mt-2 text-sm text-muted">
            Forward a receipt, invoice, or order confirmation and it lands on your record.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <code className="rounded-xl bg-soft px-3 py-2 text-sm font-mono">{inboxAddr}</code>
            <Btn variant="secondary" size="sm" onClick={copyInbox}>
              <Copy size={14} /> Copy
            </Btn>
            <Pill accent="amber">Coming in v0.5</Pill>
          </div>
        </Card>

        {/* Attach a file */}
        <Card className="anim-fade-up d-3">
          <div className="flex items-center gap-2">
            <FileUp size={16} className="text-coral" />
            <Eyebrow accent="coral">Attach a file</Eyebrow>
          </div>
          <p className="mt-2 text-sm text-muted">
            Manuals, warranties, closing documents — keep them with the home, not in a drawer.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const name = e.target.files?.[0]?.name;
                if (name) {
                  setAttached((prev) => [name, ...prev]);
                  setToast(`${name} attached (mock — storage lands in v0.5)`);
                }
              }}
            />
            <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
              <FileUp size={15} /> Choose a file
            </Btn>
            <Pill accent="amber">Coming in v0.5</Pill>
          </div>
          {attached.length > 0 && (
            <div className="mt-3 space-y-2">
              {attached.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="anim-fade-in rounded-xl bg-soft px-3 py-2 text-sm flex items-center justify-between"
                >
                  <span className="font-medium text-ink truncate">{name}</span>
                  <Pill accent="amber">mock</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Invite a pro */}
        <InviteProsCard
          className="anim-fade-up d-4"
          homeId={home.id}
          homeownerId={homeownerId}
          knownTrades={knownTrades}
          prosCount={prosCount}
          onToast={setToast}
        />
      </div>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
