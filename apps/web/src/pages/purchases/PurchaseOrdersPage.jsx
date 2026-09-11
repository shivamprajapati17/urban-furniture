import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCheck, FileSpreadsheet, Pencil, Plus, ShoppingCart } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useData";
import { Badge, Button, DataTable, EmptyState, IconButton, PageHeader, Panel, RowSkeleton, SearchInput, Segmented, StatusBadge, useNotify, formatError } from "../../components/ui";
import { Avatar as AvatarUI } from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";
import OrderModal from "../../components/OrderModal";
import { money, dateOnly } from "../../lib/format";

const STATUS_TONE = {
  draft: { label: "Draft", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "azure" },
  billed: { label: "Billed", tone: "leaf" },
};

export default function PurchaseOrdersPage() {
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useFetch("/purchase-orders");
  const { data: meta, loading: metaLoading } = useFetch("/meta");
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
      if (q && !`${o.id} ${o.vendor?.name || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, statusFilter]);

  const confirmOrder = async (o) => {
    setBusy(o.id);
    try {
      await api.post(`/purchase-orders/${o.id}/confirm`);
      notify({ title: `PO #${o.id} confirmed`, detail: `${o.vendor?.name} order is ready to be billed.` });
      reload();
    } catch (err) {
      notify({ title: "Could not confirm", detail: formatError(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const convertToBill = async (o) => {
    setBusy(o.id);
    try {
      const { bill } = await api.post(`/purchase-orders/${o.id}/convert`);
      notify({
        title: `Vendor bill #${bill.id} created`,
        detail: `Posted Dr Purchase Expense / Cr Creditors for ${money(bill.totalAmount)}. The order is now billed.`,
      });
      reload();
    } catch (err) {
      notify({ title: "Could not convert", detail: formatError(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const lineSummary = (o) => o.lines?.map((l) => `${l.qty} × ${l.product?.name}`).join(", ") || "No lines";

  return (
    <div className="page-enter">
      <PageHeader
        title="Purchase orders"
        description="Orders you place with vendors. Confirm one, then convert it into a vendor bill; the ledger posts the purchase automatically."
        crumbs={[{ label: "Purchases" }, { label: "Purchase orders" }]}
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
            New purchase order
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search by order # or vendor…" className="w-full sm:w-80" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {["all", "draft", "confirmed", "billed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-[13px] font-medium capitalize transition-colors ${
                  statusFilter === s ? "border-walnut-600 bg-walnut-600 text-white" : "border-line-strong text-ink-soft hover:border-walnut-400"
                }`}
              >
                {s === "all" ? "All" : s}
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
          <RowSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No purchase orders yet"
            hint="Start with an order to a vendor; confirm it, then convert it to a bill when the goods arrive."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>New purchase order</Button>}
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            columns={[
              { key: "draft", label: "Draft", dot: "bg-ink-faint", matches: (o) => o.status === "draft" },
              { key: "confirmed", label: "Confirmed", dot: "bg-azure-600", matches: (o) => o.status === "confirmed" },
              { key: "billed", label: "Billed", dot: "bg-leaf-500", matches: (o) => o.status === "billed" },
            ]}
            renderCard={(o) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">PO #{o.id}</p>
                    <p className="truncate text-xs text-ink-mute">{o.vendor?.name} · {dateOnly(o.orderDate)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-ink-faint" title={lineSummary(o)}>{lineSummary(o)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="num text-[13px] font-semibold text-ink">{money(o.totalAmount)}</span>
                  <div className="flex items-center gap-1">
                    {o.status === "draft" && (
                      <Button size="sm" variant="secondary" icon={CheckCheck} loading={busy === o.id} onClick={() => confirmOrder(o)}>Confirm</Button>
                    )}
                    {o.status === "confirmed" && (
                      <Button size="sm" variant="subtle" icon={FileSpreadsheet} loading={busy === o.id} onClick={() => convertToBill(o)}>To bill</Button>
                    )}
                    {o.status !== "billed" && (
                      <IconButton label="Edit" onClick={() => { setEditing(o); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    )}
                    {o.status === "billed" && <span className="text-[11px] text-ink-faint">Bill #{o.vendorBill?.id}</span>}
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
                    <p className="text-[13.5px] font-semibold text-ink">PO #{o.id}</p>
                    <p className="text-xs text-ink-mute">{dateOnly(o.orderDate)}</p>
                  </div>
                ),
              },
              {
                key: "vendor",
                header: "Vendor",
                render: (o) => (
                  <span className="flex items-center gap-2">
                    <AvatarUI name={o.vendor?.name} size={26} />
                    <span className="text-[13.5px] font-medium text-ink">{o.vendor?.name}</span>
                  </span>
                ),
              },
              {
                key: "lines",
                header: "Line items",
                render: (o) => <span className="block max-w-60 truncate text-[13px] text-ink-soft" title={lineSummary(o)}>{lineSummary(o)}</span>,
              },
              { key: "analytic", header: "Cost centre", render: (o) => (o.analyticAccount ? <Badge tone="gold">{o.analyticAccount.name}</Badge> : <span className="text-ink-faint">-</span>) },
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
                      <Button variant="subtle" size="sm" icon={FileSpreadsheet} loading={busy === o.id} onClick={() => convertToBill(o)}>
                        Convert to bill
                      </Button>
                    )}
                    {o.status !== "billed" && (
                      <IconButton label="Edit" onClick={() => { setEditing(o); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    )}
                    {o.status === "billed" && (
                      <span className="text-xs text-ink-faint">Bill #{o.vendorBill?.id}</span>
                    )}
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
        kind="purchase"
        open={modalOpen}
        meta={meta}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(mode) =>
          notify({
            title: mode === "created" ? "Purchase order created" : "Purchase order updated",
            detail: mode === "created" ? "Confirm it when the order is final." : undefined,
          })
        }
      />
    </div>
  );
}