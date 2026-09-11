import { useEffect, useState } from "react";
import { Banknote, HandCoins, Landmark } from "lucide-react";
import { api } from "../lib/api";
import { money, todayInput } from "../lib/format";
import { round2 } from "../lib/format-helpers";
import { Button, Field, Input, Modal, Segmented, formatError, useNotify } from "./ui";

/**
 * @param doc  { kind: 'bill' | 'invoice', id, partyName, totalAmount, paidAmount, status }
 * @param endpointBase  '/vendor-bills' | '/customer-invoices'
 * @param pathOverride  when set, posted to this path instead (contact portal uses '/me/pay')
 */
export default function PayModal({ open, onClose, doc, endpointBase, pathOverride, onPaid }) {
  const notify = useNotify();
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const outstanding = doc ? round2(doc.totalAmount - doc.paidAmount) : 0;

  useEffect(() => {
    if (open) {
      setMethod(doc?.kind === "bill" ? "bank" : "bank");
      setAmount(outstanding > 0 ? String(outstanding) : "");
      setPaymentDate(todayInput());
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const path = pathOverride || `${endpointBase}/${doc.kind === "bill" ? "bills" : "invoices"}/${doc.id}/pay`;
      await api.post(path, {
        ...(doc.kind === "bill" ? { billId: doc.id } : { invoiceId: doc.id }),
        amount: Number(amount),
        method,
        paymentDate,
      });
      notify({
        title: `Payment of ${money(Number(amount))} recorded`,
        detail: `${doc.partyName} · via ${method === "bank" ? "bank" : "cash"}. The ledger entry is balanced and posted.`,
      });
      onClose();
      onPaid?.();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const fullyPaid = doc?.status === "paid";

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="pay-modal-title"
      title="Register payment"
      subtitle={
        doc
          ? `${doc.partyName} · ${doc.kind === "bill" ? "bill" : "invoice"} #${doc.id} · outstanding ${money(outstanding)}`
          : undefined
      }
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="pay-form" loading={saving} disabled={fullyPaid}>
            {fullyPaid ? "Already paid" : "Record payment"}
          </Button>
        </>
      }
    >
      {fullyPaid ? (
        <p className="flex items-center gap-2 rounded-lg border border-leaf-100 bg-leaf-50 px-3 py-2.5 text-[13px] text-leaf-700">
          <HandCoins className="h-4 w-4" /> This {doc.kind === "bill" ? "bill" : "invoice"} is fully paid. Nothing is outstanding.
        </p>
      ) : (
        <form id="pay-form" onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{error}</p>}
          <Field label="Payment method">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("bank")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  method === "bank" ? "border-walnut-600 bg-walnut-50 text-walnut-800 ring-1 ring-walnut-600" : "border-line-strong hover:border-walnut-300"
                }`}
              >
                <Landmark className="h-4 w-4" strokeWidth={1.8} /> Bank
              </button>
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  method === "cash" ? "border-walnut-600 bg-walnut-50 text-walnut-800 ring-1 ring-walnut-600" : "border-line-strong hover:border-walnut-300"
                }`}
              >
                <Banknote className="h-4 w-4" strokeWidth={1.8} /> Cash
              </button>
            </div>
          </Field>
          <Field
            label="Amount"
            hint={`Outstanding balance is ${money(outstanding)}. Payments above it are rejected.`}
            error={error ? undefined : undefined}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">₹</span>
              <Input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={outstanding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 text-right"
              />
            </div>
          </Field>
          <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2">
            <span className="text-[13px] text-ink-mute">Fully settle at {money(outstanding)}</span>
            <button
              type="button"
              onClick={() => setAmount(String(outstanding))}
              className="text-[13px] font-medium text-walnut-700 hover:underline"
            >
              Pay full balance
            </button>
          </div>
          <Field label="Payment date">
            <Input type="date" required value={paymentDate} max={todayInput()} onChange={(e) => setPaymentDate(e.target.value)} />
          </Field>
          <p className="text-xs leading-relaxed text-ink-mute">
            This posts {doc?.kind === "bill" ? "Dr Creditors, Cr Bank/Cash" : "Dr Bank/Cash, Cr Debtors"} automatically.
          </p>
        </form>
      )}
    </Modal>
  );
}