import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCheck, FileText, Pencil, Plus, ReceiptText } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useData";
import { Avatar as AvatarUI, Badge, Button, DataTable, EmptyState, IconButton, PageHeader, Panel, RowSkeleton, SearchInput, Segmented, StatusBadge, useNotify, formatError } from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";
import OrderModal from "../../components/OrderModal";
import { money, dateOnly } from "../../lib/format";

export default function SalesOrdersPage() {
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useFetch("/sales-orders");
  const { data: meta } = useFetch("/meta");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("table");

  useEffect(() => {
    if (params.get("new") === "1") {
      setModalOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q && !`${o.id} ${o.customer?.name || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, statusFilter]);

  const confirmOrder = async (o) => {
    setBusy(o.id);
    try {
      await api.post(`/sales-orders/${o.id}/confirm`);
      notify({ title: `SO #${o.id} confirmed`, detail: `${o.customer?.name} order is ready to be invoiced.` });
      reload();
    } catch (err) {
      notify({ title: "Could not confirm", detail: formatError(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const generateInvoice = async (o) => {
    setBusy(o.id);
    try {
      const { invoice } = await api.post(`/sales-orders/${o.id}/generate`);
      notify({
        title: `Customer invoice #${invoice.id} generated`,
        detail: `Posted Dr Debtors / Cr Sale Income for ${money(invoice.totalAmount)}${invoice.taxAmount ? ` (incl. ${money(invoice.taxAmount)} tax payable)` : ""}.`,
      });
      reload();
    } catch (err) {
      notify({ title: "Could not generate", detail: formatError(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Sales orders"
        description="Orders from your customers. Confirm one and generate a customer invoice; the ledger posts the sale with tax automatically."
        crumbs={[{ label: "Sales" }, { label: "Sales orders" }]}
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
            New sales order
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search by order # or customer…" className="w-full sm:w-80" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {["all", "draft", "confirmed", "invoiced"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-[13px] font-medium capitalize transition-colors ${
                  statusFilter === s ? "border-walnut-600 bg-walnut-600 text-white" : "border-line-strong text-ink-soft hover:border-walnut-400"
                }`}
              >
                {s === "all" ? "All" : s === "invoiced" ? "Invoiced" : s}
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
      </div>

      <Panel>
        {loading ? (
          <RowSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No sales orders yet"
            hint="Take an order from a customer, confirm it, then generate the invoice."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>New sales order</Button>}
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            columns={[
              { key: "draft", label: "Draft", dot: "bg-ink-faint", matches: (o) => o.status === "draft" },
              { key: "confirmed", label: "Confirmed", dot: "bg-azure-600", matches: (o) => o.status === "confirmed" },
              { key: "invoiced", label: "Invoiced", dot: "bg-leaf-500", matches: (o) => o.status === "invoiced" },
            ]}
            renderCard={(o) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">SO #{o.id}</p>
                    <p className="truncate text-xs text-ink-mute">{o.customer?.name} · {dateOnly(o.orderDate)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-ink-faint">{o.lines?.map((l) => `${l.qty} × ${l.product?.name}`).join(", ")}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="num text-[13px] font-semibold text-ink">
                    {money(o.totalAmount)}
                    {o.taxAmount > 0 && <span className="ml-1 text-[11px] font-normal text-ink-faint">incl. {money(o.taxAmount)} tax</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    {o.status === "draft" && (
                      <Button size="sm" variant="secondary" icon={CheckCheck} loading={busy === o.id} onClick={() => confirmOrder(o)}>Confirm</Button>
                    )}
                    {o.status === "confirmed" && (
                      <Button size="sm" variant="subtle" icon={FileText} loading={busy === o.id} onClick={() => generateInvoice(o)}>Invoice</Button>
                    )}
                    {o.status !== "invoiced" && (
                      <IconButton label="Edit" onClick={() => { setEditing(o); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    )}
                    {o.status === "invoiced" && <span className="text-[11px] text-ink-faint">Inv #{o.customerInvoice?.id}</span>}
                  </div>
                </div>
              </div>
            )}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "id",
                header: "Order",
                render: (o) => (
                  <div className="leading-tight">
                    <p className="text-[13.5px] font-semibold text-ink">SO #{o.id}</p>
                    <p className="text-xs text-ink-mute">{dateOnly(o.orderDate)}</p>
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Customer",
                render: (o) => (
                  <span className="flex items-center gap-2">
                    <AvatarUI name={o.customer?.name} size={26} />
                    <span className="text-[13.5px] font-medium text-ink">{o.customer?.name}</span>
                  </span>
                ),
              },
              {
                key: "items",
                header: "Items",
                render: (o) => <span className="block max-w-56 truncate text-[13px] text-ink-soft">{o.lines?.map((l) => `${l.qty} × ${l.product?.name}`).join(", ")}</span>,
              },
              { key: "analytic", header: "Cost centre", render: (o) => (o.analyticAccount ? <Badge tone="gold">{o.analyticAccount.name}</Badge> : <span className="text-ink-faint">-</span>) },
              {
                key: "tax",
                header: "Tax",
                align: "right",
                render: (o) => (o.taxAmount > 0 ? <span className="num text-[13px] text-ink-mute">{money(o.taxAmount)}</span> : <span className="text-ink-faint">-</span>),
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                render: (o) => <span className="num font-semibold text-ink">{money(o.totalAmount)}</span>,
              },
              { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (o) => (
                  <div className="flex items-center justify-end gap-1">
                    {o.status === "draft" && (
                      <Button variant="secondary" size="sm" icon={CheckCheck} loading={busy === o.id} onClick={() => confirmOrder(o)}>
                        Confirm
                      </Button>
                    )}
                    {o.status === "confirmed" && (
                      <Button variant="subtle" size="sm" icon={FileText} loading={busy === o.id} onClick={() => generateInvoice(o)}>
                        Generate invoice
                      </Button>
                    )}
                    {o.status !== "invoiced" && (
                      <IconButton label="Edit" onClick={() => { setEditing(o); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    )}
                    {o.status === "invoiced" && <span className="text-xs text-ink-faint">Invoice #{o.customerInvoice?.id}</span>}
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(o) => o.id}
          />
        )}
      </Panel>

      <OrderModal
        kind="sales"
        open={modalOpen}
        meta={meta}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(mode) => notify({ title: mode === "created" ? "Sales order created" : "Sales order updated" })}
      />
    </div>
  );
}