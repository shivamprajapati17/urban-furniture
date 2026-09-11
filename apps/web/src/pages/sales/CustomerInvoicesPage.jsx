import { useMemo, useState } from "react";
import { HandCoins, ReceiptText } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { Avatar as AvatarUI, Badge, Button, DataTable, EmptyState, PageHeader, Panel, RowSkeleton, Segmented, StatusBadge } from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";
import DocDetail from "../../components/DocDetail";
import { money, dateOnly } from "../../lib/format";
import { round2 } from "../../lib/format-helpers";

export default function CustomerInvoicesPage() {
  const { data, loading, reload } = useFetch("/customer-invoices");
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("table");

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((i) => (statusFilter === "all" ? true : i.status === statusFilter));
  }, [data, statusFilter]);

  const selected = (data || []).find((i) => i.id === selectedId) || null;

  const totalOutstanding = (data || [])
    .filter((i) => i.status !== "paid")
    .reduce((a, i) => a + (i.totalAmount - i.paidAmount), 0);

  const stats = [
    { label: "Invoices issued", value: (data || []).length },
    { label: "Open", value: (data || []).filter((i) => i.status !== "paid").length },
    { label: "To collect", value: money(totalOutstanding), tone: "clay" },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Customer invoices"
        description="Invoices generated from confirmed sales orders. Money comes in when you register a payment against them."
        crumbs={[{ label: "Sales" }, { label: "Customer invoices" }]}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">{s.label}</p>
            <p className={`num mt-1 text-xl font-semibold ${s.tone === "clay" ? "text-clay-700" : "text-ink"}`}>{s.value}</p>
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
              {s === "all" ? `All (${(data || []).length})` : s === "posted" ? "Open" : s === "overdue" ? "Overdue" : "Paid"}
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
            icon={ReceiptText}
            title={statusFilter === "all" ? "No invoices yet" : "Nothing in this view"}
            hint={statusFilter === "all" ? "Generate an invoice from a confirmed sales order to see it here." : "Try another status filter."}
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            onCardClick={(i) => setSelectedId(i.id)}
            columns={[
              { key: "posted", label: "Open", dot: "bg-azure-600", matches: (i) => i.status === "posted" },
              { key: "overdue", label: "Overdue", dot: "bg-clay-600", matches: (i) => i.status === "overdue" },
              { key: "paid", label: "Paid", dot: "bg-leaf-500", matches: (i) => i.status === "paid" },
            ]}
            renderCard={(i) => {
              const outstanding = round2(i.totalAmount - i.paidAmount);
              return (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">INV #{i.id}</p>
                      <p className="truncate text-xs text-ink-mute">{i.customer?.name}</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-faint">
                    {dateOnly(i.invoiceDate)} · due {dateOnly(i.dueDate)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-right">
                      <p className="num text-[13px] font-semibold text-ink">{money(i.totalAmount)}</p>
                      <p className={`num text-[11px] ${outstanding > 0 ? "text-clay-700" : "text-leaf-700"}`}>
                        {outstanding > 0 ? `${money(outstanding)} due` : "settled"}
                      </p>
                    </div>
                    {i.status !== "paid" && (
                      <Button size="sm" variant="secondary" icon={HandCoins} onClick={() => setSelectedId(i.id)}>
                        Receive
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
                header: "Invoice",
                render: (i) => (
                  <div className="leading-tight">
                    <p className="text-[13.5px] font-semibold text-ink">INV #{i.id}</p>
                    <p className="text-xs text-ink-mute">
                      {dateOnly(i.invoiceDate)} · due {dateOnly(i.dueDate)}
                    </p>
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Customer",
                render: (i) => (
                  <span className="flex items-center gap-2">
                    <AvatarUI name={i.customer?.name} size={26} />
                    <span className="text-[13.5px] font-medium text-ink">{i.customer?.name}</span>
                  </span>
                ),
              },
              { key: "source", header: "Source", render: (i) => (i.soId ? <Badge tone="neutral">SO #{i.soId}</Badge> : <span className="text-ink-faint">Manual</span>) },
              { key: "tax", header: "Tax", align: "right", render: (i) => (i.taxAmount ? <span className="num text-[13px] text-ink-mute">{money(i.taxAmount)}</span> : <span className="text-ink-faint">-</span>) },
              {
                key: "total",
                header: "Total",
                align: "right",
                render: (i) => <span className="num font-medium text-ink">{money(i.totalAmount)}</span>,
              },
              {
                key: "outstanding",
                header: "Outstanding",
                align: "right",
                render: (i) => {
                  const o = round2(i.totalAmount - i.paidAmount);
                  return <span className={`num font-semibold ${o > 0 ? "text-clay-700" : "text-leaf-700"}`}>{money(o)}</span>;
                },
              },
              { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (i) =>
                  i.status !== "paid" ? (
                    <Button size="sm" variant="secondary" icon={HandCoins} onClick={() => setSelectedId(i.id)}>
                      Receive
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-faint">Settled</span>
                  ),
              },
            ]}
            rows={rows}
            rowKey={(i) => i.id}
            onRowClick={(i) => setSelectedId(i.id)}
          />
        )}
      </Panel>

      <DocDetail
        doc={selected}
        kind="invoice"
        endpointBase="/customer-invoices"
        canPay
        onClose={() => setSelectedId(null)}
        onChanged={() => reload()}
      />
    </div>
  );
}