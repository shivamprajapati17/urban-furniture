import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { money, dateInputValue, fromISO } from "../lib/format";
import { Button, Field, Input, Modal, Select, formatError } from "./ui";
import LineItemsEditor from "./LineItemsEditor";

function defaultLines(kind) {
  return [{ productId: "", qty: 1, unitPrice: "", taxPercent: kind === "sales" ? 18 : 0 }];
}

export default function OrderModal({ kind, open, meta, editing, onClose, onSaved }) {
  const isSales = kind === "sales";
  const parties = (meta?.contacts || []).filter((c) => (isSales ? ["customer", "both"].includes(c.type) : ["vendor", "both"].includes(c.type)));
  const products = meta?.products || [];
  const analyticAccounts = meta?.analyticAccounts || [];

  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        partyId: editing ? (isSales ? editing.customerId : editing.vendorId) : "",
        orderDate: editing ? dateInputValue(editing.orderDate) : dateInputValue(new Date()),
        status: editing ? editing.status : "draft",
        analyticAccountId: editing?.analyticAccountId || "",
        lines: editing?.lines?.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          taxPercent: l.taxPercent ?? 0,
        })) || defaultLines(kind),
      });
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const missingProduct = form.lines.some((l) => !l.productId);
      if (missingProduct) throw new Error("Every line needs a product. Remove empty lines first.");
      const body = {
        [isSales ? "customerId" : "vendorId"]: Number(form.partyId),
        orderDate: form.orderDate,
        status: form.status,
        analyticAccountId: form.analyticAccountId ? Number(form.analyticAccountId) : null,
        lines: form.lines.map((l) => ({
          productId: Number(l.productId),
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          ...(isSales ? { taxPercent: Number(l.taxPercent || 0) } : {}),
        })),
      };
      if (editing) {
        await api.put(`/${isSales ? "sales-orders" : "purchase-orders"}/${editing.id}`, body);
      } else {
        await api.post(`/${isSales ? "sales-orders" : "purchase-orders"}`, body);
      }
      onSaved?.(editing ? "updated" : "created");
      onClose();
    } catch (err) {
      setErrors({ form: formatError(err) });
    } finally {
      setSaving(false);
    }
  };

  const title = isSales ? "Sales order" : "Purchase order";
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="order-modal-title"
      title={editing ? `Edit ${title.toLowerCase()} #${editing.id}` : `New ${title.toLowerCase()}`}
      subtitle={
        editing
          ? isSales
            ? `Customer: ${editing.customer?.name}`
            : `Vendor: ${editing.vendor?.name}`
          : isSales
            ? "Confirm the order, then generate a customer invoice from it."
            : "Confirm the order, then convert it into a vendor bill."
      }
      width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="order-form" loading={saving}>
            {editing ? "Save changes" : form.status === "confirmed" ? "Create & confirm" : "Create draft"}
          </Button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit}>
        {errors.form && (
          <p className="mb-4 rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{errors.form}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={isSales ? "Customer" : "Vendor"}>
            <Select required value={form.partyId} onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))}>
              <option value="">Choose {isSales ? "a customer" : "a vendor"}…</option>
              {parties.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Order date">
            <Input type="date" required value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
          </Field>
          <Field label="Cost centre (optional)" hint="Tags the income/expense line for the budget report.">
            <Select value={form.analyticAccountId} onChange={(e) => setForm((f) => ({ ...f, analyticAccountId: e.target.value }))}>
              <option value="">No cost centre</option>
              {analyticAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Line items"
            hint={
              isSales
                ? "Unit price starts at your sales price. Tax is added per line."
                : "Unit price starts at your cost price."
            }
          >
            <LineItemsEditor
              kind={kind}
              products={products}
              lines={form.lines}
              onChange={(lines) => setForm((f) => ({ ...f, lines }))}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-paper/60 px-4 py-2.5">
          <span className="text-[13px] text-ink-mute">
            Saved as <span className="font-medium text-ink">{form.status === "confirmed" ? "confirmed (ready to bill/invoice)" : "draft"}</span>
          </span>
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={form.status === "confirmed"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "confirmed" : "draft" }))}
              className="h-4 w-4 rounded border-line-strong accent-walnut-600"
            />
            Mark confirmed
          </label>
        </div>
      </form>
    </Modal>
  );
}