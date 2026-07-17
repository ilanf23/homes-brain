import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, QrCode, Sparkles } from "lucide-react";
import { Btn, Card, Field, Input, Pill, Textarea, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPhone, logEvent } from "@/lib/hb";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { ClaimQRModal } from "@/components/claim-qr-modal";
import { listJobMedia, signJobMedia, type JobMediaRow } from "@/lib/media";
import { RecordMedia } from "@/components/job-media";

export const Route = createFileRoute("/pro/records/$recordId")({
  head: () => ({ meta: [{ title: "Record - HomesBrain" }] }),
  component: RecordDetail,
});

type EquipmentRow = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
};

type RecordRow = {
  id: string;
  created_at: string;
  sent_sms_at: string | null;
  sent_email_at: string | null;
  viewed_at: string | null;
  jobs: {
    id: string;
    home_id: string;
    what_done: string;
    created_at: string;
    next_service_date: string | null;
    pro_id: string;
    customers: { id: string; name: string; phone: string | null; email: string | null } | null;
    homes: { address: string; claimed_at: string | null } | null;
    equipment: EquipmentRow | null;
  } | null;
};

type EqDraft = { type: string; make: string; model: string };

/* The fields the pro can change, as plain strings for tap-editing and for the
   HomesBrain AI round trip. Dates are calendar days in the pro's time zone. */
function localYMD(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA");
}

function eqLabel(eq: { type?: string | null; make?: string | null; model?: string | null } | null) {
  if (!eq) return null;
  const main = eq.type?.trim() || null;
  const rest = [eq.make, eq.model].filter(Boolean).join(" ");
  if (main && rest) return `${main} · ${rest}`;
  return main || rest || null;
}

type Sheet = "what" | "date" | "next" | "equipment" | null;

type Proposal = {
  rows: { label: string; from: string; to: string }[];
  jobPatch: { what_done?: string; created_at?: string; next_service_date?: string | null };
  eq: EqDraft | null;
};

