import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar, Btn, Card } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/records/")({
  head: () => ({ meta: [{ title: "Records - HomesBrain" }] }),
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

function RecordsList() {
  const { proId, pro } = useProGuard();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="records">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="records">
      <ProPageHead eyebrow="Records" title="Your records" />

      {records.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No records yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Log a job and we'll send your customer a record of the work. It shows up here.
          </p>
          <div className="mt-6">
            <Link to="/pro/jobs/new">
              <Btn variant="indigo" size="lg">
                Log a job
              </Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="anim-fade-up d-1 !p-2">
          {/* One quiet ledger, not a wall of cards: the work done leads, the
              customer and date whisper, status is one small colored word. */}
          <div className="divide-y divide-line">
            {records.map((r) => {
              const claimed = Boolean(r.jobs?.homes?.claimed_at);
              const seen = Boolean(r.viewed_at);
              const name = r.jobs?.customers?.name ?? "Customer";
              return (
                <Link
                  key={r.id}
                  to="/pro/records/$recordId"
                  params={{ recordId: r.id }}
                  className="pressable flex items-center gap-3 px-2.5 py-3.5 hover:bg-soft rounded-xl transition-colors duration-150"
                >
                  <Avatar name={name} accent="indigo" size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-ink truncate">
                      {r.jobs?.what_done}
                    </div>
                    <div className="mt-0.5 text-xs text-muted truncate">
                      {name} · {formatDate(r.created_at)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      claimed ? "text-coral" : seen ? "text-indigo" : "text-muted"
                    }`}
                  >
                    {claimed ? "Claimed" : seen ? "Seen" : "Sent"}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </ProShell>
  );
}
