import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import {
  formatMoney,
  isOverdue,
  listInvoicesForCustomer,
  markInvoicePaid,
  type Invoice,
} from "@/lib/invoices";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/customers/$customerId")({
  head: () => ({ meta: [{ title: "Customer - HomesBrain" }] }),
  component: CustomerDetail,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  consent_at: string | null;
  created_at: string;
  home_id: string;
  homes: { id: string; address: string; claimed_at: string | null } | null;
};
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  next_service_date: string | null;
  records: { id: string; viewed_at: string | null; sent_sms_at: string | null }[] | null;
};
type EquipmentRow = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  recall_status: string;
};

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { proId, pro } = useProGuard();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("id,name,phone,email,consent_at,created_at,home_id,homes(id,address,claimed_at)")
        .eq("id", customerId)
        .eq("pro_id", proId)
        .maybeSingle();
      const cust = c as unknown as Customer | null;
      setCustomer(cust);
      if (cust) {
        const [{ data: j }, { data: eq }, inv] = await Promise.all([
          supabase
            .from("jobs")
            .select("id,what_done,created_at,next_service_date,records(id,viewed_at,sent_sms_at)")
            .eq("home_id", cust.home_id)
            .eq("pro_id", proId)
            .order("created_at", { ascending: false }),
          supabase
            .from("equipment")
            .select("id,type,make,model,warranty_until,recall_status")
            .eq("home_id", cust.home_id)
            .order("created_at", { ascending: false }),
          listInvoicesForCustomer(proId, customerId),
        ]);
        setJobs((j ?? []) as unknown as JobRow[]);
        setEquipment((eq ?? []) as EquipmentRow[]);
        setInvoices(inv);
      }
      setLoading(false);
    })();
  }, [proId, customerId]);

  async function onMarkPaid(inv: Invoice) {
    if (await markInvoicePaid(inv)) {
      setInvoices((rs) =>
        rs.map((r) =>
          r.id === inv.id ? { ...r, status: "paid", paid_at: new Date().toISOString() } : r,
        ),
      );
    }
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="customers">
        <ProPageSkeleton />
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

  return (
    <ProShell pro={pro} active="customers">
      <Link
        to="/pro/customers"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Customers
      </Link>

      <div className="anim-fade-up flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} accent="indigo" size={52} />
          <div>
            <h1 className="text-3xl tracking-tight">{customer.name}</h1>
            <div className="text-sm text-muted">{customer.homes?.address}</div>
          </div>
        </div>
        <Link to="/pro/jobs/new">
          <Btn variant="indigo">+ Log a job here</Btn>
        </Link>
      </div>

      <div className="grid md:grid-cols-[1fr_1.4fr] gap-5 items-start">
        <div className="space-y-5">
          <Card className="anim-fade-up d-1">
            <Eyebrow accent="indigo">Contact</Eyebrow>
            <div className="mt-2">
              {customer.phone && <KV k="Phone" v={customer.phone} />}
              {customer.email && <KV k="Email" v={customer.email} />}
              <KV k="Customer since" v={formatDate(customer.created_at)} />
              <KV
                k="Consent"
                v={
                  customer.consent_at ? (
                    <Pill accent="indigo">On file · {formatDate(customer.consent_at)}</Pill>
                  ) : (
                    <Pill accent="red">Missing</Pill>
                  )
                }
                mono={false}
              />
              <KV
                k="Home claimed"
                v={
                  customer.homes?.claimed_at ? (
                    <Pill accent="coral">Yes · {formatDate(customer.homes.claimed_at)}</Pill>
                  ) : (
                    <Pill accent="ink">Not yet</Pill>
                  )
                }
                mono={false}
              />
            </div>
          </Card>

          <Card className="anim-fade-up d-2">
            <div className="flex items-center justify-between">
              <Eyebrow accent="indigo">Invoices</Eyebrow>
              <Link
                to="/pro/invoices/new"
                search={{ customer: customer.id, job: undefined }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                New invoice
              </Link>
            </div>
            {invoices.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No invoices yet.</p>
            ) : (
              <>
                {(() => {
                  const open = invoices.filter((i) => i.status === "open");
                  const balance = open.reduce((s, i) => s + Number(i.total), 0);
                  return open.length > 0 ? (
                    <div className="mt-2 text-sm text-muted">
                      Open balance{" "}
                      <span className="font-bold text-ink tnum">{formatMoney(balance)}</span>
                    </div>
                  ) : null;
                })()}
                <div className="mt-2 divide-y divide-line">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink tnum">
                          {formatMoney(Number(inv.total))}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {inv.items[0]?.description ?? ""}
                          {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
          </Card>

          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Equipment on file</Eyebrow>
            {equipment.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing on file yet.</p>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {equipment.map((e) => (
                  <div key={e.id} className="py-3">
                    <div className="font-semibold text-ink">{e.type ?? "Equipment"}</div>
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
          </Card>
        </div>

        <Card className="anim-fade-up d-2">
          <Eyebrow accent="indigo">Service history at this home</Eyebrow>
          {jobs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No jobs logged yet.</p>
          ) : (
            <div className="mt-2 divide-y divide-line">
              {jobs.map((j) => {
                const rec = j.records?.[0];
                return (
                  <div key={j.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{j.what_done}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {formatDate(j.created_at)}
                        {j.next_service_date
                          ? ` · next service ${formatDate(j.next_service_date)}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {rec?.viewed_at ? (
                        <Pill accent="indigo">Viewed</Pill>
                      ) : rec?.sent_sms_at ? (
                        <Pill accent="indigo">Sent</Pill>
                      ) : null}
                      {rec && (
                        <div>
                          <Link
                            to="/pro/records/$recordId"
                            params={{ recordId: rec.id }}
                            className="text-xs font-semibold text-indigo hover:underline"
                          >
                            View record →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </ProShell>
  );
}