function RecordDetail() {
  const { recordId } = Route.useParams();
  const { proId, pro } = useProGuard();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [media, setMedia] = useState<JobMediaRow[]>([]);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftEq, setDraftEq] = useState<EqDraft>({ type: "", make: "", model: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(
          "id,created_at,sent_sms_at,sent_email_at,viewed_at,jobs!inner(id,home_id,what_done,created_at,next_service_date,pro_id,customers(id,name,phone,email),homes(address,claimed_at),equipment(id,type,make,model))",
        )
        .eq("id", recordId)
        .eq("jobs.pro_id", proId)
        .maybeSingle();
      setRecord(data as unknown as RecordRow | null);
      const jobId = (data as unknown as RecordRow | null)?.jobs?.id;
      if (jobId) setMedia(await signJobMedia(await listJobMedia([jobId])));
      setLoading(false);
    })();
  }, [proId, recordId]);

  const job = record?.jobs ?? null;

  function patchJob(patch: Partial<NonNullable<RecordRow["jobs"]>>) {
    setRecord((r) => (r && r.jobs ? { ...r, jobs: { ...r.jobs, ...patch } } : r));
  }

  async function saveJob(patch: {
    what_done?: string;
    created_at?: string;
    next_service_date?: string | null;
  }): Promise<boolean> {
    if (!job) return false;
    const { error } = await supabase.from("jobs").update(patch).eq("id", job.id);
    if (error) return false;
    patchJob(patch);
    return true;
  }

  async function saveEquipment(draft: EqDraft): Promise<boolean> {
    if (!job) return false;
    const fields = {
      type: draft.type.trim() || null,
      make: draft.make.trim() || null,
      model: draft.model.trim() || null,
    };
    if (job.equipment?.id) {
      const { error } = await supabase.from("equipment").update(fields).eq("id", job.equipment.id);
      if (error) return false;
      patchJob({ equipment: { ...job.equipment, ...fields } });
      return true;
    }
    const { data, error } = await supabase
      .from("equipment")
      .insert({ home_id: job.home_id, ...fields, source: "pro" } as never)
      .select("id")
      .single();
    if (error || !data) return false;
    const { error: linkErr } = await supabase
      .from("jobs")
      .update({ equipment_id: data.id })
      .eq("id", job.id);
    if (linkErr) return false;
    patchJob({ equipment: { id: data.id, ...fields } });
    return true;
  }

  function openSheet(kind: Exclude<Sheet, null>) {
    if (!job) return;
    if (kind === "what") setDraftText(job.what_done);
    if (kind === "date") setDraftDate(localYMD(job.created_at));
    if (kind === "next") setDraftDate(job.next_service_date?.slice(0, 10) ?? "");
    if (kind === "equipment")
      setDraftEq({
        type: job.equipment?.type ?? "",
        make: job.equipment?.make ?? "",
        model: job.equipment?.model ?? "",
      });
    setSheet(kind);
  }

  async function saveSheet() {
    if (!job || !sheet) return;
    setSaving(true);
    let ok = false;
    if (sheet === "what")
      ok = !!draftText.trim() && (await saveJob({ what_done: draftText.trim() }));
    if (sheet === "date")
      ok = !!draftDate && (await saveJob({ created_at: `${draftDate}T12:00:00.000Z` }));
    if (sheet === "next") ok = await saveJob({ next_service_date: draftDate || null });
    if (sheet === "equipment") ok = await saveEquipment(draftEq);
    setSaving(false);
    if (!ok) {
      setToast("Couldn't save that. Try again.");
      return;
    }
    setSheet(null);
    setToast("Saved.");
    await logEvent(`pro:${proId}`, "record_edited", {
      record_id: recordId,
      via: "tap",
      field: sheet,
    });
  }

  async function askAi() {
    if (!job || aiText.trim().length < 3) return;
    setAiBusy(true);
    const current = {
      what_done: job.what_done,
      done_date: localYMD(job.created_at),
      next_service_date: job.next_service_date?.slice(0, 10) ?? null,
      equipment_type: job.equipment?.type ?? null,
      equipment_make: job.equipment?.make ?? null,
      equipment_model: job.equipment?.model ?? null,
    };
    const { data, error } = await supabase.functions.invoke("edit-record", {
      body: { instruction: aiText.trim(), fields: current },
    });
    setAiBusy(false);
    if (error || !data || data.error) {
      setToast(data?.error ?? "HomesBrain AI isn't available right now. Tap a field to edit it.");
      return;
    }
    if (data.understood === false) {
      setToast(data.note ?? "I couldn't tell what to change. Try saying it a different way.");
      return;
    }

    const rows: Proposal["rows"] = [];
    const jobPatch: Proposal["jobPatch"] = {};
    if (typeof data.what_done === "string" && data.what_done !== current.what_done) {
      rows.push({ label: "What was done", from: current.what_done, to: data.what_done });
      jobPatch.what_done = data.what_done;
    }
    if (typeof data.done_date === "string" && data.done_date !== current.done_date) {
      rows.push({
        label: "Day of the job",
        from: formatDate(current.done_date),
        to: formatDate(data.done_date),
      });
      jobPatch.created_at = `${data.done_date}T12:00:00.000Z`;
    }
    if ((data.next_service_date ?? null) !== current.next_service_date) {
      rows.push({
        label: "Next visit",
        from: current.next_service_date ? formatDate(current.next_service_date) : "Not set",
        to: data.next_service_date ? formatDate(data.next_service_date) : "Not set",
      });
      jobPatch.next_service_date = data.next_service_date ?? null;
    }
    const eqNow = eqLabel(job.equipment) ?? "Not labeled";
    const eqNew =
      eqLabel({
        type: data.equipment_type,
        make: data.equipment_make,
        model: data.equipment_model,
      }) ?? "Not labeled";
    let eq: EqDraft | null = null;
    if (eqNew !== eqNow) {
      rows.push({ label: "Equipment", from: eqNow, to: eqNew });
      eq = {
        type: data.equipment_type ?? "",
        make: data.equipment_make ?? "",
        model: data.equipment_model ?? "",
      };
    }

    if (rows.length === 0) {
      setToast(data.note ?? "That matches what's already on the record. Nothing to change.");
      return;
    }
    setProposal({ rows, jobPatch, eq });
  }

  async function applyProposal() {
    if (!proposal || !job) return;
    setSaving(true);
    let ok = true;
    if (Object.keys(proposal.jobPatch).length > 0) ok = await saveJob(proposal.jobPatch);
    if (ok && proposal.eq) ok = await saveEquipment(proposal.eq);
    setSaving(false);
    if (!ok) {
      setToast("Couldn't save that. Try again.");
      return;
    }
    setProposal(null);
    setAiText("");
    setToast("Saved.");
    await logEvent(`pro:${proId}`, "record_edited", {
      record_id: recordId,
      via: "ai",
      fields: proposal.rows.map((r) => r.label),
    });
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="records">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (!record || !job) {
    return (
      <ProShell pro={pro} active="records">
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">Record not found</h2>
          <div className="mt-6">
            <Link to="/pro/records">
              <Btn variant="secondary">Back to records</Btn>
            </Link>
          </div>
        </Card>
      </ProShell>
    );
  }

  const customer = job.customers ?? null;
  const name = customer?.name ?? "Customer";
  const claimed = Boolean(job.homes?.claimed_at);
  const seen = Boolean(record.viewed_at);
  const sentTo = customer?.phone ? formatPhone(customer.phone) : (customer?.email ?? null);
  const equipment = eqLabel(job.equipment);

  return (
    <ProShell pro={pro} active="records">
      <Link
        to="/pro/records"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Records
      </Link>

      <div className="max-w-xl space-y-4">
        <Card className="anim-fade-up !p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl tracking-tight truncate">{name}</h1>
              {job.homes?.address && (
                <div className="mt-1 text-sm text-muted">{job.homes.address}</div>
              )}
            </div>
            <div className="shrink-0 mt-1.5">
              {claimed ? (
                <Pill accent="coral">Claimed</Pill>
              ) : seen ? (
                <Pill accent="indigo">Seen</Pill>
              ) : (
                <Pill accent="ink">Sent</Pill>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-3">
            <EditRow
              label="What was done"
              value={job.what_done}
              onClick={() => openSheet("what")}
            />
            <EditRow
              label="Day of the job"
              value={formatDate(job.created_at)}
              onClick={() => openSheet("date")}
            />
            <EditRow
              label="Next visit"
              value={job.next_service_date ? formatDate(job.next_service_date) : null}
              placeholder="Not set. Tap to pick a day."
              onClick={() => openSheet("next")}
            />
            <EditRow
              label="Equipment"
              value={equipment}
              placeholder="No equipment labeled yet. Tap to add it."
              onClick={() => openSheet("equipment")}
            />
            {sentTo && <div className="mt-2 px-0 text-sm text-muted">Sent to {sentTo}</div>}
          </div>
        </Card>

        {media.length > 0 && (
          <Card className="anim-fade-up d-1 !p-4">
            <RecordMedia
              media={media}
              videoLabel="Walkthrough video"
              downloadLabel="Download the video"
              photoAlt="Job photo"
            />
          </Card>
        )}

        <Card className="anim-fade-up d-1 !p-5 !bg-indigobg !border-indigo/25">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo" aria-hidden="true" />
            <div className="text-sm font-bold text-indigodark">HomesBrain AI</div>
          </div>
          <div className="mt-1.5 text-sm text-indigodark/80">
            Something wrong on this record? Type it and I'll fix it for you.
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askAi();
            }}
            className="mt-3 flex flex-col sm:flex-row gap-2.5"
          >
            <Input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder={'Like: "the date was July 3" or "it was a Rheem"'}
              aria-label="Tell HomesBrain AI what to change"
              className="!bg-paper"
            />
            <Btn
              type="submit"
              variant="indigo"
              loading={aiBusy}
              disabled={aiText.trim().length < 3}
              className="shrink-0"
            >
              Fix it
            </Btn>
          </form>
        </Card>

        {claimed ? (
          <Card className="anim-fade-up d-2 !p-5 !bg-coralbg !border-coral/30">
            <div className="text-sm font-semibold text-coraldark">
              {name} claimed their home. Nothing else to do here.
            </div>
          </Card>
        ) : (
          <Card className="anim-fade-up d-2 !p-5">
            <div className="text-sm text-muted">
              {seen
                ? `${name} opened this record but hasn't claimed their home yet.`
                : `${name} hasn't opened this record yet.`}{" "}
              Next time you're there, show them this QR code and they can claim it on the spot.
            </div>
            <Btn variant="indigo" size="lg" className="mt-4 w-full" onClick={() => setQrOpen(true)}>
              <QrCode size={17} /> Show QR code
            </Btn>
          </Card>
        )}

        {customer && (
          <Link
            to="/pro/invoices/new"
            search={{ customer: customer.id, job: job.id }}
            className="anim-fade-up d-3 block"
          >
            <Btn variant="secondary" size="lg" className="w-full pointer-events-none">
              Create invoice
            </Btn>
          </Link>
        )}
      </div>

      {sheet === "what" && (
        <EditSheet
          title="What was done"
          busy={saving}
          onCancel={() => setSheet(null)}
          onSave={saveSheet}
        >
          <Textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            aria-label="What was done"
            autoFocus
          />
        </EditSheet>
      )}
      {sheet === "date" && (
        <EditSheet
          title="Day of the job"
          busy={saving}
          onCancel={() => setSheet(null)}
          onSave={saveSheet}
        >
          <Input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            aria-label="Day of the job"
          />
        </EditSheet>
      )}
      {sheet === "next" && (
        <EditSheet
          title="Next visit"
          busy={saving}
          onCancel={() => setSheet(null)}
          onSave={saveSheet}
        >
          <Field label="When should you come back?" hint="Leave it empty if there's no next visit.">
            <Input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
          </Field>
        </EditSheet>
      )}
      {sheet === "equipment" && (
        <EditSheet
          title="Equipment"
          busy={saving}
          onCancel={() => setSheet(null)}
          onSave={saveSheet}
        >
          <Field label="What is it?">
            <Input
              value={draftEq.type}
              onChange={(e) => setDraftEq((d) => ({ ...d, type: e.target.value }))}
              placeholder="Water heater"
              autoFocus
            />
          </Field>
          <Field label="Brand">
            <Input
              value={draftEq.make}
              onChange={(e) => setDraftEq((d) => ({ ...d, make: e.target.value }))}
              placeholder="Rheem"
            />
          </Field>
          <Field label="Model" hint="Skip anything you don't know.">
            <Input
              value={draftEq.model}
              onChange={(e) => setDraftEq((d) => ({ ...d, model: e.target.value }))}
              placeholder="XR90"
            />
          </Field>
        </EditSheet>
      )}

      {proposal && (
        <EditSheet
          title="Here's what I'll change"
          saveLabel="Save changes"
          busy={saving}
          onCancel={() => setProposal(null)}
          onSave={applyProposal}
        >
          {proposal.rows.map((r) => (
            <div key={r.label} className="rounded-xl border border-line bg-soft p-3">
              <div className="text-xs font-semibold text-muted">{r.label}</div>
              <div className="mt-1 text-sm text-muted line-through">{r.from}</div>
              <div className="mt-0.5 text-[15px] font-semibold text-ink">{r.to}</div>
            </div>
          ))}
        </EditSheet>
      )}

      {qrOpen && customer && (
        <ClaimQRModal
          customerId={customer.id}
          proId={pro.id}
          recordId={record.id}
          proBusiness={pro.business}
          proLogo={pro.logo ?? null}
          onClose={() => setQrOpen(false)}
        />
      )}

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}

function EditRow({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable w-full flex items-center gap-3 text-left rounded-xl px-3 py-3 -mx-3 hover:bg-soft active:bg-line/50 transition-colors duration-150"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-muted">{label}</div>
        <div className={`mt-0.5 text-[15px] ${value ? "font-semibold text-ink" : "text-muted"}`}>
          {value ?? placeholder}
        </div>
      </div>
      <Pencil size={15} className="shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}

/* One bottom sheet for every edit on this page: a title, the fields, one big
   Save button. Same shape the pro sees everywhere else in the app. */
function EditSheet({
  title,
  saveLabel = "Save",
  busy,
  onCancel,
  onSave,
  children,
}: {
  title: string;
  saveLabel?: string;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm anim-fade-up sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full rounded-t-3xl border border-line bg-paper p-5 shadow-xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="text-lg font-semibold text-ink">{title}</div>
        <div className="mt-4 space-y-4">{children}</div>
        <Btn variant="indigo" size="lg" className="mt-5 w-full" loading={busy} onClick={onSave}>
          {saveLabel}
        </Btn>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="mt-3 w-full py-2 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
