import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Avatar as AvatarUI, Badge, EmptyState, PageHeader, Panel, RowSkeleton, Segmented } from "../../components/ui";
import { money, dateOnly } from "../../lib/format";
import { PAYMENT_METHODS } from "../../lib/constants";

export default function ContactHistory() {
  const { data, loading } = useFetch("/me/documents");
  const [dir, setDir] = useState("all");

  const payments = useMemo(() => {
    const list = data?.payments || [];
    return list.filter((p) => (dir === "all" ? true : p.direction === dir));
  }, [data, dir]);

  return (
    <div className="page-enter">
      <PageHeader
        title="Payment history"
        description="Every payment recorded against your documents."
      />

      <div className="mb-4">
        <Segmented
          value={dir}
          onChange={setDir}
          options={[
            { value: "all", label: "All" },
            { value: "in", label: "You paid" },
            { value: "out", label: "Paid to you" },
          ]}
        />
      </div>

      <Panel>
        {loading ? (
          <RowSkeleton rows={6} cols={4} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={History}
            title="No payments yet"
            hint="Pay an invoice or receive a bill payment and the history will build up here."
          />
        ) : (
          <div className="divide-y divide-line">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${p.direction === "in" ? "bg-clay-50 text-clay-700" : "bg-leaf-50 text-leaf-700"}`}>
                    <History className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">
                      {p.direction === "in" ? `Payment on ${p.invoice ? `invoice #${p.invoice.id}` : "your account"}` : `Payment to you on ${p.bill ? `bill #${p.bill.id}` : "your account"}`}
                    </p>
                    <p className="text-xs text-ink-mute">
                      {dateOnly(p.paymentDate)} · {PAYMENT_METHODS[p.method]?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={p.direction === "in" ? "clay" : "leaf"}>{p.direction === "in" ? "You paid" : "Received"}</Badge>
                  <span className="num w-28 text-right text-[14px] font-semibold text-ink">{money(p.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}