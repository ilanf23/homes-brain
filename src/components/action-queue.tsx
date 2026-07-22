import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { formatDate, logEvent } from "@/lib/hb";
import { formatMoney, markInvoicePaid, type ProInvoice } from "@/lib/invoices";
import { supabase } from "@/integrations/supabase/client";
import { sendSms, smsErrorMessage } from "@/lib/sms";

/* "Needs attention" queue: every row is a problem plus a one-click action.
   Sources arrive pre-filtered and pre-sorted from the dashboard:
   overdue/due-soon service, open invoices past due, stale unclaimed homes. */

export type QueueContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};
export type QueueJob = {
  id: string;
  what_done: string;
  next_service_date: string;
  customer: QueueContact | null;
  address: string | null;
};
export type QueueStaleHome = {
  homeId: string;
  address: string;
  customer: QueueContact | null;
  sentAt: string;
};

type Row =
  | { kind: "due"; key: string; job: QueueJob }
  | { kind: "invoice"; key: string; inv: ProInvoice }
  | { kind: "stale"; key: string; home: QueueStaleHome };

const DAY = 24 * 3600 * 1000;
const MAX_ROWS = 8;

function daysOverdue(dueDate: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(dueDate + "T23:59:59").getTime()) / DAY));
}

function daysAgo(iso: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

export function ActionQueue({
  proId,
  proBusiness,
  dueJobs,
  overdueInvoices,
  staleHomes,
  onInvoicePaid,
  onToast,
}: {
  proId: string;
  proBusiness: string;
  dueJobs: QueueJob[];
  overdueInvoices: ProInvoice[];
  staleHomes: QueueStaleHome[];
  onInvoicePaid: (invoiceId: string) => void;
  onToast: (msg: string) => void;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const all: Row[] = [
    ...dueJobs.map((job): Row => ({ kind: "due", key: `due-${job.id}`, job })),
    ...overdueInvoices.map((inv): Row => ({ kind: "invoice", key: `inv-${inv.id}`, inv })),
    ...staleHomes.map((home): Row => ({ kind: "stale", key: `stale-${home.homeId}`, home })),
  ];
  const rows = all.slice(0, MAX_ROWS);
  const truncated = all.length > MAX_ROWS;

  async function nudge(row: Row & { kind: "due" }) {
    const c = row.job.customer;
    if (!c || (!c.phone && !c.email)) return;
    setBusy(row.key);
    let deliveredVia: "sms" | "email" | "both" | null = null;
    let smsFail: string | null = null;
    // Prefer SMS when we have a phone; also fire the email follow-up when we have one.
    if (c.phone) {
      const firstName = c.name.split(" ")[0] || "there";
      const body = `Hi ${firstName}, it's ${proBusiness}. Your ${row.job.what_done.toLowerCase()} is due around ${formatDate(row.job.next_service_date)}. Reply to book a time. Reply STOP to opt out.`;
      const res = await sendSms(c.phone, body, "other");
      if (res.ok) deliveredVia = "sms";
      else smsFail = smsErrorMessage(res.code);
    }
    if (c.email) {
      const { data } = await supabase.functions.invoke("send-follow-up", {
        body: { job_id: row.job.id, origin: window.location.origin },
      });
      if ((data as { ok?: boolean } | null)?.ok) {
        deliveredVia = deliveredVia ? "both" : "email";
      }
    }
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", {
      job_id: row.job.id,
      customer_id: c.id,
      via: deliveredVia,
    });
    setBusy(null);
    if (!deliveredVia) {
      onToast(smsFail ?? "Nudge didn't go through. Try again.");
      return;
    }
    setDone((prev) => new Set(prev).add(row.key));
    const label = deliveredVia === "both" ? "text + email" : deliveredVia === "sms" ? "text" : "email";
    onToast(`Rebook nudge sent to ${c.name} by ${label}.`);
  }
  }

  async function markPaid(row: Row & { kind: "invoice" }) {
    setBusy(row.key);
    const ok = await markInvoicePaid(row.inv);
    setBusy(null);
    if (!ok) {
      onToast("Could not mark the invoice paid. Try again.");
      return;
    }
    setDone((prev) => new Set(prev).add(row.key));
    onInvoicePaid(row.inv.id);
    onToast(`Marked paid: ${formatMoney(Number(row.inv.total))}`);
  }

  async function remind(row: Row & { kind: "stale" }) {
    const c = row.home.customer;
    if (!c || (!c.phone && !c.email)) return;
    setBusy(row.key);
    const firstName = c.name.split(" ")[0] || "there";
    let deliveredVia: "sms" | "email" | null = null;
    let failMsg: string | null = null;
    if (c.phone) {
      const body = `Hi ${firstName}, it's ${proBusiness}. Your service record for ${row.home.address} is waiting on HomesBrain. Claim your home to keep its history forever. Reply STOP to opt out.`;
      const res = await sendSms(c.phone, body, "record");
      if (res.ok) deliveredVia = "sms";
      else failMsg = smsErrorMessage(res.code);
    }
    if (!deliveredVia && c.email) {
      // No phone available (or SMS failed) - fall back to email invite.
      const { data } = await supabase.functions.invoke("invite-claim", {
        body: { home_id: row.home.homeId, origin: window.location.origin },
      });
      if ((data as { ok?: boolean } | null)?.ok) deliveredVia = "email";
    }
    await logEvent(`pro:${proId}`, "claim_nudge_sent", {
      home_id: row.home.homeId,
      customer_id: c.id,
      via: deliveredVia,
    });
    setBusy(null);
    if (!deliveredVia) {
      onToast(failMsg ?? "Reminder didn't go through. Try again.");
      return;
    }
    setDone((prev) => new Set(prev).add(row.key));
    onToast(`Claim reminder sent to ${c.name} by ${deliveredVia === "sms" ? "text" : "email"}.`);
  }

  return (
    <Card className="anim-fade-up d-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eyebrow accent="indigo">Needs attention</Eyebrow>
          {all.length > 0 && <span className="text-xs text-muted tnum">{all.length}</span>}
        </div>
        {truncated && (
          <div className="text-xs font-semibold">
            <Link to="/pro/due" className="text-indigo hover:underline">
              All due
            </Link>
            <span className="text-muted"> · </span>
            <Link to="/pro/invoices" className="text-indigo hover:underline">
              All invoices
            </Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 size={18} className="text-muted" />
          You're all caught up.
        </div>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {rows.map((row) => {
            const isDone = done.has(row.key);
            if (row.kind === "due") {
              const overdue = new Date(row.job.next_service_date).getTime() < Date.now();
              const c = row.job.customer;
              const noContact = !c || (!c.phone && !c.email);
              return (
                <div
                  key={row.key}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {c?.name ?? "-"}
                      <span className="text-muted font-normal"> · {row.job.what_done}</span>
                    </div>
                    <div className={`text-xs ${overdue ? "text-red font-semibold" : "text-muted"}`}>
                      {overdue
                        ? `Overdue since ${formatDate(row.job.next_service_date)}`
                        : `Due ${formatDate(row.job.next_service_date)}`}
                      {row.job.address ? ` · ${row.job.address}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill accent="amber">Service due</Pill>
                    {isDone ? (
                      <span className="anim-scale-in">
                        <Pill accent="coral">Nudged</Pill>
                      </span>
                    ) : (
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={busy === row.key}
                        disabled={noContact}
                        title={noContact ? "No phone or email on file" : undefined}
                        onClick={() => nudge(row)}
                      >
                        Nudge
                      </Btn>
                    )}
                  </div>
                </div>
              );
            }
            if (row.kind === "invoice") {
              return (
                <div
                  key={row.key}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {row.inv.customers?.name ?? "-"}
                      <span className="text-muted font-normal">
                        {" "}
                        · {formatMoney(Number(row.inv.total))}
                      </span>
                    </div>
                    <div className="text-xs text-red font-semibold">
                      {daysOverdue(row.inv.due_date!)} days overdue
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/pro/invoices"
                      className="text-xs font-semibold text-indigo hover:underline"
                    >
                      View
                    </Link>
                    {isDone ? (
                      <span className="anim-scale-in">
                        <Pill accent="indigo">Paid</Pill>
                      </span>
                    ) : (
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={busy === row.key}
                        onClick={() => markPaid(row)}
                      >
                        Mark paid
                      </Btn>
                    )}
                  </div>
                </div>
              );
            }
            const c = row.home.customer;
            const noContact = !c || (!c.phone && !c.email);
            return (
              <div key={row.key} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{row.home.address}</div>
                  <div className="text-xs text-muted">
                    {c?.name ? `${c.name} · ` : ""}record sent {daysAgo(row.home.sentAt)} days ago,
                    not claimed
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill accent="ink">Unclaimed</Pill>
                  {isDone ? (
                    <span className="anim-scale-in">
                      <Pill accent="indigo">Reminded</Pill>
                    </span>
                  ) : (
                    <Btn
                      variant="indigo"
                      size="sm"
                      loading={busy === row.key}
                      disabled={noContact}
                      title={noContact ? "No phone or email on file" : undefined}
                      onClick={() => remind(row)}
                    >
                      Remind
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
