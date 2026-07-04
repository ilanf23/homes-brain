import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/records/")({
  head: () => ({ meta: [{ title: "Records — HomesBrain" }] }),
  component: RecordsList,
});

type RecordRow = {
  id: string;
  created_at: string;
  sent_sms_at: string | null;
  sent_email_at: string | null;
  viewed_at: string | null;
  jobs: {
    what_done: string;
    customers: { name: string } | null;
    homes: { address: string; claimed_at: string | null } | null;
  } | null;
};

type Status = "claimed" | "viewed" | "sent" | "created";

function statusOf(r: RecordRow): Status {
  if (r.jobs?.homes?.claimed_at) return "claimed";
  if (r.viewed_at) return "viewed";
  if (r.sent_sms_at || r.sent_email_at) return "sent";
  return "created";
}

const STATUS_PILL: Record<Status, { accent: "coral" | "teal" | "indigo" | "ink"; label: string }> =
  {
    claimed: { accent: "coral", label: "Claimed" },
    viewed: { accent: "teal", label: "Viewed" },
    sent: { accent: "indigo", label: "Sent" },
    created: { accent: "ink", label: "Created" },
  };

function RecordsList() {
  const { proId, pro } = useProGuard();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Status>("all");

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(
          "id,created_at,sent_sms_at,sent_email_at,viewed_at,jobs!inner(pro_id,what_done,customers(name),homes(address,claimed_at))",
        )
        .eq("jobs.pro_id", proId)
        .order("created_at", { ascending: false });
      setRecords((data ?? []) as unknown as RecordRow[]);
      setLoading(false);
    })();
  }, [proId]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { claimed: 0, viewed: 0, sent: 0, created: 0 };
    for (const r of records) c[statusOf(r)] += 1;
    return c;
  }, [records]);

  const filtered = filter === "all" ? records : records.filter((r) => statusOf(r) === filter);

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="records">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="records">
      <ProPageHead
        eyebrow="Records"
        title="Sent records"
        sub="Every branded record you've sent, and how far it traveled: sent → viewed → claimed."
      />

      {records.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No records yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Log a job and we'll send a branded service record to your customer. It shows up here.
          </p>
          <div className="mt-6">
            <Link to="/pro/jobs/new">
              <Btn variant="teal" size="lg">
                Log a job
              </Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div
            className="anim-fade-up flex items-center gap-1 rounded-full bg-paper border border-line p-1 w-fit mb-4 overflow-x-auto no-scrollbar max-w-full"
            role="tablist"
            aria-label="Filter records"
          >
            {(
              [
                ["all", `All · ${records.length}`],
                ["sent", `Sent · ${counts.sent}`],
                ["viewed", `Viewed · ${counts.viewed}`],
                ["claimed", `Claimed · ${counts.claimed}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 tnum ${
                  filter === key ? "bg-tealbg text-teal" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Card className="anim-fade-up d-1 !p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted p-4">No records in this state yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {filtered.map((r) => {
                  const s = STATUS_PILL[statusOf(r)];
                  return (
                    <Link
                      key={r.id}
                      to="/pro/records/$recordId"
                      params={{ recordId: r.id }}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-soft active:bg-line/50 transition-colors duration-150"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">
                          {r.jobs?.customers?.name ?? "—"}
                          <span className="text-muted font-normal"> · {r.jobs?.what_done}</span>
                        </div>
                        <div className="text-xs text-muted truncate">{r.jobs?.homes?.address}</div>
                      </div>
                      <div className="text-xs text-muted font-mono tnum hidden sm:block">
                        {formatDate(r.created_at)}
                      </div>
                      <Pill accent={s.accent}>{s.label}</Pill>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </ProShell>
  );
}
