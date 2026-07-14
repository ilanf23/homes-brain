import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  Eye,
  Mail,
  QrCode,
  ReceiptText,
  Send,
  StickyNote,
  Wrench,
} from "lucide-react";
import { Avatar, Btn, Card, KV, Pill, Toast } from "@/lib/ui";

import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPhone, logEvent, mockSend } from "@/lib/hb";
import {
  formatMoney,
  isOverdue,
  listInvoicesForCustomer,
  markInvoicePaid,
  type Invoice,
} from "@/lib/invoices";
import { addNote, deleteNote, listNotes, type CustomerNote } from "@/lib/notes";
import {
  ActionCircle,
  CollapsibleCard,
  PropertyRow,
  Timeline,
  UnderlineTabs,
  type TimelineEntry,
} from "@/components/crm";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { PlanLock } from "@/components/plan-lock";
import { ClaimQRModal } from "@/components/claim-qr-modal";

// Flip to true to restore the full CRM (notes, invoices, timeline, nudge/invite,
// equipment, activity tabs). Kept behind a flag so the page stays radically
// simple for v0 while preserving every advanced surface for a future Premium tier.
const SHOW_ADVANCED = false;

export const Route = createFileRoute("/pro/customers/$customerId")({
  head: () => ({ meta: [{ title: "Customer - HomesBrain" }] }),
  component: CustomerDetail,
});


