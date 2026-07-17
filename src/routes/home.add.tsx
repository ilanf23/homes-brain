import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, FileUp, Mail, Plus, Users, Wrench } from "lucide-react";
import { Btn, Field, Input, PageLoader, Select, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { BottomSheet } from "@/components/bottom-sheet";

export const Route = createFileRoute("/home/add")({
  head: () => ({ meta: [{ title: "Add to your home - HomesBrain" }] }),
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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  // Appliance form
  const [itemType, setItemType] = useState(ITEM_TYPES[0]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAppliance, setShowAppliance] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveItem() {
    if (!home || !homeownerId) return;
    setSaving(true);
    const { error } = await supabase.rpc("homeowner_add_equipment", {
      p_type: itemType,
      p_make: make,
      p_model: model,
      p_serial: serial,
      p_warranty_until: null as unknown as string,
      p_source: "self",
    });
    setSaving(false);
    if (error) {
      setToast("Could not add. Try again.");
      return;
    }
    await logEvent(`homeowner:${homeownerId}`, "item_self_added", { type: itemType });
    setToast(`${itemType} added to your home`);
    setMake("");
    setModel("");
    setSerial("");
    setShowAppliance(false);
    setTimeout(() => navigate({ to: "/home" }), 1200);
  }

  if (guardLoading) return <PageLoader label="Loading" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  return (
    <HomeShell active="add" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Add to your home"
        title="What do you want to add?"
        sub="Choose one. You can always add more later."
      />

      <div className="anim-fade-up grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setShowAppliance(true)}
          className="pressable flex min-h-[150px] items-center gap-4 rounded-[26px] border border-line bg-paper p-5 text-left shadow-[0_18px_42px_-36px_rgba(22,22,15,0.7)] hover:border-indigo/30"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-indigobg text-indigo">
            <Wrench size={29} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold text-ink">An appliance</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">
              Add its make, model, and serial.
            </span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-muted" />
        </button>

        <Link
          to="/home/pros"
          className="pressable flex min-h-[150px] items-center gap-4 rounded-[26px] border border-line bg-paper p-5 text-left shadow-[0_18px_42px_-36px_rgba(22,22,15,0.7)] hover:border-indigo/30"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-indigobg text-indigo">
            <Users size={29} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold text-ink">A home pro</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">
              Find or invite someone you trust.
            </span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-muted" />
        </Link>
      </div>

      <div className="anim-fade-up d-2 mt-5 flex items-center justify-center gap-4 rounded-2xl bg-soft px-4 py-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Mail size={17} /> Email
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <FileUp size={17} /> Documents
        </span>
        <span className="font-semibold text-ink">Coming soon</span>
      </div>

      <BottomSheet
        open={showAppliance}
        onClose={() => {
          if (!saving) setShowAppliance(false);
        }}
        title="Add an appliance"
      >
        <div className="space-y-4 p-5">
          <Field label="What is it">
            <Select value={itemType} onChange={(e) => setItemType(e.target.value)}>
              {ITEM_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
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
        <div className="sticky bottom-0 border-t border-line bg-paper p-5">
          <Btn variant="indigo" size="lg" className="w-full" disabled={saving} onClick={saveItem}>
            <Plus size={18} /> {saving ? "Adding…" : "Add to my home"}
          </Btn>
        </div>
      </BottomSheet>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
