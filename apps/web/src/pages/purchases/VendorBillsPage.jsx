import { useMemo, useState } from "react";
import { HandCoins, Receipt } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Avatar as AvatarUI, Badge, Button, DataTable, EmptyState, PageHeader, Panel, RowSkeleton, Segmented, StatusBadge } from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";
import DocDetail from "../../components/DocDetail";
import { money, dateOnly } from "../../lib/format";
import { round2 } from "../../lib/format-helpers";

export default function VendorBillsPage() {
  const { data, loading, reload } = useFetch("/vendor-bills");
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("table");

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((b) => (statusFilter === "all" ? true : b.status === statusFilter));
  }, [data, statusFilter]);

  const selected = (data || []).find((b) => b.id === selectedId) || null;

  const stats = [
    { label: "Total bills", value: (data || []).length },
    { label: "Open / unpaid", value: (data || []).filter((b) => b.status !== "paid").length },
    { label: "Outstanding", value: money((data || []).filter((b) => b.status !== "paid").reduce((a, b) => a + (b.totalAmount - b.paidAmount), 0)) },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Vendor bills"
        description="Bills received from vendors, converted from confirmed purchase orders. Pay them to clear what you owe."
        crumbs={[{ label: "Purchases" }, { label: "Vendor bills" }]}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">{s.label}</p>
            <p className="num mt-1 text-xl font-semibold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", "posted", "overdue", "paid"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-[13px] font-medium capitalize transition-colors ${
                statusFilter === s ? "border-walnut-600 bg-walnut-600 text-white" : "border-line-strong text-ink-soft hover:border-walnut-400"
              }`}
            >
              {s === "all" ? `All (${(data || []).length})` : s === "overdue" ? "Overdue" : s === "posted" ? "Open" : "Paid"}
            </button>
          ))}
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Table" },
            { value: "board", label: "Board" },
          ]}
        />
      </div>

      <Panel>
        {loading ? (
          <RowSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={statusFilter === "all" ? "No vendor bills yet" : "Nothing in this view"}
            hint={statusFilter === "all" ? "Convert a confirmed purchase order into a bill to see it here." : "Try another status filter."}
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            onCardClick={(b) => setSelectedId(b.id)}
            columns={[
              { key: "posted", label: "Open", dot: "bg-azure-600", matches: (b) => b.status === "posted" },
              { key: "overdue", label: "Overdue", dot: "bg-clay-600", matches: (b) => b.status === "overdue" },
              { key: "paid", label: "Paid", dot: "bg-leaf-500", matches: (b) => b.status === "paid" },
            ]}
            renderCard={(b) => {
              const outstanding = round2(b.totalAmount - b.paidAmount);
              return (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">Bill #{b.id}</p>
                      <p className="truncate text-xs text-ink-mute">{b.vendor?.name}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-faint">
                    {dateOnly(b.billDate)} · due {dateOnly(b.dueDate)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-right">
                      <p className="num text-[13px] font-semibold text-ink">{money(b.totalAmount)}</p>
                      <p className={`num text-[11px] ${outstanding > 0 ? "text-clay-700" : "text-leaf-700"}`}>
                        {outstanding > 0 ? `${money(outstanding)} open` : "settled"}
                      </p>
                    </div>
                    {b.status !== "paid" && (
                      <Button size="sm" variant="secondary" icon={HandCoins} onClick={() => setSelectedId(b.id)}>
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "id",
                header: "Bill",
                render: (b) => (
                  <div className="leading-tight">
                    <p className="text-[13.5px] font-semibold text-ink">Bill #{b.id}</p>
                    <p className="text-xs text-ink-mute">
                      {dateOnly(b.billDate)} · due {dateOnly(b.dueDate)}
                    </p>
                  </div>
                ),
              },
              {
                key: "vendor",
                header: "Vendor",
                render: (b) => (
                  <span className="flex items-center gap-2">
                    <AvatarUI name={b.vendor?.name} size={26} />
                    <span className="text-[13.5px] font-medium text-ink">{b.vendor?.name}</span>
                  </span>
                ),
              },
              {
                key: "source",
                header: "Source",
                render: (b) => (b.poId ? <Badge tone="neutral">PO #{b.poId}</Badge> : <span className="text-ink-faint">Manual</span>),
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                render: (b) => <span className="num font-medium text-ink">{money(b.totalAmount)}</span>,
              },
              {
                key: "outstanding",
                header: "Outstanding",
                align: "right",
                render: (b) => {
                  const o = round2(b.totalAmount - b.paidAmount);
                  return <span className={`num font-semibold ${o > 0 ? "text-clay-700" : "text-leaf-700"}`}>{money(o)}</span>;
                },
              },
              { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (b) =>
                  b.status !== "paid" ? (
                    <Button size="sm" variant="secondary" icon={HandCoins} onClick={() => setSelectedId(b.id)}>
                      Pay
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-faint">Settled</span>
                  ),
              },
            ]}
            rows={rows}
            rowKey={(b) => b.id}
            onRowClick={(b) => setSelectedId(b.id)}
          />
        )}
      </Panel>

      <DocDetail
        doc={selected}
        kind="bill"
        endpointBase="/vendor-bills"
        canPay
        onClose={() => setSelectedId(null)}
        onChanged={() => reload()}
      />
    </div>
  );
}