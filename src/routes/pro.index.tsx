import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ChevronRight, Plus, ChevronDown, Check } from "lucide-react";
import { Btn, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl, recordTitle } from "@/lib/hb";
import { track } from "@/lib/events";
import { reverseGeocode } from "@/lib/geo";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { ProSetupChecklist } from "@/components/pro-setup-checklist";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "HomesBrain" }] }),
  component: ProHome,
});

const DAY = 24 * 3600 * 1000;

type FollowUpRow = {
  id: string;
  what_done: string;
  next_service_date: string | null;
  equipment_type: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  address: string | null;
};

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function dueLabel(iso: string): { text: string; tone: "red" | "amber" | "indigo" } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  const diffDays = Math.round((target.getTime() - now.getTime()) / DAY);
  if (diffDays < 0) {
    const n = -diffDays;
    return {
      text: `Overdue by ${n} day${n === 1 ? "" : "s"}`,
      tone: "red",
    };
  }
  if (diffDays === 0) return { text: "Due today", tone: "amber" };
  if (diffDays === 1) return { text: "Due tomorrow", tone: "amber" };
  if (diffDays <= 14) return { text: `Due in ${diffDays} days`, tone: "amber" };
  if (diffDays <= 60) {
    const weeks = Math.round(diffDays / 7);
    return { text: `Due in ${weeks} week${weeks === 1 ? "" : "s"}`, tone: "indigo" };
  }
  const months = Math.round(diffDays / 30);
  return { text: `Due in ${months} month${months === 1 ? "" : "s"}`, tone: "indigo" };
}

function addMonthsIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function ProHome() {
  const { proId, pro } = useProGuard();
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [reviewAsks7d, setReviewAsks7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locationText, setLocationText] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [datePickerFor, setDatePickerFor] = useState<string | null>(null);
  const [pickerValue, setPickerValue] = useState<string>("");

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: rv }, { count: totalJobCount }] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,what_done,next_service_date,no_follow_up,follow_up_handled_at,customers(id,name,phone,email),homes(address),equipment(type)",
          )
          .eq("pro_id", proId)
          .eq("no_follow_up", false)
          .is("follow_up_handled_at", null)
          .order("next_service_date", { ascending: true, nullsFirst: true }),
        supabase
          .from("events")
          .select("id", { count: "exact", head: false })
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .gte("created_at", new Date(Date.now() - 7 * DAY).toISOString()),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("pro_id", proId),
      ]);
      if (cancelled) return;
      const mapped: FollowUpRow[] = ((j ?? []) as unknown as Array<{
        id: string;
        what_done: string;
        next_service_date: string | null;
        customers: FollowUpRow["customer"];
        homes: { address: string } | null;
        equipment: { type: string | null } | null;
      }>).map((row) => ({
        id: row.id,
        what_done: row.what_done,
        next_service_date: row.next_service_date,
        equipment_type: row.equipment?.type ?? null,
        customer: row.customers,
        address: row.homes?.address ?? null,
      }));
      setRows(mapped);
      setReviewAsks7d(rv?.length ?? 0);
      setJobCount(totalJobCount ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (r?.address) setLocationText(r.address);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const needsDecision = useMemo(
    () => rows.filter((r) => !r.next_service_date),
    [rows],
  );
  const dated = useMemo(
    () =>
      rows
        .filter((r) => !!r.next_service_date)
        .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1)),
    [rows],
  );

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveFollowUpDate(row: FollowUpRow, iso: string) {
    if (!iso) return;
    setBusy(row.id);
    const { error } = await supabase
      .from("jobs")
      .update({ next_service_date: iso })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      setToast("Couldn't save that date. Try again.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, next_service_date: iso } : r)),
    );
    setDatePickerFor(null);
    setToast("Follow-up scheduled");
  }

  async function markNoFollowUp(row: FollowUpRow) {
    setBusy(row.id);
    const { error } = await supabase
      .from("jobs")
      .update({ no_follow_up: true })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      setToast("Couldn't update. Try again.");
      return;
    }
    removeRow(row.id);
    setToast("Marked as no follow-up needed");
  }

  async function markDone(row: FollowUpRow) {
    setBusy(row.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({ follow_up_handled_at: now })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      setToast("Couldn't update. Try again.");
      return;
    }
    removeRow(row.id);
    setToast("Marked done");
  }

  async function sendReminder(row: FollowUpRow) {
    if (!row.customer?.email) return;
    setBusy(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-follow-up", {
        body: {
          job_id: row.id,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        setToast("Couldn't send email. Try again.");
        return;
      }
      await track("pro", proId, "follow_up_reminder_sent", {
        job_id: row.id,
        customer_id: row.customer.id,
      });
      removeRow(row.id);
      setToast(`Reminder sent to ${row.customer.name.split(" ")[0]}`);
    } finally {
      setBusy(null);
    }
  }

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="home" hideMobileCta>
        <ProPageSkeleton variant="list" />
      </ProShell>
    );
  }

  const firstName =
    (pro.owner_first_name?.trim() || pro.business?.split(" ")[0] || "").trim();
  const greeting = firstName
    ? `${timeOfDayGreeting()}, ${firstName}.`
    : `${timeOfDayGreeting()}.`;

  const googleConnected = isGoogleUrl(pro.google_place_id) && pro.google_rating != null;
  const totalOpen = needsDecision.length + dated.length;

  return (
    <ProShell pro={pro} active="home" hideMobileCta>
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
        {locationText && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1.5 text-xs text-muted">
            <MapPin size={13} className="text-indigo" />
            <span>
              You're at <span className="text-ink font-semibold">{locationText}</span>
            </span>
          </div>
        )}
      </div>

      <Link to="/pro/jobs/new" className="anim-fade-up d-1 block mt-6">
        <button
          type="button"
          className="pressable w-full rounded-3xl bg-indigo text-white text-left px-6 py-7 sm:px-8 sm:py-9 shadow-[0_18px_40px_-14px_rgba(71,63,176,0.55)] hover:shadow-[0_22px_48px_-14px_rgba(71,63,176,0.65)] transition-shadow"
        >
          <div className="flex items-center gap-5">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 shrink-0">
              <Plus size={32} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-bold leading-tight">Log a job</div>
              <div className="mt-1 text-sm sm:text-base text-white/85">
                {jobCount === 0
                  ? "Start with one you already did — 30 seconds."
                  : "30 seconds. Just talk and tap."}
              </div>
            </div>
          </div>
        </button>
      </Link>

      <ProSetupChecklist proId={proId} />

      {/* What's Next */}
      <section className="anim-fade-up d-2 mt-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-ink">What's Next</h2>
          {needsDecision.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amberbg text-amberdark px-2.5 py-1 text-xs font-semibold">
              <AlertCircle size={12} />
              {needsDecision.length} need{needsDecision.length === 1 ? "s" : ""} a decision
            </span>
          )}
        </div>

        {totalOpen === 0 ? (
          <Card className="text-center py-8">
            <div className="text-base font-semibold text-ink">
              You're all caught up
            </div>
            <div className="mt-1 text-sm text-muted">
              No follow-ups due. Log another job and it'll show up here.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Tier A: needs a decision */}
            {needsDecision.map((row) => {
              const title = recordTitle(row.what_done, row.equipment_type);
              const isPicking = datePickerFor === row.id;
              return (
                <Card
                  key={row.id}
                  className="!p-4 sm:!p-5 border-amber/40 bg-amberbg/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg font-semibold text-ink truncate">
                        {row.customer?.name ?? "Customer"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink/80">{title}</div>
                      {row.address && (
                        <div className="mt-0.5 text-xs text-muted truncate">
                          {row.address}
                        </div>
                      )}
                      <div className="mt-2 text-sm text-amberdark">
                        Set when you'll check back in — or mark this one as no follow-up needed.
                      </div>
                    </div>
                  </div>
                  {isPicking ? (
                    <div className="mt-3 border-t border-amber/30 pt-3">
                      <Field label="Follow-up date">
                        <Input
                          type="date"
                          value={pickerValue}
                          onChange={(e) => setPickerValue(e.target.value)}
                        />
                      </Field>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[3, 6, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPickerValue(addMonthsIso(m))}
                            className="pressable rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink hover:border-indigo hover:text-indigo transition-colors"
                          >
                            {m} months
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Btn
                          variant="indigo"
                          size="sm"
                          loading={busy === row.id}
                          disabled={!pickerValue}
                          onClick={() => saveFollowUpDate(row, pickerValue)}
                        >
                          Save
                        </Btn>
                        <button
                          type="button"
                          onClick={() => {
                            setDatePickerFor(null);
                            setPickerValue("");
                          }}
                          className="text-sm text-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Btn
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          setPickerValue(addMonthsIso(6));
                          setDatePickerFor(row.id);
                        }}
                      >
                        Set follow-up date
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        loading={busy === row.id}
                        onClick={() => markNoFollowUp(row)}
                      >
                        No follow-up needed
                      </Btn>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Tier B: dated */}
            {dated.map((row) => {
              const label = dueLabel(row.next_service_date!);
              const title = recordTitle(row.what_done, row.equipment_type);
              const canEmail = !!row.customer?.email;
              return (
                <Card key={row.id} className="!p-4 sm:!p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg font-semibold text-ink truncate">
                        {row.customer?.name ?? "Customer"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink/80">{title}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Pill accent={label.tone === "red" ? "coral" : label.tone === "amber" ? "amber" : "indigo"}>
                          {label.text}
                        </Pill>
                        <span className="text-xs text-muted">
                          {formatDate(row.next_service_date)}
                        </span>
                        {row.address && (
                          <span className="text-xs text-muted truncate">
                            · {row.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Btn
                      variant="indigo"
                      size="sm"
                      loading={busy === row.id}
                      disabled={!canEmail}
                      title={canEmail ? undefined : "No email on file."}
                      onClick={() => sendReminder(row)}
                    >
                      Send reminder
                    </Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      loading={busy === row.id}
                      onClick={() => markDone(row)}
                    >
                      Mark done
                    </Btn>
                    {!canEmail && (
                      <span className="text-xs text-muted inline-flex items-center gap-1">
                        <X size={12} /> No email on file
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {googleConnected && (
        <section className="anim-fade-up d-3 mt-8">
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted">
                {reviewAsks7d > 0 ? "Nice week" : "This week"}
              </div>
              <div className="mt-0.5 text-xl font-semibold text-ink">
                {pro.google_rating} ★ on Google
              </div>
              {reviewAsks7d > 0 && (
                <div className="mt-0.5 text-sm text-muted">
                  {reviewAsks7d} review {reviewAsks7d === 1 ? "ask" : "asks"} sent in the last 7 days
                </div>
              )}
            </div>
            <Link to="/pro/reviews" className="shrink-0">
              <Btn variant="ghost" size="sm">
                Reviews
              </Btn>
            </Link>
          </Card>
        </section>
      )}

      <div className="anim-fade-up d-4 mt-10 mb-4">
        <Link
          to="/pro/office"
          className="pressable flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          <span>My numbers, map and customers</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
