import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, FileSpreadsheet, HandCoins, Plus } from "lucide-react";
import { useFetch } from "../lib/useData";
import { Avatar as AvatarUI, Badge, Button, DataTable, EmptyState, Field, Modal, PageHeader, Panel, RowSkeleton, Segmented, Select, useNotify } from "../components/ui";
import PayModal from "../components/PayModal";
import KanbanBoard from "../components/KanbanBoard";
import { money, dateOnly } from "../lib/format";
import { round2 } from "../lib/format-helpers";
import { downloadCSV, fileStamp } from "../lib/export";

export default function PaymentsPage() {
  const notify = useNotify();
  const { data, loading, reload } = useFetch("/payments");
  const { data: bills } = useFetch("/vendor-bills");
  const { data: invoices } = useFetch("/customer-invoices");
  const [dirFilter, setDirFilter] = useState("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickType, setPickType] = useState("bill");
  const [pickDoc, setPickDoc] = useState("");
  const [payTarget, setPayTarget] = useState(null);
  const [view, setView] = useState("table");

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((p) => (dirFilter === "all" ? true : p.direction === dirFilter));
  }, [data, dirFilter]);

  const openBills = useMemo(
    () => (bills || []).filter((b) => b.status !== "paid").map((b) => ({ id: b.id, name: `${b.vendor?.name} · bill #${b.id}`, outstanding: round2(b.totalAmount - b.paidAmount), kind: "bill", vendor: b.vendor?.name, totalAmount: b.totalAmount, paidAmount: b.paidAmount, status: b.status })),
    [bills]
  );
  const openInvoices = useMemo(
    () => (invoices || []).filter((i) => i.status !== "paid").map((i) => ({ id: i.id, name: `${i.customer?.name} · invoice #${i.id}`, outstanding: round2(i.totalAmount - i.paidAmount), kind: "invoice", vendor: i.customer?.name, totalAmount: i.totalAmount, paidAmount: i.paidAmount, status: i.status })),
    [invoices]
  );

  const pool = pickType === "bill" ? openBills : openInvoices;
  const chosen = pool.find((d) => String(d.id) === String(pickDoc));

  const beginPay = () => {
    if (!chosen) return;
    setPickerOpen(false);
    setPayTarget(chosen);
  };

  const totals = useMemo(() => {
    const list = data || [];
    return {
      in: list.filter((p) => p.direction === "in").reduce((a, p) => a + p.amount, 0),
      out: list.filter((p) => p.direction === "out").reduce((a, p) => a + p.amount, 0),
    };
  }, [data]);

  return (
    <div className="page-enter">
      <PageHeader
        title="Payments"
        description="Every payment received from customers and made to vendors, straight from the register."
        crumbs={[{ label: "Payments" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              disabled={rows.length === 0}
              onClick={() =>
                downloadCSV(
                  `payments-${fileStamp()}.csv`,
                  rows.map((p) => ({
                    date: dateOnly(p.paymentDate),
                    direction: p.direction === "in" ? "received" : "paid out",
                    contact: p.contact?.name || "",
                    document: p.invoice ? `Invoice #${p.invoice.id}` : p.bill ? `Bill #${p.bill.id}` : "General",
                    method: p.method,
                    amount: p.amount,
                  }))
                )
              }
            >
              Export CSV
            </Button>
            <Button icon={Plus} onClick={() => { setPickType("bill"); setPickDoc(""); setPickerOpen(true); }}>
              Record payment
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-mute">
            <ArrowDownLeft className="h-3.5 w-3.5 text-leaf-600" /> Received (in)
          </p>
          <p className="num mt-1 text-xl font-semibold text-leaf-700">{money(totals.in)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-mute">
            <ArrowUpRight className="h-3.5 w-3.5 text-clay-600" /> Paid out
          </p>
          <p className="num mt-1 text-xl font-semibold text-clay-700">{money(totals.out)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">Net movement</p>
          <p className="num mt-1 text-xl font-semibold text-ink">{money(round2(totals.in - totals.out))}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={dirFilter}
          onChange={setDirFilter}
          options={[
            { value: "all", label: "All payments" },
            { value: "in", label: "Received" },
            { value: "out", label: "Paid out" },
          ]}
        />
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
          <RowSkeleton rows={7} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={dirFilter === "all" ? "No payments yet" : "No payments in this direction"}
            hint="Payments appear here when you settle a vendor bill or receive money against a customer invoice."
            action={
              <Button icon={Plus} onClick={() => { setPickType("bill"); setPickerOpen(true); }}>
                Record a payment
              </Button>
            }
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            columns={[
              { key: "in", label: "Received", dot: "bg-leaf-500", matches: (p) => p.direction === "in" },
              { key: "out", label: "Paid out", dot: "bg-clay-600", matches: (p) => p.direction === "out" },
            ]}
            renderCard={(p) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{p.contact?.name || "General"}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-mute">
                      {dateOnly(p.paymentDate)} · {p.invoice ? `Invoice #${p.invoice.id}` : p.bill ? `Bill #${p.bill.id}` : "General"}
                    </p>
                  </div>
                  <Badge tone={p.direction === "in" ? "leaf" : "clay"}>
                    {p.direction === "in" ? "Received" : "Paid out"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="capitalize text-[11.5px] text-ink-faint">{p.method}</span>
                  <span className={`num text-[14px] font-semibold ${p.direction === "in" ? "text-leaf-700" : "text-clay-700"}`}>
                    {p.direction === "in" ? "+" : "-"}{money(p.amount)}
                  </span>
                </div>
              </div>
            )}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "date",
                header: "Date",
                render: (p) => <span className="whitespace-nowrap text-[13px] text-ink-soft">{dateOnly(p.paymentDate)}</span>,
              },
              {
                key: "dir",
                header: "Direction",
                render: (p) => (
                  <Badge tone={p.direction === "in" ? "leaf" : "clay"}>
                    {p.direction === "in" ? (
                      <>
                        <ArrowDownLeft className="h-3 w-3" /> Received
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-3 w-3" /> Paid out
                      </>
                    )}
                  </Badge>
                ),
              },
              {
                key: "contact",
                header: "Contact",
                render: (p) => (
                  <span className="flex items-center gap-2">
                    <AvatarUI name={p.contact?.name} size={26} />
                    <span className="text-[13.5px] font-medium text-ink">{p.contact?.name}</span>
                  </span>
                ),
              },
              {
                key: "doc",
                header: "Document",
                render: (p) => (
                  <span className="text-[13px] text-ink-soft">
                    {p.invoice ? `Invoice #${p.invoice.id}` : p.bill ? `Bill #${p.bill.id}` : "General"}
                  </span>
                ),
              },
              {
                key: "method",
                header: "Method",
                render: (p) => (
                  <Badge tone="neutral">
                    <span className="capitalize">{p.method}</span>
                  </Badge>
                ),
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                render: (p) => (
                  <span className={`num font-semibold ${p.direction === "in" ? "text-leaf-700" : "text-clay-700"}`}>
                    {p.direction === "in" ? "+" : "-"}
                    {money(p.amount)}
                  </span>
                ),
              },
            ]}
            rows={rows}
            rowKey={(p) => p.id}
          />
        )}
      </Panel>

      {/* Picker: choose an open bill or invoice, then the PayModal takes over */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        labelledBy="payment-picker-title"
        title="Record a payment"
        subtitle="Pick the open document to settle."
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button onClick={beginPay} disabled={!chosen} icon={HandCoins}>
              Continue
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={pickType}
            onChange={(v) => { setPickType(v); setPickDoc(""); }}
            options={[
              { value: "bill", label: "Pay a vendor bill" },
              { value: "invoice", label: "Receive from invoice" },
            ]}
          />
          <Field label={pickType === "bill" ? "Open vendor bills" : "Open customer invoices"}>
            <Select value={pickDoc} onChange={(e) => setPickDoc(e.target.value)}>
              <option value="">Select…</option>
              {pool.map((d) => (
                <option key={`${d.kind}-${d.id}`} value={d.id}>
                  {d.name} · {money(d.outstanding)} open
                </option>
              ))}
            </Select>
          </Field>
          {pool.length === 0 && (
            <p className="rounded-lg bg-paper px-3 py-2 text-[13px] text-ink-mute">
              {pickType === "bill" ? "No open vendor bills right now. Convert a purchase order first." : "No open invoices right now. Generate one from a sales order first."}
            </p>
          )}
        </div>
      </Modal>

      <PayModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        endpointBase={payTarget?.kind === "bill" ? "/vendor-bills" : "/customer-invoices"}
        doc={payTarget ? { kind: payTarget.kind, id: payTarget.id, partyName: payTarget.vendor, totalAmount: payTarget.totalAmount, paidAmount: payTarget.paidAmount, status: payTarget.status } : null}
        onPaid={() => {
          notify({ title: "Register updated", detail: "The document and ledger are up to date." });
          reload();
        }}
      />
    </div>
  );
}