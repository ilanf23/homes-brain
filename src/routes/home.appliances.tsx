import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import {
  Btn,
  Card,
  Eyebrow,
  Field,
  Input,
  PageLoader,
  Pill,
  Select,
  Toast,
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { ShieldCheck } from "@/components/svg";
import {
  HomePageHead,
  HomeShell,
  useHomeownerGuard,
} from "@/components/home-shell";

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
  const { homeownerId, homeowner, home, loading: guardLoading } = useHomeownerGuard();
  const [items, setItems] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  // Add / edit modal state
  const [editing, setEditing] = useState<Appliance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!home) return;
    (async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id,type,make,model,serial,warranty_until,source,created_at")
        .eq("home_id", home.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Appliance[]);
      setLoading(false);
    })();
  }, [home]);

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
    if (!home) return;
    setSaving(true);
    const payload = {
      type: form.type || null,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      serial: form.serial.trim() || null,
      warranty_until: form.warranty_until || null,
    };
    if (editing) {
      const { data, error } = await supabase
        .from("equipment")
        .update(payload)
        .eq("id", editing.id)
        .select("id,type,make,model,serial,warranty_until,source,created_at")
        .single();
      setSaving(false);
      if (error || !data) {
        setToast("Could not save. Try again.");
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === data.id ? (data as Appliance) : it)));
      await logEvent(`homeowner:${homeownerId}`, "item_self_updated", { type: form.type });
      setToast(`${form.type} updated`);
    } else {
      const { data, error } = await supabase
        .from("equipment")
        .insert({ ...payload, home_id: home.id, source: "self" })
        .select("id,type,make,model,serial,warranty_until,source,created_at")
        .single();
      setSaving(false);
      if (error || !data) {
        setToast("Could not add. Try again.");
        return;
      }
      setItems((prev) => [data as Appliance, ...prev]);
      await logEvent(`homeowner:${homeownerId}`, "item_self_added", { type: form.type });
      setToast(`${form.type} added`);
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function remove(a: Appliance) {
    if (!confirm(`Remove ${a.type ?? "this item"} from your home?`)) return;
    const { error } = await supabase.from("equipment").delete().eq("id", a.id);
    if (error) {
      setToast("Could not remove. Try again.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== a.id));
    await logEvent(`homeowner:${homeownerId}`, "item_removed", { type: a.type });
    setToast("Removed");
  }

  if (guardLoading) return <PageLoader label="Loading appliances" />;
  if (!home) return <NoHomeYet />;
  if (loading) return <PageLoader label="Loading appliances" />;

  const verifiedCount = items.filter((i) => i.source === "pro").length;
  const selfCount = items.length - verifiedCount;

  return (
    <HomeShell active="appliances" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Appliances"
        title="Everything in your home"
        sub="Keep every appliance, system, and warranty in one place. Items your pros log carry the Verified badge; yours show as self-added."
        action={
          <Btn variant="indigo" onClick={openAdd}>
            <Plus size={16} /> Add appliance
          </Btn>
        }
      />

      {/* Stat row */}
      <div className="anim-fade-up grid grid-cols-3 gap-3 mb-6">
        {(
          [
            [items.length, "Total items"],
            [verifiedCount, "Verified by pros"],
            [selfCount, "Self-added"],
          ] as const
        ).map(([n, label]) => (
          <Card key={label} className="text-center py-4">
            <div className="text-2xl font-extrabold tracking-tight tnum">{n}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="anim-fade-up text-center py-10">
          <Wrench size={28} className="mx-auto text-indigo" />
          <h2 className="mt-3 text-lg font-bold">No appliances yet</h2>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            Add your water heater, HVAC, appliances, and anything else. Your pros' records will
            show up here too.
          </p>
          <Btn variant="indigo" className="mt-4" onClick={openAdd}>
            <Plus size={16} /> Add your first appliance
          </Btn>
        </Card>
      ) : (
        <Card className="anim-fade-up">
          <div className="flex items-center justify-between">
            <Eyebrow accent="indigo">On file</Eyebrow>
            <span className="text-xs text-muted">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 divide-y divide-line">
            {items.map((a, i) => (
              <div
                key={a.id}
                className="anim-fade-up py-3 flex items-start justify-between gap-3"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Link
                  to="/home/items/$itemId"
                  params={{ itemId: a.id }}
                  className="flex-1 min-w-0 group"
                >
                  <div className="font-semibold text-ink group-hover:text-indigo transition-colors">
                    {a.type ?? "Appliance"}
                  </div>
                  <div className="text-sm text-muted truncate">
                    {[a.make, a.model].filter(Boolean).join(" · ") || "No make / model on file"}
                  </div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                    {a.source === "pro" ? (
                      <span className="inline-flex items-center gap-1 text-indigo font-semibold">
                        <ShieldCheck size={13} animate={false} /> Verified
                      </span>
                    ) : (
                      <Pill accent="amber">Self-added</Pill>
                    )}
                    {a.warranty_until && (
                      <span className="font-mono tnum">
                        Warranty until {formatDate(a.warranty_until)}
                      </span>
                    )}
                    {a.serial && <span className="font-mono tnum">SN {a.serial}</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    aria-label={`Edit ${a.type ?? "appliance"}`}
                    className="pressable p-2 rounded-lg text-muted hover:text-ink hover:bg-soft transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(a)}
                    aria-label={`Remove ${a.type ?? "appliance"}`}
                    className="pressable p-2 rounded-lg text-muted hover:text-red hover:bg-redbg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Link
                    to="/home/items/$itemId"
                    params={{ itemId: a.id }}
                    aria-label={`Open ${a.type ?? "appliance"}`}
                    className="pressable p-2 rounded-lg text-muted hover:text-ink hover:bg-soft transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div
          className="anim-fade-in fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5"
          onClick={() => (!saving ? setShowForm(false) : null)}
        >
          <div
            className="anim-scale-in w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl border border-line shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <Eyebrow accent="indigo">{editing ? "Edit appliance" : "Add appliance"}</Eyebrow>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  {editing ? form.type : "New appliance"}
                </h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <Field label="What is it">
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
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
            <div className="p-5 border-t border-line flex gap-2">
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
          </div>
        </div>
      )}

      {toast && <Toast>{toast}</Toast>}
    </HomeShell>
  );
}
