import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Btn, Card, Pill, Toast } from "@/lib/ui";
import { formatDate } from "@/lib/hb";
import {
  formatMoney,
  isOverdue,
  listInvoicesForPro,
  markInvoicePaid,
  voidInvoice,
  type ProInvoice,
} from "@/lib/invoices";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { PlanLock } from "@/components/plan-lock";
import { isProEntitled } from "@/lib/plan";

export const Route = createFileRoute("/pro/invoices/")({
  head: () => ({ meta: [{ title: "Invoices - HomesBrain" }] }),
  component: InvoicesList,
});

type Status = "overdue" | "open" | "paid" | "void";

function statusOf(inv: ProInvoice): Status {
  if (isOverdue(inv)) return "overdue";
  return inv.status;
}

const STATUS_PILL: Record<Status, { accent: "indigo" | "amber" | "coral" | "ink"; label: string }> =
  {
    open: { accent: "indigo", label: "Open" },
    overdue: { accent: "amber", label: "Overdue" },
    paid: { accent: "coral", label: "Paid" },
    void: { accent: "ink", label: "Void" },
  };

function InvoicesList() {
  const { proId, pro } = useProGuard();
  const [rows, setRows] = useState<ProInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      setRows(await listInvoicesForPro(proId));
      setLoading(false);
    })();
  }, [proId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { open: 0, overdue: 0, paid: 0, void: 0 };
    for (const r of rows) c[statusOf(r)] += 1;
    return c;
  }, [rows]);
  const outstanding = useMemo(
    () => rows.filter((r) => r.status === "open").reduce((s, r) => s + Number(r.total), 0),
    [rows],
  );
  const collected = useMemo(
    () => rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.total), 0),
    [rows],
  );

  const filtered = filter === "all" ? rows : rows.filter((r) => statusOf(r) === filter);

  async function onMarkPaid(inv: ProInvoice) {
    if (await markInvoicePaid(inv)) {
      setRows((rs) =>
        rs.map((r) =>
          r.id === inv.id ? { ...r, status: "paid", paid_at: new Date().toISOString() } : r,
        ),
      );
      setToast(`Marked paid: ${formatMoney(Number(inv.total))}`);
    }
  }

  async function onVoid(inv: ProInvoice) {
    if (await voidInvoice(inv)) {
      setRows((rs) => rs.map((r) => (r.id === inv.id ? { ...r, status: "void" } : r)));
      setToast("Invoice voided");
    }
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="invoices">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  if (pro.plan !== "pro") {
    return (
      <ProShell pro={pro} active="invoices">
        <PlanLock
          title="Invoicing + get paid"
          description="Send invoices to homeowners and collect payment through HomesBrain. Included with Pro."
        />
      </ProShell>
    );
  }


  return (
    <ProShell pro={pro} active="invoices">
      <ProPageHead
        eyebrow="Invoices"
        title="Invoices"
        sub="Your ledger: what each customer owes and what you've collected. Tracking only, no payments yet."
        action={
          <Link to="/pro/invoices/new">
            <Btn variant="indigo">
              <Plus size={16} /> New invoice
            </Btn>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <Card className="anim-fade-up text-center py-14">
          <h2 className="text-2xl tracking-tight">No invoices yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Create an invoice for any customer, or start from a job you've already logged.
          </p>
          <div className="mt-6">
            <Link to="/pro/invoices/new">
              <Btn variant="indigo" size="lg">
                Create your first invoice
              </Btn>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="anim-fade-up grid grid-cols-2 gap-4 mb-6 max-w-md">
            <Card className="!p-5">
              <div className="text-xs text-muted">Outstanding</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight tnum">
                {formatMoney(outstanding)}
              </div>
            </Card>
            <Card className="!p-5">
              <div className="text-xs text-muted">Collected</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight tnum text-coral">
                {formatMoney(collected)}
              </div>
            </Card>
          </div>

          <div
            className="anim-fade-up d-1 flex items-center gap-1 rounded-full bg-paper border border-line p-1 w-fit mb-4 overflow-x-auto no-scrollbar max-w-full"
            role="tablist"
            aria-label="Filter invoices"
          >
            {(
              [
                ["all", `All · ${rows.length}`],
                ["open", `Open · ${counts.open}`],
                ["overdue", `Overdue · ${counts.overdue}`],
                ["paid", `Paid · ${counts.paid}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 tnum ${
                  filter === key ? "bg-indigobg text-indigo" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Card className="anim-fade-up d-2 !p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted p-4">No invoices in this state yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {filtered.map((inv) => {
                  const s = STATUS_PILL[statusOf(inv)];
                  const firstItem = inv.items[0]?.description;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 px-3 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">
                          {inv.customers?.name ?? "-"}
                          {firstItem && (
                            <span className="text-muted font-normal"> · {firstItem}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {inv.homes?.address}
                          {inv.due_date && <> · due {formatDate(inv.due_date)}</>}
                        </div>
                      </div>
                      <div className="font-bold text-ink tnum shrink-0">
                        {formatMoney(Number(inv.total))}
                      </div>
                      <Pill accent={s.accent}>{s.label}</Pill>
                      {inv.status === "open" && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Btn variant="secondary" size="sm" onClick={() => onMarkPaid(inv)}>
                            Mark paid
                          </Btn>
                          <button
                            onClick={() => onVoid(inv)}
                            className="pressable text-xs font-semibold text-muted hover:text-red px-1.5 py-1"
                          >
                            Void
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {toast && <Toast>{toast}</Toast>}
    </ProShell>
  );
}
