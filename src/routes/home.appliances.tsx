import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { Btn, Card, Field, Input, PageLoader, Pill, Select, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { ShieldCheck } from "@/components/svg";
import { BottomSheet } from "@/components/bottom-sheet";
import { ApplianceIcon } from "@/components/appliance-icon";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";

export const Route = createFileRoute("/home/appliances")({
  head: () => ({ meta: [{ title: "Appliances - HomesBrain" }] }),
  component: Appliances,
});

const ITEM_TYPES = [
  "Water heater",
  "HVAC system",
  "Furnace",
  "Air conditioner",
  "Water softener",
  "Water filter",
  "Refrigerator",
  "Freezer",
  "Washer",
  "Dryer",
  "Dishwasher",
  "Range / oven",
  "Microwave",
  "Garbage disposal",
  "Garage door opener",
  "Sump pump",
  "Well pump",
  "Generator",
  "Other",
];

type Appliance = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  serial: string | null;
  warranty_until: string | null;
  source: string;
  created_at: string;
};

type FormState = {
  type: string;
  make: string;
  model: string;
  serial: string;
  warranty_until: string;
};

const emptyForm: FormState = {
  type: ITEM_TYPES[0],
  make: "",
  model: "",
  serial: "",
  warranty_until: "",
};

function Appliances() {
  const navigate = useNavigate();
  const {
    homeownerId,
    homeowner,
    home,
    equipment,
    loading: guardLoading,
    refresh,
  } = useHomeownerGuard();
  const items = equipment as unknown as Appliance[];
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  const [editing, setEditing] = useState<Appliance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(a: Appliance) {
    setEditing(a);
    setForm({
      type: a.type ?? ITEM_TYPES[0],
      make: a.make ?? "",
      model: a.model ?? "",
      serial: a.serial ?? "",
      warranty_until: a.warranty_until ?? "",
    });
    setShowForm(true);
  }

  async function saveForm() {
    if (!home || !homeownerId) return;
    setSaving(true);
    if (editing) {
      const { error } = await supabase.rpc("homeowner_update_equipment", {
        p_equipment_id: editing.id,
        p_type: form.type || "",
        p_make: form.make.trim(),
        p_model: form.model.trim(),
        p_serial: form.serial.trim(),
        p_warranty_until: form.warranty_until || (null as unknown as string),
      });
      setSaving(false);
      if (error) {
        setToast("Could not save. Try again.");
        return;
      }
      await refresh();
      await logEvent(`homeowner:${homeownerId}`, "item_self_updated", { type: form.type });
      setToast(`${form.type} updated`);
    } else {
      const { error } = await supabase.rpc("homeowner_add_equipment", {
        p_type: form.type || "",
        p_make: form.make.trim(),
        p_model: form.model.trim(),
        p_serial: form.serial.trim(),
        p_warranty_until: form.warranty_until || (null as unknown as string),
        p_source: "self",
      });
      setSaving(false);
      if (error) {
        setToast("Could not add. Try again.");
        return;
      }
      await refresh();
      await logEvent(`homeowner:${homeownerId}`, "item_self_added", { type: form.type });
      setToast(`${form.type} added`);
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function remove(a: Appliance) {
    if (!homeownerId) return;
    if (!confirm(`Remove ${a.type ?? "this item"} from your home?`)) return;
    const { error } = await supabase.rpc("homeowner_delete_equipment", {
      p_equipment_id: a.id,
    });
    if (error) {
      setToast("Could not remove. Try again.");
      return;
    }
    await refresh();
    await logEvent(`homeowner:${homeownerId}`, "item_removed", { type: a.type });
    setToast("Removed");
  }

  if (guardLoading) return <PageLoader label="Loading appliances" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  const verifiedCount = items.filter((i) => i.source === "pro").length;
  const selfCount = items.length - verifiedCount;

  return (
    <HomeShell active="appliances" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Appliances"
        title="Everything in your home"
        sub="Tap any item to see its details, warranty, and complete service history."
        action={
          <Btn variant="indigo" size="lg" onClick={openAdd}>
            <Plus size={16} /> Add appliance
          </Btn>
        }
      />

      <div className="anim-fade-up mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold">
        <span className="rounded-full bg-indigobg px-3 py-1.5 text-indigo">
          {items.length} on file
        </span>
        {verifiedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-ink ring-1 ring-line">
            <ShieldCheck size={14} animate={false} /> {verifiedCount} verified
          </span>
        )}
        {selfCount > 0 && <span className="text-muted">{selfCount} added by you</span>}
      </div>

      {items.length === 0 ? (
        <Card className="anim-fade-up text-center !py-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-indigobg text-indigo">
            <Wrench size={30} />
          </span>
          <h2 className="mt-4 text-xl font-bold">No appliances yet</h2>
          <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
            Add your water heater, HVAC, appliances, and anything else. Your pros' records will show
            up here too.
          </p>
          <Btn variant="indigo" size="lg" className="mt-5" onClick={openAdd}>
            <Plus size={16} /> Add your first appliance
          </Btn>
        </Card>
      ) : (
        <div className="anim-fade-up grid gap-3 sm:grid-cols-2">
          {items.map((a, i) => (
            <div
              key={a.id}
              className="anim-fade-up overflow-hidden rounded-[22px] border border-line bg-paper shadow-[0_16px_34px_-32px_rgba(22,22,15,0.7)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                to="/home/items/$itemId"
                params={{ itemId: a.id }}
                className="pressable block min-h-[154px] p-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigobg text-indigo">
                    <ApplianceIcon type={a.type} size={24} />
                  </span>
                  {a.source === "pro" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo">
                      <ShieldCheck size={14} animate={false} /> Verified
                    </span>
                  ) : (
                    <Pill accent="amber">Added by you</Pill>
                  )}
                </div>
                <div className="mt-5 text-lg font-bold text-ink group-hover:text-indigo transition-colors">
                  {a.type ?? "Appliance"}
                </div>
                <div className="mt-0.5 text-sm text-muted truncate">
                  {[a.make, a.model].filter(Boolean).join(" · ") || "No make / model on file"}
                </div>
                {a.warranty_until && (
                  <div className="mt-2 text-xs font-semibold text-muted tnum">
                    Warranty until {formatDate(a.warranty_until)}
                  </div>
                )}
              </Link>
              <div className="flex items-center border-t border-line bg-soft/60 p-1.5">
                <button
                  onClick={() => openEdit(a)}
                  aria-label={`Edit ${a.type ?? "appliance"}`}
                  className="pressable flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-ink hover:bg-paper transition-colors"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  onClick={() => remove(a)}
                  aria-label={`Remove ${a.type ?? "appliance"}`}
                  className="pressable flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted hover:text-red hover:bg-redbg transition-colors"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit form */}
      <BottomSheet
        open={showForm}
        onClose={() => {
          if (!saving) setShowForm(false);
        }}
        title={editing ? `Edit ${form.type}` : "Add an appliance"}
      >
        <div className="p-5 space-y-4">
          <Field label="What is it">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Make">
              <Input
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="Rheem"
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="XE50T10H45U0"
              />
            </Field>
          </div>
          <Field label="Serial (optional)">
            <Input
              value={form.serial}
              onChange={(e) => setForm({ ...form, serial: e.target.value })}
              placeholder="Q231512345"
            />
          </Field>
          <Field label="Warranty until (optional)">
            <Input
              type="date"
              value={form.warranty_until}
              onChange={(e) => setForm({ ...form, warranty_until: e.target.value })}
            />
          </Field>
        </div>
        <div className="sticky bottom-0 p-5 border-t border-line bg-paper flex gap-2">
          <Btn
            variant="secondary"
            className="flex-1"
            onClick={() => setShowForm(false)}
            disabled={saving}
          >
            Cancel
          </Btn>
          <Btn
            variant="indigo"
            className="flex-1"
            onClick={saveForm}
            disabled={saving || !form.type}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add to my home"}
          </Btn>
        </div>
      </BottomSheet>

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
