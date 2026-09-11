import { useState } from "react";
import { ArrowDownUp, CalendarRange, Printer } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Button, EmptyState, Field, Input, PageHeader, Panel, RowSkeleton } from "../../components/ui";
import { money, dateOnly, fromISO, todayInput } from "../../lib/format";

function fyStart() {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const d = new Date(y, 3, 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-01`;
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState(fyStart());
  const [to, setTo] = useState(todayInput());
  const { data, loading, reload } = useFetch(`/reports/pnl?from=${from}&to=${to}`);

  const net = data?.netProfit ?? 0;

  return (
    <div className="page-enter">
      <PageHeader
        title="Profit & loss"
        description="Income against expenses for a period. Net profit rolls into capital on the balance sheet."
        crumbs={[{ label: "Reports" }, { label: "Profit & loss" }]}
        actions={
          <div className="flex items-end gap-2">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </Field>
            <Button variant="secondary" onClick={reload} icon={CalendarRange}>
              Run
            </Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />

      {loading ? (
        <Panel><RowSkeleton rows={8} cols={3} /></Panel>
      ) : !data ? (
        <Panel><EmptyState icon={ArrowDownUp} title="No data in this period" hint="Post a bill or generate an invoice to see activity here." /></Panel>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-leaf-700">Income</p>
              <p className="num mt-1 text-xl font-semibold text-ink">{money(data.totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-clay-700">Expenses</p>
              <p className="num mt-1 text-xl font-semibold text-ink">{money(data.totalExpenses)}</p>
            </div>
            <div className="rounded-xl border border-ink bg-ink px-4 py-3 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-white/60">Net profit</p>
              <p className={`num mt-1 text-xl font-semibold ${net >= 0 ? "text-white" : "text-clay-200"}`}>
                {net >= 0 ? "" : "-"}{money(Math.abs(net))}
              </p>
            </div>
          </div>

          <p className="text-center text-[13px] text-ink-mute">
            {dateOnly(fromISO(from))} to {dateOnly(fromISO(to))}
          </p>

          <Panel pad={false}>
            <div className="border-b border-line px-4 py-2.5 text-[15px] font-semibold text-ink">Income</div>
            {data.income.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-faint">No income posted in this period.</p>
            ) : (
              <div className="divide-y divide-line">
                {data.income.map((r) => (
                  <div key={r.account} className="flex items-center justify-between px-4 py-2">
                    <span className="text-[13.5px] text-ink">{r.account}</span>
                    <span className="num text-[13.5px] font-medium text-leaf-700">{money(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-2.5">
              <span className="text-[13px] font-medium text-ink">Total income</span>
              <span className="num text-[13px] font-semibold text-ink">{money(data.totalIncome)}</span>
            </div>
          </Panel>

          <Panel pad={false}>
            <div className="border-b border-line px-4 py-2.5 text-[15px] font-semibold text-ink">Expenses</div>
            {data.expenses.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-faint">No expenses posted in this period.</p>
            ) : (
              <div className="divide-y divide-line">
                {data.expenses.map((r) => (
                  <div key={r.account} className="flex items-center justify-between px-4 py-2">
                    <span className="text-[13.5px] text-ink">{r.account}</span>
                    <span className="num text-[13.5px] font-medium text-clay-700">({money(r.amount)})</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-2.5">
              <span className="text-[13px] font-medium text-ink">Total expenses</span>
              <span className="num text-[13px] font-semibold text-ink">{money(data.totalExpenses)}</span>
            </div>
          </Panel>

          <div className="flex items-center justify-between rounded-xl border border-line-strong bg-surface px-5 py-4 shadow-card">
            <span className="text-[15px] font-semibold text-ink">
              Net profit for the period
            </span>
            <span className={`num text-xl font-bold ${net >= 0 ? "text-leaf-700" : "text-clay-700"}`}>
              {net >= 0 ? "" : "-"}{money(Math.abs(net))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}