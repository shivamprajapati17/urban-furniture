import { useMemo, useState } from "react";
import { Printer, Target } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Badge, Button, EmptyState, PageHeader, Panel, RowSkeleton } from "../../components/ui";
import { money, dateOnly } from "../../lib/format";
import { fromISO } from "../../lib/format";

export default function BudgetReportPage() {
  const { data, loading } = useFetch("/reports/budget");

  const sorted = useMemo(() => (data || []).sort((a, b) => a.utilization - b.utilization), [data]);

  return (
    <div className="page-enter">
      <PageHeader
        title="Budget report"
        description="Planned spend per cost centre against what actually posted within the budget period."
        crumbs={[{ label: "Reports" }, { label: "Budget report" }]}
        actions={
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Print / PDF
          </Button>
        }
      />

      {loading ? (
        <Panel><RowSkeleton rows={5} cols={5} /></Panel>
      ) : !data || data.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Target}
            title="No budgets defined"
            hint="Create a budget in Master data → Cost centres & budgets, then tag orders with the same cost centre."
          />
        </Panel>
      ) : (
        <div className="mx-auto max-w-4xl space-y-3">
          {sorted.map((b) => {
            const over = b.actualAmount > b.plannedAmount;
            return (
              <Panel key={b.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold text-ink">{b.name}</p>
                      <Badge tone={b.analyticAccountType === "expense" ? "gold" : "leaf"}>
                        {b.analyticAccountType === "expense" ? "Spend" : "Revenue"} centre
                      </Badge>
                      {over && <Badge tone="clay">Over budget</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-mute">
                      {b.analyticAccount} · {dateOnly(fromISO(b.periodStart))} to {dateOnly(fromISO(b.periodEnd))}
                      {b.responsiblePerson ? ` · ${b.responsiblePerson}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-ink-mute">Planned</p>
                      <p className="num text-[15px] font-semibold text-ink">{money(b.plannedAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-ink-mute">Actual</p>
                      <p className={`num text-[15px] font-semibold ${over ? "text-clay-700" : "text-ink"}`}>{money(b.actualAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-ink-mute">{over ? "Over by" : "Remaining"}</p>
                      <p className="num text-[15px] font-medium text-ink">{money(Math.abs(b.variance))}</p>
                    </div>
                  </div>
                </div>

                {/* Utilization */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ink-mute">
                    <span>{b.utilization}% used</span>
                    <span>{over ? "over plan" : `${Math.max(0, 100 - b.utilization)}% left`}</span>
                  </div>
                  <div className="bar-track mt-1 h-2 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${over ? "bg-clay-600" : b.utilization >= 80 ? "bg-gold-500" : "bg-walnut-600"}`}
                      style={{ width: `${Math.min(100, b.utilization)}%` }}
                    />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}