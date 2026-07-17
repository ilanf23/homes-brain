import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Avatar, Btn, Card, Eyebrow, Field, Input, Textarea } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/hb";
import { createInvoice, formatMoney, type InvoiceItem } from "@/lib/invoices";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/invoices/new")({
  head: () => ({ meta: [{ title: "New invoice - HomesBrain" }] }),
  validateSearch: (search: Record<string, unknown>): { customer?: string; job?: string } => ({
    customer: typeof search.customer === "string" ? search.customer : undefined,
    job: typeof search.job === "string" ? search.job : undefined,
  }),
  component: NewInvoice,
});

type CustomerRow = {
  id: string;
  name: string;
  home_id: string;
  homes: { address: string } | null;
};
type JobRow = {
  id: string;
  what_done: string;
  created_at: string;
  home_id: string;
  homes: { address: string } | null;
};

type ItemDraft = { description: string; amount: string };

function NewInvoice() {
  const { proId, pro } = useProGuard();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customerId, setCustomerId] = useState<string>(search.customer ?? "");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobId, setJobId] = useState<string>(search.job ?? "");
  const [items, setItems] = useState<ItemDraft[]>([{ description: "", amount: "" }]);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,name,home_id,homes(address)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setCustomers((data ?? []) as unknown as CustomerRow[]);
      setLoading(false);
    })();
  }, [proId]);

  const customer = customers.find((c) => c.id === customerId) ?? null;

  // Jobs for the picked customer, so an invoice can start from logged work.
  // By customer, not by home: a customer can hold several properties, and the
  // picked job decides which house the invoice belongs to.
  useEffect(() => {
    if (!proId || !customerId) {
      setJobs([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,what_done,created_at,home_id,homes(address)")
        .eq("pro_id", proId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      setJobs((data ?? []) as unknown as JobRow[]);
    })();
  }, [proId, customerId]);

  function pickJob(j: JobRow | null) {
    const next = j?.id === jobId ? null : j;
    setJobId(next?.id ?? "");
    // Prefill the first line only when the pro hasn't typed anything yet.
    if (next && !items[0]?.description.trim()) {
      setItems((its) => [{ ...its[0], description: next.what_done }, ...its.slice(1)]);
    }
  }

  function setItem(i: number, patch: Partial<ItemDraft>) {
    setItems((its) => its.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const parsed: InvoiceItem[] = useMemo(
    () =>
      items
        .map((it) => ({ description: it.description.trim(), amount: parseFloat(it.amount) }))
        .filter((it) => it.description && Number.isFinite(it.amount) && it.amount > 0),
    [items],
  );
  const total = parsed.reduce((s, it) => s + it.amount, 0);

  async function submit() {
    if (!proId || !customer) {
      setError("Pick a customer first.");
      return;
    }
    if (parsed.length === 0) {
      setError("Add at least one line item with a description and an amount.");
      return;
    }
    setError(null);
    setSaving(true);
    // A linked job pins the invoice to the house the work happened at; without
    // one, fall back to the customer's primary home.
    const pickedJob = jobs.find((j) => j.id === jobId) ?? null;
    const inv = await createInvoice({
      proId,
      customerId: customer.id,
      homeId: pickedJob?.home_id ?? customer.home_id,
      jobId: jobId || null,
      items: parsed,
      dueDate: dueDate || null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (!inv) {
      setError("Could not save the invoice. Try again.");
      return;
    }
    navigate({ to: "/pro/invoices" });
  }

  if (!pro || loading) {
    return (
      <ProShell pro={pro} active="invoices">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="invoices">
      <Link
        to="/pro/invoices"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-4"
      >
        <ArrowLeft size={15} /> Invoices
      </Link>
      <ProPageHead
        eyebrow="Invoices"
        title="New invoice"
        sub="Pick a customer, add what you're billing for. You track it here; nothing is sent."
      />

      <div className="space-y-6 max-w-2xl">
        {/* Customer */}
        <Card className="anim-fade-up">
          <Eyebrow accent="indigo">Customer</Eyebrow>
          {customers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No customers yet.{" "}
              <Link to="/pro/jobs/new" className="text-indigo font-semibold hover:underline">
                Log a job
              </Link>{" "}
              to add your first one.
            </p>
          ) : (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCustomerId(c.id === customerId ? "" : c.id);
                    setJobId("");
                  }}
                  aria-pressed={c.id === customerId}
                  className={`pressable w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${
                    c.id === customerId
                      ? "border-indigo bg-indigobg/50"
                      : "border-line hover:border-ink/20"
                  }`}
                >
                  <Avatar name={c.name} accent="indigo" />
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{c.name}</div>
                    <div className="text-xs text-muted truncate">{c.homes?.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Optional job link */}
        {customer && jobs.length > 0 && (
          <Card className="anim-fade-up">
            <Eyebrow accent="indigo">From a job (optional)</Eyebrow>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => pickJob(j)}
                  aria-pressed={j.id === jobId}
                  className={`pressable w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${
                    j.id === jobId
                      ? "border-indigo bg-indigobg/50"
                      : "border-line hover:border-ink/20"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{j.what_done}</div>
                    {new Set(jobs.map((x) => x.home_id)).size > 1 && j.homes?.address && (
                      <div className="text-xs text-muted truncate">{j.homes.address}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted font-mono tnum shrink-0">
                    {formatDate(j.created_at)}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Line items */}
        <Card className="anim-fade-up">
          <Eyebrow accent="indigo">Line items</Eyebrow>
          <div className="mt-3 space-y-2.5">
            {items.map((it, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="What you're billing for"
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={it.amount}
                    onChange={(e) => setItem(i, { amount: e.target.value })}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))}
                    aria-label="Remove line"
                    className="pressable text-muted hover:text-red p-2.5 rounded-lg"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setItems((its) => [...its, { description: "", amount: "" }])}
              className="pressable inline-flex items-center gap-1.5 text-sm font-semibold text-indigo hover:underline"
            >
              <Plus size={15} /> Add line
            </button>
            <div className="text-sm text-muted">
              Total <span className="font-bold text-ink tnum">{formatMoney(total)}</span>
            </div>
          </div>
        </Card>

        {/* Terms */}
        <Card className="anim-fade-up">
          <Eyebrow accent="indigo">Terms</Eyebrow>
          <div className="mt-3 grid sm:grid-cols-2 gap-4">
            <Field label="Due date (optional)">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Note (optional)">
              <Textarea
                rows={2}
                placeholder="Thanks for your business"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {error && (
          <div className="anim-fade-up rounded-2xl bg-redbg text-red px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="anim-fade-up flex items-center justify-end gap-3">
          <Link to="/pro/invoices">
            <Btn variant="secondary">Cancel</Btn>
          </Link>
          <Btn variant="indigo" size="lg" loading={saving} onClick={submit}>
            Create invoice · {formatMoney(total)}
          </Btn>
        </div>
      </div>
    </ProShell>
  );
}
