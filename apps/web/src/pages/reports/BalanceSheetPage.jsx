import { useState } from "react";
import { CalendarDays, Printer, Scale } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Button, DataTable, EmptyState, Field, Input, PageHeader, Panel, RowSkeleton } from "../../components/ui";
import { money, dateInputValue, fromISO, todayInput } from "../../lib/format";

function SectionRows({ title, rows, emptyNote, amountFn }) {
  return (
    <div className="py-1">
      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-mute">{title}</p>
      {rows.length === 0 ? (
        <p className="px-4 py-1 text-[13px] text-ink-faint">{emptyNote}</p>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <div key={`${title}-${r.account}`} className="flex items-center justify-between px-4 py-1.5">
              <span className="text-[13.5px] text-ink">{r.account}</span>
              <span className="num text-[13.5px] font-medium text-ink">{amountFn ? amountFn(r) : money(r.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(todayInput());
  const { data, loading, reload } = useFetch(`/reports/balance-sheet?date=${asOf}`);

  return (
    <div className="page-enter">
      <PageHeader
        title="Balance sheet"
        description="Where the business stands at a point in time. Assets always equal liabilities plus equity, because every entry is double-sided."
        crumbs={[{ label: "Reports" }, { label: "Balance sheet" }]}
        actions={
          <div className="flex items-center gap-2">
            <Field label="" htmlFor="bs-date">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-ink-mute" />
                <Input type="date" id="bs-date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" />
              </div>
            </Field>
            <Button variant="secondary" onClick={reload}>Refresh</Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />

      {loading ? (
        <Panel><RowSkeleton rows={8} cols={3} /></Panel>
      ) : !data ? (
        <Panel><EmptyState icon={Scale} title="Nothing to show yet" hint="Once journal entries are posted, this report builds itself." /></Panel>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium ${
                data.balanced ? "border-leaf-100 bg-leaf-50 text-leaf-700" : "border-clay-100 bg-clay-50 text-clay-700"
              }`}
            >
              {data.balanced ? "Balanced · assets equal liabilities + equity" : "Out of balance — check the ledger"}
            </span>
            <span className="text-[13px] text-ink-mute">as of {fromISO(data.asOf).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel pad={false}>
              <div className="border-b border-line px-4 py-3">
                <p className="text-[15px] font-semibold text-ink">Assets</p>
                <p className="text-xs text-ink-mute">What the business owns</p>
              </div>
              <SectionRows title="Current & fixed assets" rows={data.assets} emptyNote="No asset balances yet" />
              <div className="flex items-center justify-between border-t border-line-strong bg-paper/60 px-4 py-2.5">
                <span className="text-sm font-semibold text-ink">Total assets</span>
                <span className="num text-sm font-bold text-ink">{money(data.totalAssets)}</span>
              </div>
            </Panel>

            <Panel pad={false}>
              <div className="border-b border-line px-4 py-3">
                <p className="text-[15px] font-semibold text-ink">Liabilities & equity</p>
                <p className="text-xs text-ink-mute">What the business owes, plus owner claims</p>
              </div>
              <SectionRows title="Liabilities" rows={data.liabilities} emptyNote="No liabilities yet" />
              <div className="flex items-center justify-between px-4 py-1.5 text-[13.5px]">
                <span className="text-ink">Total liabilities</span>
                <span className="num font-medium text-ink">{money(data.totalLiabilities)}</span>
              </div>
              <SectionRows title="Capital & retained earnings" rows={data.capitalAccounts} emptyNote="No capital posted yet" amountFn={(r) => money(r.balance)} />
              {data.retainedEarnings !== 0 && (
                <div className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-[13.5px] text-ink">Current period earnings</span>
                  <span className={`num text-[13.5px] font-medium ${data.retainedEarnings >= 0 ? "text-leaf-700" : "text-clay-700"}`}>
                    {money(data.retainedEarnings)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line-strong bg-paper/60 px-4 py-2.5">
                <span className="text-sm font-semibold text-ink">Total liabilities & equity</span>
                <span className="num text-sm font-bold text-ink">{money(data.totalLiabilities + data.totalCapital)}</span>
              </div>
            </Panel>
          </div>

          <p className="text-center text-xs text-ink-faint">
            All figures in INR. Computed live from journal entries dated on or before {dateInputValue(new Date(data.asOf))}.
          </p>
        </div>
      )}
    </div>
  );
}