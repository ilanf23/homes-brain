import { Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { Card } from "@/lib/ui";
import { BarChart, CountUp, type BarGroup } from "@/components/svg";
import type { ProInvoice } from "@/lib/invoices";

/* Money headline row: billed / collected / outstanding / rebooked tiles plus
   a 6-month billed-vs-collected bar chart. Every tile links to the page
   behind the number. Currency renders without cents per the spec. */

const money0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function monthIndex(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() * 12 + d.getMonth();
}

function Tile({
  label,
  value,
  sub,
  coral = false,
  to,
  delay,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  coral?: boolean;
  to: "/pro/invoices" | "/pro/due";
  delay: 1 | 2 | 3 | 4;
}) {
  return (
    <Link to={to} className="block">
      <Card lift className={`anim-fade-up d-${delay} h-full`}>
        <div className="text-xs uppercase tracking-wider text-muted font-bold">{label}</div>
        <div
          className={`mt-2 text-2xl font-semibold font-display tnum ${coral ? "text-coral" : "text-ink"}`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </Card>
    </Link>
  );
}

export function MoneyRow({
  invoices,
  rebooksThisMonth,
  rebooksAllTime,
}: {
  invoices: ProInvoice[];
  rebooksThisMonth: number;
  rebooksAllTime: number;
}) {
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();

  const { billedMonth, collectedMonth, outstanding, groups, windowRate } = useMemo(() => {
    const notVoid = invoices.filter((i) => i.status !== "void");
    const billedMonth = notVoid
      .filter((i) => monthIndex(i.created_at) === nowIdx)
      .reduce((s, i) => s + Number(i.total), 0);
    const collectedMonth = invoices
      .filter((i) => i.paid_at && monthIndex(i.paid_at) === nowIdx)
      .reduce((s, i) => s + Number(i.total), 0);
    const outstanding = invoices
      .filter((i) => i.status === "open")
      .reduce((s, i) => s + Number(i.total), 0);

    const months: { label: string; billed: number; collected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "narrow" }),
        billed: 0,
        collected: 0,
      });
    }
    const startIdx = nowIdx - 5;
    for (const i of notVoid) {
      const bi = monthIndex(i.created_at) - startIdx;
      if (bi >= 0 && bi <= 5) months[bi].billed += Number(i.total);
    }
    for (const i of invoices) {
      if (!i.paid_at) continue;
      const ci = monthIndex(i.paid_at) - startIdx;
      if (ci >= 0 && ci <= 5) months[ci].collected += Number(i.total);
    }
    const groups: BarGroup[] = months.map((m) => ({
      label: m.label,
      bars: [
        {
          value: m.billed,
          fill: "var(--indigobg)",
          stroke: "var(--indigo)",
          title: `Billed ${money0.format(m.billed)}`,
        },
        {
          value: m.collected,
          fill: "var(--indigo)",
          title: `Collected ${money0.format(m.collected)}`,
        },
      ],
    }));
    const windowBilled = months.reduce((s, m) => s + m.billed, 0);
    const windowCollected = months.reduce((s, m) => s + m.collected, 0);
    const windowRate = windowBilled > 0 ? Math.round((windowCollected / windowBilled) * 100) : null;
    return { billedMonth, collectedMonth, outstanding, groups, windowRate };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, nowIdx]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Tile
          label="Billed this month"
          value={money0.format(billedMonth)}
          to="/pro/invoices"
          delay={1}
        />
        <Tile
          label="Collected this month"
          value={money0.format(collectedMonth)}
          to="/pro/invoices"
          delay={2}
        />
        <Tile
          label="Outstanding"
          value={money0.format(outstanding)}
          coral={outstanding > 0}
          sub={outstanding > 0 ? "Open invoices" : "Nothing owed"}
          to="/pro/invoices"
          delay={3}
        />
        <Tile
          label="Rebooked"
          value={<CountUp value={rebooksThisMonth} className="text-coral" />}
          sub={`this month · ${rebooksAllTime} all time`}
          to="/pro/due"
          delay={4}
        />
      </div>
      <Card className="anim-fade-up d-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">
            Billed vs collected · 6 months
          </div>
          {windowRate !== null && (
            <div className="text-xs font-semibold text-indigo tnum">{windowRate}% collected</div>
          )}
        </div>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Invoices you send will chart here.{" "}
            <Link to="/pro/invoices/new" className="font-semibold text-indigo hover:underline">
              Create your first invoice
            </Link>
          </p>
        ) : (
          <div className="mt-3">
            <BarChart groups={groups} height={110} />
            <div className="mt-2 flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: "var(--indigobg)", border: "1px solid var(--indigo)" }}
                />
                Billed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: "var(--indigo)" }}
                />
                Collected
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
