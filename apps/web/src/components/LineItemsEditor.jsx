import { Plus, Trash2 } from "lucide-react";
import { money, round2 } from "../lib/format-helpers";
import { Select } from "./ui";

const TAX_PICKS = [0, 5, 12, 18, 28];

export default function LineItemsEditor({ kind, products, lines, onChange }) {
  const isSales = kind === "sales";

  const update = (i, patch) => {
    const next = lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  };

  const pickProduct = (i, productId) => {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;
    update(i, {
      productId: product.id,
      unitPrice: isSales ? product.salesPrice : product.costPrice ?? product.salesPrice,
    });
  };

  const addLine = () => onChange([...lines, { productId: "", qty: 1, unitPrice: "", taxPercent: isSales ? 18 : 0 }]);
  const removeLine = (i) => onChange(lines.filter((_, idx) => idx !== i));

  const subtotal = (l) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
  const totalLines = lines.reduce((a, l) => a + subtotal(l), 0);
  const totalTax = isSales ? lines.reduce((a, l) => a + subtotal(l) * ((Number(l.taxPercent) || 0) / 100), 0) : 0;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/70 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
              <th className="w-8 px-2 py-2" />
              <th className="px-2 py-2">Product</th>
              <th className="w-20 px-2 py-2">Qty</th>
              <th className="w-32 px-2 py-2">Unit price</th>
              {isSales && <th className="w-24 px-2 py-2">Tax</th>}
              <th className="w-32 px-2 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={isSales ? 6 : 5} className="px-4 py-8 text-center text-[13px] text-ink-mute">
                  No lines yet. Add the first line below.
                </td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="rounded p-1 text-ink-faint transition-colors hover:bg-clay-50 hover:text-clay-600"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
                <td className="min-w-44 px-2 py-1.5">
                  <Select
                    value={l.productId || ""}
                    onChange={(e) => pickProduct(i, e.target.value)}
                    className="h-8.5 text-[13px]"
                  >
                    <option value="">Choose a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={l.qty}
                    onChange={(e) => update(i, { qty: e.target.value })}
                    className="h-8.5 w-full rounded-lg border border-line-strong bg-surface px-2 text-right text-[13px] focus:border-walnut-600 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={l.unitPrice}
                    onChange={(e) => update(i, { unitPrice: e.target.value })}
                    className="h-8.5 w-full rounded-lg border border-line-strong bg-surface px-2 text-right text-[13px] focus:border-walnut-600 focus:outline-none"
                    placeholder="0.00"
                  />
                </td>
                {isSales && (
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.taxPercent}
                        onChange={(e) => update(i, { taxPercent: e.target.value })}
                        className="h-8.5 w-14 rounded-lg border border-line-strong bg-surface px-1.5 text-right text-[13px] focus:border-walnut-600 focus:outline-none"
                      />
                      <span className="text-xs text-ink-mute">%</span>
                    </div>
                  </td>
                )}
                <td className="num px-2 py-1.5 text-right text-[13px] font-medium text-ink">
                  {round2(subtotal(l)) ? money(subtotal(l)) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isSales && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-mute">Tax slab:</span>
          {TAX_PICKS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(lines.map((l) => ({ ...l, taxPercent: t })))}
              className="rounded-full border border-line-strong px-2 py-0.5 text-xs font-medium text-ink-soft transition-colors hover:border-walnut-500 hover:text-walnut-700"
            >
              {t === 0 ? "No tax" : `${t}%`}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-[13px] font-medium text-walnut-700 transition-colors hover:border-walnut-500 hover:bg-walnut-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <div className="w-72 space-y-1.5 rounded-lg bg-paper px-4 py-3">
          <div className="flex justify-between text-[13px] text-ink-soft">
            <span>Subtotal</span>
            <span className="num font-medium text-ink">{money(totalLines)}</span>
          </div>
          {isSales && (
            <div className="flex justify-between text-[13px] text-ink-soft">
              <span>Tax</span>
              <span className="num font-medium text-ink">{money(totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1.5 text-sm font-semibold text-ink">
            <span>Total</span>
            <span className="num">{money(round2(totalLines + totalTax))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}