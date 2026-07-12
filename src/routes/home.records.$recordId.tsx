import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { formatDate, recordTitle, tradeLabel } from "@/lib/hb";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { Celebration, consumeCelebration } from "@/components/celebration";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { startInvoiceCheckout } from "@/lib/stripe-connect";

export const Route = createFileRoute("/home/records/$recordId")({
  head: () => ({ meta: [{ title: "Service record - HomesBrain" }] }),
  component: RecordDetail,
});

function RecordDetail() {
  const { recordId } = Route.useParams();

  const navigate = useNavigate();
  const { homeowner, home, records, jobs, equipment, pros, loading } = useHomeownerGuard();

  const record = useMemo(() => records.find((r) => r.id === recordId) ?? null, [records, recordId]);
  const job = useMemo(
    () => (record ? (jobs.find((j) => j.id === record.job_id) ?? null) : null),
    [record, jobs],
  );
  const item = useMemo(
    () => (job?.equipment_id ? (equipment.find((e) => e.id === job.equipment_id) ?? null) : null),
    [job, equipment],
  );
  const pro = useMemo(
    () => (job ? (pros.find((p) => p.id === job.pro_id) ?? null) : null),
    [job, pros],
  );

  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [payErr, setPayErr] = useState<string | null>(null);

  // Play the claim celebration exactly once, on the page the new homeowner
  // lands on. Set in effect (not render) so SSR markup stays clean.
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (consumeCelebration("home_claimed")) setCelebrate(true);
  }, []);

  useEffect(() => {
    if (!home) return;
    (async () => setInvoices(await listInvoicesForHome(home.id)))();
  }, [home]);

  const invoice = useMemo(
    () => invoices.find((i) => i.job_id === record?.job_id) ?? null,
    [invoices, record],
  );

  useEffect(() => {
    if (!loading && !home) navigate({ to: "/home" });
  }, [loading, home, navigate]);

  if (loading) return <PageLoader label="Loading record" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  if (!record || !job) {
    return (
      <HomeShell active="overview" homeowner={homeowner} home={home}>
        <Card className="anim-fade-up text-center py-14">
          <h1 className="text-2xl tracking-tight">Record not found</h1>
          <p className="mt-2 text-sm text-muted">This record isn't on your home.</p>
          <div className="mt-6">
            <Link to="/home">
              <Btn variant="secondary">Back to my home</Btn>
            </Link>
          </div>
        </Card>
      </HomeShell>
    );
  }

  const eqLine = item ? [item.type, item.make, item.model].filter(Boolean).join(" · ") : null;

  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      {celebrate && <Celebration variant="grand" />}
      <Link
        to="/home"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> My home
      </Link>

      <HomePageHead
        eyebrow="Service record"
        title={job.what_done}
        sub={pro ? `${pro.business} · ${tradeLabel(pro.trade)}` : undefined}
        action={
          <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-sm">
            <ShieldCheck size={17} animate={false} /> Verified
          </span>
        }
      />

      <div className="space-y-6">
        <Card className="anim-fade-up d-1">
          <Eyebrow accent="indigo">Details</Eyebrow>
          <div className="mt-2">
            <KV k="Address" v={home.address} mono={false} />
            <KV k="Work done" v={job.what_done} mono={false} />
            <KV k="Date" v={formatDate(job.created_at)} />
            {job.next_service_date && <KV k="Next service" v={formatDate(job.next_service_date)} />}
            {pro && (
              <KV
                k="Serviced by"
                v={
                  <span className="inline-flex items-center gap-1.5">
                    <TradeIcon trade={pro.trade} size={12} className="text-indigo" />
                    {pro.business}
                  </span>
                }
                mono={false}
              />
            )}
          </div>
        </Card>

        {invoice && (
          <Card className="anim-fade-up d-2 border-indigo/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Eyebrow accent="indigo">Invoice</Eyebrow>
              {invoice.status === "paid" ? (
                <Pill accent="indigo">Paid</Pill>
              ) : isOverdue(invoice) ? (
                <Pill accent="red">Overdue</Pill>
              ) : (
                <Pill accent="amber">Open</Pill>
              )}
            </div>
            <div className="mt-3 space-y-1">
              {invoice.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink">{it.description}</span>
                  <span className="text-ink font-semibold tnum">
                    {formatMoney(Number(it.amount))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 mt-2 text-sm font-bold">
                <span>Total</span>
                <span className="tnum">{formatMoney(Number(invoice.total))}</span>
              </div>
              {invoice.due_date && invoice.status === "open" && (
                <div className="text-xs text-muted mt-1">
                  Due {formatDate(invoice.due_date)}
                  {isOverdue(invoice) ? " · overdue" : ""}
                </div>
              )}
              {invoice.note && (
                <div className="text-xs text-muted mt-2 whitespace-pre-wrap">{invoice.note}</div>
              )}
            </div>
            {invoice.status === "open" && (
              <div className="mt-4">
                {invoice.pros?.stripe_charges_enabled ? (
                  <Btn
                    variant="indigo"
                    onClick={async () => {
                      setPayErr(null);
                      try {
                        const { url } = await startInvoiceCheckout(invoice.id);
                        window.location.href = url;
                      } catch (e) {
                        setPayErr(e instanceof Error ? e.message : "Couldn't start payment.");
                      }
                    }}
                  >
                    Pay {formatMoney(Number(invoice.total))}
                  </Btn>
                ) : (
                  <p className="text-xs text-muted">
                    {invoice.pros?.business ?? "Your pro"} hasn't turned on card payments yet.
                  </p>
                )}
                {payErr && (
                  <div role="alert" className="mt-2 text-sm text-red bg-redbg rounded-xl px-3 py-2">
                    {payErr}
                  </div>
                )}
              </div>
            )}
            {invoice.status === "paid" && invoice.paid_at && (
              <div className="mt-3 text-xs text-muted">Paid {formatDate(invoice.paid_at)}</div>
            )}
          </Card>
        )}

        {item && (
          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Equipment</Eyebrow>
            <div className="mt-2">
              <KV k="Item" v={eqLine || item.type || "-"} mono={false} />
              {item.serial && <KV k="Serial" v={item.serial} />}
              {item.warranty_until && (
                <KV k="Warranty" v={`Until ${formatDate(item.warranty_until)}`} />
              )}
              <KV
                k="Recall"
                v={
                  <Pill accent={item.recall_status === "none" ? "indigo" : "red"}>
                    {item.recall_status === "none" ? "No known recalls" : item.recall_status}
                  </Pill>
                }
                mono={false}
              />
            </div>
            <div className="mt-4">
              <Link to="/home/items/$itemId" params={{ itemId: item.id }}>
                <Btn variant="secondary">Open item history</Btn>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </HomeShell>
  );
}