type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  claim_invited_at: string | null;
  consent_at: string | null;
  created_at: string;
  home_id: string;
  homes: {
    id: string;
    address: string;
    claimed_at: string | null;
    claimed_by_homeowner: string | null;
    homeowners: {
      id: string;
      phone: string | null;
      email: string | null;
      created_at: string;
    } | null;
  } | null;
};
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  next_service_date: string | null;
  records:
    | {
        id: string;
        viewed_at: string | null;
        sent_sms_at: string | null;
        sent_email_at: string | null;
      }[]
    | null;
};
type EquipmentRow = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  recall_status: string;
};
type NudgeEvent = { id: string; created_at: string };
type TabKey = "activity" | "notes" | "jobs" | "invoices";

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const { proId, pro } = useProGuard();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [nudges, setNudges] = useState<NudgeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("activity");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select(
          "id,name,phone,email,consent_at,created_at,home_id,claim_invited_at,homes(id,address,claimed_at,claimed_by_homeowner,homeowners!homes_homeowner_fk(id,phone,email,created_at))",
        )
        .eq("id", customerId)
        .eq("pro_id", proId)
        .maybeSingle();
      const cust = c as unknown as Customer | null;
      setCustomer(cust);
      if (cust) {
        const [{ data: j }, { data: eq }, inv, ns, { data: ev }] = await Promise.all([
          supabase
            .from("jobs")
            .select(
              "id,what_done,created_at,next_service_date,records(id,viewed_at,sent_sms_at,sent_email_at)",
            )
            .eq("home_id", cust.home_id)
            .eq("pro_id", proId)
            .order("created_at", { ascending: false }),
          supabase
            .from("equipment")
            .select("id,type,make,model,warranty_until,recall_status")
            .eq("home_id", cust.home_id)
            .order("created_at", { ascending: false }),
          listInvoicesForCustomer(proId, customerId),
          listNotes(proId, customerId),
          supabase
            .from("events")
            .select("id,created_at")
            .eq("type", "rebook_nudge_sent")
            .eq("actor", `pro:${proId}`)
            .contains("props", { customer_id: customerId })
            .order("created_at", { ascending: false }),
        ]);
        setJobs((j ?? []) as unknown as JobRow[]);
        setEquipment((eq ?? []) as EquipmentRow[]);
        setInvoices(inv);
        setNotes(ns);
        setNudges((ev ?? []) as NudgeEvent[]);
      }
      setLoading(false);
    })();
  }, [proId, customerId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function onMarkPaid(inv: Invoice) {
    if (await markInvoicePaid(inv)) {
      setInvoices((rs) =>
        rs.map((r) =>
          r.id === inv.id ? { ...r, status: "paid", paid_at: new Date().toISOString() } : r,
        ),
      );
    } else {
      setToast("Could not mark the invoice paid.");
    }
  }

  async function saveField(field: "name" | "phone" | "email", value: string): Promise<boolean> {
    if (!proId || !customer) return false;
    if (field === "name" && !value) return false;
    const patch =
      field === "name"
        ? { name: value }
        : field === "phone"
          ? { phone: value || null }
          : { email: value || null };
    const { error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", customerId)
      .eq("pro_id", proId);
    if (error) {
      setToast("Could not save. Try again.");
      return false;
    }
    setCustomer((c) => (c ? { ...c, ...patch } : c));
    return true;
  }

  async function onSaveNote() {
    const body = noteDraft.trim();
    if (!proId || !body) return;
    setSavingNote(true);
    const note = await addNote({ proId, customerId, body });
    setSavingNote(false);
    if (!note) {
      setToast("Could not save the note.");
      return;
    }
    setNotes((ns) => [note, ...ns]);
    setNoteDraft("");
  }

  async function onDeleteNote(n: CustomerNote) {
    if (!window.confirm("Delete this note?")) return;
    if (await deleteNote(n)) setNotes((ns) => ns.filter((x) => x.id !== n.id));
    else setToast("Could not delete the note.");
  }

  const latestJob = jobs[0] ?? null;
  const upcomingJob = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      jobs
        .filter((j) => j.next_service_date && j.next_service_date >= today)
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))[0] ?? null
    );
  }, [jobs]);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [changingFollowUp, setChangingFollowUp] = useState(false);

  async function setFollowUpMonths(months: number) {
    if (!latestJob || savingFollowUp) return;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const iso = d.toISOString().slice(0, 10);
    setSavingFollowUp(true);
    const { error } = await supabase
      .from("jobs")
      .update({ next_service_date: iso, no_follow_up: false, follow_up_handled_at: null })
      .eq("id", latestJob.id);
    setSavingFollowUp(false);
    if (error) {
      setToast("Could not save. Try again.");
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === latestJob.id ? { ...j, next_service_date: iso } : j)),
    );
    setChangingFollowUp(false);
    setToast("Follow-up scheduled");
  }

  async function markNoFollowUp() {
    if (!latestJob || savingFollowUp) return;
    setSavingFollowUp(true);
    const { error } = await supabase
      .from("jobs")
      .update({ no_follow_up: true })
      .eq("id", latestJob.id);
    setSavingFollowUp(false);
    if (error) {
      setToast("Could not save. Try again.");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== latestJob.id).concat({ ...latestJob }));
    setChangingFollowUp(false);
    setToast("No follow-up needed");
  }


  async function sendNudge() {
    if (!proId || !customer || nudging) return;
    const to = customer.phone ?? customer.email;
    if (!to) return;
    setNudging(true);
    const nextJob = jobs.find((j) => j.next_service_date);
    const first = customer.name.split(" ")[0];
    const body = nextJob
      ? `Hi ${first}, it's ${pro?.business}. Your ${nextJob.what_done.toLowerCase()} is due for service around ${formatDate(nextJob.next_service_date!)}. Reply here or book a time and we'll take care of it.`
      : `Hi ${first}, it's ${pro?.business}. It's a good time for a service check at ${customer.homes?.address ?? "your home"}. Reply here and we'll set it up.`;
    await mockSend({ channel: customer.phone ? "sms" : "email", to, body, kind: "other" });
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
      job_id: nextJob?.id ?? null,
      customer_id: customerId,
    });
    setNudges((prev) => [
      { id: `local-${Date.now()}`, created_at: new Date().toISOString() },
      ...prev,
    ]);
    setNudging(false);
    setToast(`Rebook nudge sent to ${customer.name} (mock)`);
  }

  async function sendClaimInvite() {
    if (!proId || !customer || inviting) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-claim", {
      body: { customer_id: customerId, pro_id: proId, origin: window.location.origin },
    });
    setInviting(false);
    const result = data as {
      ok: boolean;
      code?:
        | "no_email"
        | "already_claimed"
        | "no_record"
        | "cooldown"
        | "not_configured"
        | "daily_limit"
        | "bad_request"
        | "forbidden"
        | "send_failed"
        | "error";
      invited_at?: string;
    } | null;
    if (error || !result?.ok) {
      const code = result?.code;
      setToast(
        code === "no_email"
          ? "No email on file."
          : code === "already_claimed"
            ? "This home is already claimed."
            : code === "no_record"
              ? "Log a job first so there's a record to claim."
              : code === "cooldown"
                ? `Already invited ${result?.invited_at ? formatDate(result.invited_at) : "recently"}. Invites can go out once every 7 days.`
                : code === "not_configured"
                  ? "Email is not configured yet."
                  : code === "daily_limit"
                    ? "Daily invite limit reached. Try again tomorrow."
                    : "Could not send the invite. Try again.",
      );
      if (code === "cooldown" && result?.invited_at) {
        setCustomer((c) => (c ? { ...c, claim_invited_at: result.invited_at! } : c));
      }
      return;
    }
    setCustomer((c) => (c ? { ...c, claim_invited_at: result.invited_at ?? null } : c));
    await logEvent(`pro:${proId}`, "claim_invite_sent", { customer_id: customerId });
    setToast("Claim invite sent");
  }

  function focusComposer() {
    if (tab === "jobs" || tab === "invoices") setTab("activity");
    /* Wait a tick so the composer exists after a tab switch. */
    setTimeout(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  const entries = useMemo(() => {
    const list: TimelineEntry[] = [];
    const recordLink = (recId: string) => (
      <Link
        to="/pro/records/$recordId"
        params={{ recordId: recId }}
        className="text-xs font-semibold text-indigo hover:underline"
      >
        View record →
      </Link>
    );
    for (const n of notes) {
      list.push({
        id: n.id,
        kind: "note",
        icon: StickyNote,
        title: "Note",
        at: n.created_at,
        preview: n.body,
        body: n.body,
        onDelete: () => onDeleteNote(n),
      });
    }
    for (const j of jobs) {
      const rec = j.records?.[0];
      list.push({
        id: j.id,
        kind: "job",
        icon: Wrench,
        title: "Job logged",
        at: j.created_at,
        preview: j.what_done,
        body: `${j.what_done}${j.next_service_date ? `\nNext service ${formatDate(j.next_service_date)}` : ""}`,
        action: rec ? recordLink(rec.id) : undefined,
      });
      if (rec) {
        const sentAt = rec.sent_sms_at ?? rec.sent_email_at;
        if (sentAt) {
          list.push({
            id: `${rec.id}-sent`,
            kind: "job",
            icon: Send,
            title: "Record sent",
            at: sentAt,
            preview: j.what_done,
            action: recordLink(rec.id),
          });
        }
        if (rec.viewed_at) {
          list.push({
            id: `${rec.id}-viewed`,
            kind: "job",
            icon: Eye,
            title: "Record viewed by homeowner",
            at: rec.viewed_at,
            preview: j.what_done,
            action: recordLink(rec.id),
          });
        }
      }
    }
    for (const inv of invoices) {
      const invoicesLink = (
        <Link to="/pro/invoices" className="text-xs font-semibold text-indigo hover:underline">
          View invoices →
        </Link>
      );
      list.push({
        id: inv.id,
        kind: "invoice",
        icon: ReceiptText,
        title: `Invoice created · ${formatMoney(Number(inv.total))}`,
        at: inv.created_at,
        preview: inv.items[0]?.description ?? "",
        action: invoicesLink,
      });
      if (inv.status === "paid" && inv.paid_at) {
        list.push({
          id: `${inv.id}-paid`,
          kind: "invoice",
          icon: ReceiptText,
          title: `Invoice paid · ${formatMoney(Number(inv.total))}`,
          at: inv.paid_at,
          preview: inv.items[0]?.description ?? "",
          action: invoicesLink,
        });
      }
    }
    for (const ev of nudges) {
      list.push({
        id: ev.id,
        kind: "nudge",
        icon: BellRing,
        title: "Rebook nudge sent",
        at: ev.created_at,
      });
    }
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [notes, jobs, invoices, nudges]);

  const visibleEntries = useMemo(() => {
    if (tab === "notes") return entries.filter((e) => e.kind === "note");
    if (tab === "jobs") return entries.filter((e) => e.kind === "job");
    if (tab === "invoices") return entries.filter((e) => e.kind === "invoice");
    return entries;
  }, [entries, tab]);

  // Soonest upcoming service date across all jobs (falls back to most recent
  // past date so a "wanted" service that slipped still surfaces).
  const nextService = useMemo(() => {
    const dated = jobs
      .filter((j) => j.next_service_date)
      .map((j) => ({ date: j.next_service_date as string, what: j.what_done }));
    if (dated.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = dated
      .filter((d) => d.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (upcoming) return { ...upcoming, overdue: false };
    const past = dated.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return { ...past, overdue: true };
  }, [jobs]);


  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="customers" wide>
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (SHOW_ADVANCED && pro.plan !== "pro") {
    return (
      <ProShell pro={pro} active="customers">
        <PlanLock
          title="Customer CRM"
          description="Deep customer profiles with visits, equipment, invoices, and notes. Included with Pro."
        />
      </ProShell>
    );
  }



  if (!customer) {
    return (
      <ProShell pro={pro} active="customers">
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">Customer not found</h2>
          <div className="mt-6">
            <Link to="/pro/customers">
              <Btn variant="secondary">Back to customers</Btn>
            </Link>
          </div>
        </Card>
      </ProShell>
    );
  }

  const openInvoices = invoices.filter((i) => i.status === "open");
  const openBalance = openInvoices.reduce((s, i) => s + Number(i.total), 0);
  const homeowner = customer.homes?.homeowners ?? null;
  const inviteCooldownUntil = customer.claim_invited_at
    ? new Date(new Date(customer.claim_invited_at).getTime() + 7 * 24 * 3600 * 1000).toISOString()
    : null;
  const inviteOnCooldown =
    inviteCooldownUntil != null && new Date(inviteCooldownUntil).getTime() > Date.now();

  return (
    <ProShell pro={pro} active="customers" wide>
      <Link
        to="/pro/customers"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Customers
      </Link>

      <div className="grid gap-5 items-start lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Left: identity, actions, properties */}
        <div className="space-y-5">
          <Card className="anim-fade-up text-center">
            <div className="flex justify-center">
              <Avatar name={customer.name} accent="indigo" size={64} />
            </div>
            <h1 className="mt-3 text-2xl tracking-tight">{customer.name}</h1>
            <div className="mt-1 text-sm text-muted">{customer.homes?.address}</div>
            {customer.phone && (
              <div className="mt-1.5 text-xs text-muted font-mono tnum">{formatPhone(customer.phone)}</div>
            )}
            {customer.email && (
              <div className="text-xs text-muted font-mono tnum">{customer.email}</div>
            )}
            <div className="mt-5 flex justify-center gap-4">
              <ActionCircle icon={StickyNote} label="Note" onClick={focusComposer} />
              <ActionCircle
                icon={Wrench}
                label="Job"
                onClick={() => navigate({ to: "/pro/jobs/new" })}
              />
              <ActionCircle
                icon={ReceiptText}
                label="Invoice"
                onClick={() =>
                  navigate({
                    to: "/pro/invoices/new",
                    search: { customer: customerId, job: undefined },
                  })
                }
              />
              <ActionCircle
                icon={BellRing}
                label="Nudge"
                onClick={sendNudge}
                disabled={(!customer.phone && !customer.email) || nudging}
                title={
                  !customer.phone && !customer.email
                    ? "No phone or email on file"
                    : "Send a rebook nudge (mock)"
                }
              />
              {!customer.homes?.claimed_at && (
                <>
                  <ActionCircle
                    icon={Mail}
                    label="Invite"
                    onClick={sendClaimInvite}
                    disabled={!customer.email || inviting || inviteOnCooldown}
                    title={
                      !customer.email
                        ? "No email on file"
                        : inviteOnCooldown
                          ? `Invited ${formatDate(customer.claim_invited_at!)} · resend available ${formatDate(inviteCooldownUntil!)}`
                          : "Email an invite to claim this home record"
                    }
                  />
                  <ActionCircle
                    icon={QrCode}
                    label="Show QR"
                    onClick={() => setQrOpen(true)}
                    disabled={!customer.email}
                    title={
                      !customer.email
                        ? "No email on file"
                        : "Show a QR the homeowner can scan to claim"
                    }
                  />
                </>
              )}

            </div>
          </Card>

          <div className="anim-fade-up d-1">
            <CollapsibleCard title="About this customer">
              <PropertyRow
                label="Name"
                value={customer.name}
                onSave={(v) => saveField("name", v)}
              />
              <PropertyRow
                label="Phone"
                value={customer.phone ?? ""}
                onSave={(v) => saveField("phone", v)}
                type="phone"
              />
              <PropertyRow
                label="Email"
                value={customer.email ?? ""}
                onSave={(v) => saveField("email", v)}
              />
              <PropertyRow
                label="Consent"
                display={
                  customer.consent_at ? (
                    <Pill accent="indigo">On file · {formatDate(customer.consent_at)}</Pill>
                  ) : (
                    <Pill accent="red">Missing</Pill>
                  )
                }
              />
              <PropertyRow label="Customer since" value={formatDate(customer.created_at)} />
              <PropertyRow
                label="Next service"
                display={
                  nextService ? (
                    <Pill accent={nextService.overdue ? "red" : "indigo"}>
                      {nextService.overdue ? "Overdue · " : ""}
                      {formatDate(nextService.date)} · {nextService.what}
                    </Pill>
                  ) : (
                    <Pill accent="ink">None scheduled</Pill>
                  )
                }
              />
              <PropertyRow
                label="Home claimed"
                display={
                  customer.homes?.claimed_at ? (
                    <Pill accent="coral">Yes · {formatDate(customer.homes.claimed_at)}</Pill>
                  ) : (
                    <Pill accent="ink">Not yet</Pill>
                  )
                }
              />
              {!customer.homes?.claimed_at && (
                <PropertyRow
                  label="Claim invite"
                  display={
                    customer.claim_invited_at ? (
                      <Pill accent="indigo">Sent · {formatDate(customer.claim_invited_at)}</Pill>
                    ) : (
                      <Pill accent="ink">Not sent</Pill>
                    )
                  }
                />
              )}
            </CollapsibleCard>
          </div>
        </div>

        {/* Middle: tabs, composer, timeline */}
        <div className="anim-fade-up d-1 min-w-0">
          <UnderlineTabs
            tabs={[
              { key: "activity", label: "Activity" },
              { key: "notes", label: "Notes", count: notes.length },
              { key: "jobs", label: "Jobs", count: jobs.length },
              { key: "invoices", label: "Invoices", count: invoices.length },
            ]}
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
          />

          {(tab === "activity" || tab === "notes") && (
            <Card className="mt-4 !p-4">
              {/* Native textarea (needs a ref for the Note action): mirrors ui.tsx input styling. */}
              <textarea
                ref={composerRef}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={`Leave a note about ${customer.name.split(" ")[0]}...`}
                rows={noteDraft ? 3 : 1}
                aria-label="New note"
                className="w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[16px] sm:text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10 hover:border-ink/30"
              />
              {noteDraft.trim() && (
                <div className="mt-2 flex justify-end">
                  <Btn size="sm" variant="indigo" loading={savingNote} onClick={onSaveNote}>
                    Save note
                  </Btn>
                </div>
              )}
            </Card>
          )}

          <div className="mt-4">
            <Timeline
              entries={visibleEntries}
              empty={
                <Card className="text-center py-10">
                  <p className="text-sm text-muted">
                    No activity yet. Log a job at this home to start the record.
                  </p>
                  <div className="mt-4">
                    <Link to="/pro/jobs/new">
                      <Btn variant="indigo" size="sm">
                        Log a job
                      </Btn>
                    </Link>
                  </div>
                </Card>
              }
            />
          </div>
        </div>

        {/* Right: association cards */}
        <div className="space-y-4">
          <div className="anim-fade-up d-1">
            <CollapsibleCard title="Home" count={1}>
              <div className="font-semibold text-ink">{customer.homes?.address}</div>
              <div className="mt-2">
                {customer.homes?.claimed_at ? (
                  <Pill accent="coral">Claimed</Pill>
                ) : (
                  <Pill accent="ink">Unclaimed</Pill>
                )}
              </div>
              {homeowner ? (
                <div className="mt-2">
                  <KV k="Phone" v={homeowner.phone ? formatPhone(homeowner.phone) : "-"} />
                  <KV k="Email" v={homeowner.email ?? "-"} />
                  <KV k="Joined" v={formatDate(homeowner.created_at)} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  The homeowner has not claimed this home yet. The record link they open becomes the
                  claim.
                </p>
              )}
            </CollapsibleCard>
          </div>

          <div className="anim-fade-up d-2">
            <CollapsibleCard
              title="Jobs"
              count={jobs.length}
              action={
                <>
                  <button
                    onClick={() => setTab("jobs")}
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    View all
                  </button>
                  <Link
                    to="/pro/jobs/new"
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    + Add
                  </Link>
                </>
              }
            >
              {jobs.length === 0 ? (
                <p className="text-sm text-muted">No jobs logged yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {jobs.slice(0, 3).map((j) => (
                    <div key={j.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="text-sm font-semibold text-ink truncate">{j.what_done}</div>
                      <div className="text-xs text-muted tnum">{formatDate(j.created_at)}</div>
                      {j.next_service_date && (
                        <div className="mt-1 text-xs font-semibold text-indigo tnum">
                          Next service {formatDate(j.next_service_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>
          </div>

          <div className="anim-fade-up d-2">
            <CollapsibleCard title="Equipment" count={equipment.length}>
              {equipment.length === 0 ? (
                <p className="text-sm text-muted">Nothing on file yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {equipment.map((e) => (
                    <div key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="text-sm font-semibold text-ink">{e.type ?? "Equipment"}</div>
                      <div className="text-xs text-muted">
                        {[e.make, e.model].filter(Boolean).join(" · ") || "Make/model unknown"}
                      </div>
                      <div className="mt-1 flex gap-1.5 flex-wrap">
                        {e.warranty_until && (
                          <Pill accent="indigo">Warranty to {formatDate(e.warranty_until)}</Pill>
                        )}
                        <Pill accent={e.recall_status === "none" ? "indigo" : "red"}>
                          {e.recall_status === "none" ? "No recalls" : "Recall"}
                        </Pill>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>
          </div>

          <div className="anim-fade-up d-2">
            <CollapsibleCard
              title="Invoices"
              count={invoices.length}
              action={
                <Link
                  to="/pro/invoices/new"
                  search={{ customer: customer.id, job: undefined }}
                  className="text-xs font-semibold text-indigo hover:underline"
                >
                  + New invoice
                </Link>
              }
            >
              {invoices.length === 0 ? (
                <p className="text-sm text-muted">No invoices yet.</p>
              ) : (
                <>
                  {openBalance > 0 && (
                    <div className="text-sm text-muted">
                      Open balance{" "}
                      <span className="font-bold text-coraldark tnum">
                        {formatMoney(openBalance)}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 divide-y divide-line">
                    {invoices.slice(0, 3).map((inv) => (
                      <div
                        key={inv.id}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink tnum">
                            {formatMoney(Number(inv.total))}
                          </div>
                          <div className="text-xs text-muted truncate">
                            {inv.items[0]?.description ?? ""}
                            {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {inv.status === "open" ? (
                            <>
                              <Pill accent={isOverdue(inv) ? "amber" : "indigo"}>
                                {isOverdue(inv) ? "Overdue" : "Open"}
                              </Pill>
                              <Btn variant="secondary" size="sm" onClick={() => onMarkPaid(inv)}>
                                Mark paid
                              </Btn>
                            </>
                          ) : (
                            <Pill accent={inv.status === "paid" ? "coral" : "ink"}>
                              {inv.status === "paid" ? "Paid" : "Void"}
                            </Pill>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CollapsibleCard>
          </div>
        </div>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}

      {qrOpen && (
        <ClaimQRModal
          customerId={customerId}
          proId={pro.id}
          proBusiness={pro.business}
          proLogo={pro.logo ?? null}
          onClose={() => setQrOpen(false)}
        />
      )}
    </ProShell>
  );
}
