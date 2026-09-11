import { useState } from "react";
import { ArrowUpRight, Building2, CalendarDays, FileText, HandCoins, Hash, Receipt } from "lucide-react";
import { money, dateOnly } from "../lib/format";
import { round2 } from "../lib/format-helpers";
import { PAYMENT_METHODS } from "../lib/constants";
import { Avatar, Badge, Button, EmptyState, Modal, StatusBadge } from "./ui";
import PayModal from "./PayModal";

function LineRows({ doc, kind }) {
  const order = doc.so || doc.po;
  const lines = order?.lines || [];
  const taxTotal = doc.taxAmount || 0;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
          <th className="py-2 pr-2">Item</th>
          <th className="w-20 py-2 text-right">Qty</th>
          <th className="w-32 py-2 text-right">Unit price</th>
          {kind === "invoice" && <th className="w-20 py-2 text-right">Tax</th>}
          <th className="w-32 py-2 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            <td className="py-2 pr-2">
              <p className="font-medium text-ink">{l.product?.name}</p>
              <p className="text-xs text-ink-faint">#{l.productId}</p>
            </td>
            <td className="num py-2 text-right text-ink-soft">{l.qty}</td>
            <td className="num py-2 text-right text-ink-soft">{money(l.unitPrice)}</td>
            {kind === "invoice" && <td className="num py-2 text-right text-ink-soft">{l.taxPercent ?? 18}%</td>}
            <td className="num py-2 text-right font-medium text-ink">{money(l.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DocDetail({ doc, kind, onClose, endpointBase, pathOverride, canPay, onChanged }) {
  // kind: 'bill' | 'invoice'
  const [payOpen, setPayOpen] = useState(false);
  if (!doc) return null;

  const party = kind === "bill" ? doc.vendor : doc.customer;
  const docLabel = kind === "bill" ? "Vendor bill" : "Customer invoice";
  const outstanding = round2(doc.totalAmount - doc.paidAmount);
  const subLabel = kind === "bill" ? `Purchase order #${doc.poId ?? "-"}` : `Sales order #${doc.soId ?? "-"}`;

  return (
    <>
      <Modal
        open={!!doc}
        onClose={onClose}
        labelledBy="doc-detail-title"
        title=""
        width="max-w-2xl"
      >
        {/* Document masthead */}
        <div className="-mx-5 -mt-4 mb-4 border-b border-line bg-paper/50 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-walnut-600 text-white">
                {kind === "bill" ? <Receipt className="h-5 w-5" strokeWidth={1.6} /> : <FileText className="h-5 w-5" strokeWidth={1.6} />}
              </span>
              <div>
                <p id="doc-detail-title" className="text-base font-semibold text-ink">
                  {docLabel} #{doc.id}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-ink-mute">
                  <Hash className="h-3 w-3" /> {subLabel}
                </p>
              </div>
            </div>
            <StatusBadge status={doc.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Avatar name={party?.name} size={26} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs text-ink-mute">{kind === "bill" ? "Vendor" : "Customer"}</p>
                <p className="truncate text-[13px] font-medium text-ink">{party?.name}</p>
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-ink-mute">
                <CalendarDays className="h-3 w-3" /> {kind === "bill" ? "Bill date" : "Invoice date"}
              </p>
              <p className="text-[13px] font-medium text-ink">{dateOnly(doc.billDate || doc.invoiceDate)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-ink-mute">
                <CalendarDays className="h-3 w-3" /> Due
              </p>
              <p className="text-[13px] font-medium text-ink">{dateOnly(doc.dueDate)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-ink-mute">
                <Building2 className="h-3 w-3" /> Status
              </p>
              <p className="text-[13px] font-medium text-ink">
                {money(doc.paidAmount)} of {money(doc.totalAmount)} paid
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <LineRows doc={doc} kind={kind} />

        <div className="mt-3 flex justify-end">
          <div className="w-72 space-y-1.5">
            {kind === "invoice" && doc.taxAmount > 0 && (
              <div className="flex justify-between text-[13px] text-ink-soft">
                <span>Taxable value</span>
                <span className="num">{money(round2(doc.totalAmount - (doc.taxAmount || 0)))}</span>
              </div>
            )}
            {kind === "invoice" && doc.taxAmount > 0 && (
              <div className="flex justify-between text-[13px] text-ink-soft">
                <span>Tax</span>
                <span className="num">{money(doc.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-semibold text-ink">
              <span>Total</span>
              <span className="num">{money(doc.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-mute">Outstanding</span>
              <span className={`num font-semibold ${outstanding > 0 ? "text-clay-700" : "text-leaf-700"}`}>{money(outstanding)}</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Payment history</p>
          {doc.payments?.length === 0 ? (
            <p className="text-[13px] text-ink-mute">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {doc.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-ink-soft">
                    {dateOnly(p.paymentDate)} · {PAYMENT_METHODS[p.method]?.label} {p.direction === "out" ? "payment out" : "payment in"}
                  </span>
                  <span className="num text-[13px] font-medium text-ink">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-xs text-ink-mute">
            {doc.status === "paid"
              ? "Settled. Nothing left to do."
              : canPay
                ? "Register a payment to reduce the outstanding balance."
                : "Payment on this document is recorded by the Urban Furniture team."}
          </p>
          {canPay && outstanding > 0 && doc.status !== "paid" && (
            <Button icon={HandCoins} onClick={() => setPayOpen(true)}>
              Register payment
            </Button>
          )}
        </div>
      </Modal>

      <PayModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        endpointBase={endpointBase}
        pathOverride={pathOverride}
        doc={doc ? { kind, id: doc.id, partyName: party?.name, totalAmount: doc.totalAmount, paidAmount: doc.paidAmount, status: doc.status } : null}
        onPaid={onChanged}
      />
    </>
  );
}