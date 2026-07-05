import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { buildRecordUrl, formatDate } from "@/lib/hb";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/records/$recordId")({
  head: () => ({ meta: [{ title: "Record - HomesBrain" }] }),
  component: RecordDetail,
});

type RecordRow = {
  id: string;
  created_at: string;
  sent_sms_at: string | null;
  sent_email_at: string | null;
  viewed_at: string | null;
  jobs: {
    id: string;
    what_done: string;
    created_at: string;
    next_service_date: string | null;
    pro_id: string;
    customers: { id: string; name: string; phone: string | null; email: string | null } | null;
    homes: { address: string; claimed_at: string | null } | null;
    equipment: {
      type: string | null;
      make: string | null;
      model: string | null;
      recall_status: string;
    } | null;
  } | null;
};

function RecordDetail() {
  const { recordId } = Route.useParams();
  const { proId, pro } = useProGuard();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(
          "id,created_at,sent_sms_at,sent_email_at,viewed_at,jobs!inner(id,what_done,created_at,next_service_date,pro_id,customers(id,name,phone,email),homes(address,claimed_at),equipment(type,make,model,recall_status))",
        )
        .eq("id", recordId)
        .eq("jobs.pro_id", proId)
        .maybeSingle();
      setRecord(data as unknown as RecordRow | null);
      setLoading(false);
    })();
  }, [proId, recordId]);

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="records">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (!record) {
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

  const job = record.jobs;
  const claimed = !!job?.homes?.claimed_at;
  const publicUrl = buildRecordUrl(record.id);

  // The journey the record travels - each step lights up as it happens.
  const steps: { label: string; at: string | null }[] = [
    { label: "Created", at: record.created_at },
    { label: "Sent", at: record.sent_sms_at ?? record.sent_email_at },
    { label: "Viewed", at: record.viewed_at },
    { label: "Home claimed", at: job?.homes?.claimed_at ?? null },
  ];

  return (
    <ProShell pro={pro} active="records">
      <Link
        to="/pro/records"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Records
      </Link>

      <div className="anim-fade-up flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="eyebrow text-indigo">Record</div>
          <h1 className="mt-1 text-3xl tracking-tight">{job?.what_done}</h1>
          <div className="text-sm text-muted mt-1">
            {job?.customers?.name} · {job?.homes?.address}
          </div>
        </div>
        <a href={publicUrl} target="_blank" rel="noreferrer">
          <Btn variant="indigo">
            View public record <ExternalLink size={15} />
          </Btn>
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-start">
        <Card className="anim-fade-up d-1">
          <Eyebrow accent="indigo">Journey</Eyebrow>
          <div className="mt-3 space-y-0">
            {steps.map((s, i) => (
              <div key={s.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 ${s.at ? "bg-indigo" : "bg-line"}`}
                    aria-hidden="true"
                  />
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 ${s.at ? "bg-indigo/40" : "bg-line"}`} />
                  )}
                </div>
                <div className="pb-5">
                  <div className={`text-sm font-semibold ${s.at ? "text-ink" : "text-muted"}`}>
                    {s.label}
                  </div>
                  <div className="text-xs text-muted tnum">
                    {s.at ? formatDate(s.at) : "Not yet"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {claimed && (
            <div className="rounded-xl bg-coralbg p-3 text-sm text-coraldark font-semibold">
              This homeowner claimed their home. The loop worked.
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Job</Eyebrow>
            <div className="mt-2">
              <KV k="Work done" v={job?.what_done ?? ""} mono={false} />
              <KV k="Logged" v={formatDate(job?.created_at)} />
              {job?.next_service_date && (
                <KV k="Next service" v={formatDate(job.next_service_date)} />
              )}
              <KV
                k="Customer"
                v={
                  job?.customers ? (
                    <Link
                      to="/pro/customers/$customerId"
                      params={{ customerId: job.customers.id }}
                      className="text-indigo hover:underline"
                    >
                      {job.customers.name}
                    </Link>
                  ) : (
                    "-"
                  )
                }
                mono={false}
              />
              <KV k="Sent to" v={job?.customers?.phone ?? job?.customers?.email ?? "-"} />
            </div>
          </Card>

          {job?.equipment && (
            <Card className="anim-fade-up d-3">
              <Eyebrow accent="indigo">Equipment</Eyebrow>
              <div className="mt-2">
                <KV k="Type" v={job.equipment.type ?? "-"} mono={false} />
                <KV
                  k="Make / model"
                  v={[job.equipment.make, job.equipment.model].filter(Boolean).join(" · ") || "-"}
                />
                <KV
                  k="Recall"
                  v={
                    <Pill accent={job.equipment.recall_status === "none" ? "indigo" : "red"}>
                      {job.equipment.recall_status === "none" ? "No known recalls" : "Recall"}
                    </Pill>
                  }
                  mono={false}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </ProShell>
  );
}
