import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, Boxes, FileSpreadsheet, Pencil, Plus, Wrench } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useData";
import { PRODUCT_TYPES } from "../../lib/constants";
import { money } from "../../lib/format";
import { downloadCSV, fileStamp } from "../../lib/export";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Panel,
  RowSkeleton,
  SearchInput,
  Segmented,
  Select,
  formatError,
  useNotify,
} from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";

const EMPTY = { name: "", type: "goods", salesPrice: "", costPrice: "", category: "" };

export default function ProductsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useFetch("/products");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("table");

  useEffect(() => {
    if (params.get("new") === "1") {
      setForm(EMPTY);
      setEditing("new");
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !`${p.name} ${p.category || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, typeFilter]);

  const openEdit = (p) => {
    setForm({ name: p.name, type: p.type, salesPrice: p.salesPrice, costPrice: p.costPrice ?? "", category: p.category || "" });
    setEditing(p.id);
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.type === "service") form.costPrice = 0;
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/products", { ...form, salesPrice: Number(form.salesPrice), costPrice: form.costPrice === "" ? null : Number(form.costPrice) });
        notify({ title: "Product created", detail: `${form.name} is available on orders.` });
      } else {
        await api.put(`/products/${editing}`, { ...form, salesPrice: Number(form.salesPrice), costPrice: form.costPrice === "" ? null : Number(form.costPrice) });
        notify({ title: "Product updated", detail: `${form.name} saved.` });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setErrors({ form: formatError(err) });
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (p) => {
    try {
      await api.post(`/products/${p.id}/archive`);
      notify({
        title: p.isArchived ? "Product restored" : "Product archived",
        detail: p.isArchived ? `${p.name} can be ordered again.` : `${p.name} is hidden from new orders.`,
        tone: p.isArchived ? "success" : "info",
      });
      reload();
    } catch (err) {
      notify({ title: "Could not archive", detail: formatError(err), tone: "error" });
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const margin = (p) => (p.costPrice ? p.salesPrice - p.costPrice : null);

  return (
    <div className="page-enter">
      <PageHeader
        title="Products & services"
        description="Everything you sell or buy, priced per unit. Services skip the cost field; combos bundle a list price."
        crumbs={[{ label: "Master data" }, { label: "Products" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              disabled={rows.length === 0}
              onClick={() =>
                downloadCSV(
                  `products-${fileStamp()}.csv`,
                  rows.map((p) => ({
                    name: p.name,
                    type: p.type,
                    category: p.category || "",
                    cost_price: p.costPrice ?? "",
                    sales_price: p.salesPrice,
                    status: p.isArchived ? "archived" : "active",
                  }))
                )
              }
            >
              Export CSV
            </Button>
            <Button icon={Plus} onClick={() => { setForm(EMPTY); setEditing("new"); }}>
              New product
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search products…" className="w-full sm:w-72" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              { value: "goods", label: "Goods" },
              { value: "service", label: "Services" },
              { value: "combo", label: "Combos" },
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
      </div>

      <Panel>
        {loading ? (
          <RowSkeleton rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products yet"
            hint="Add the chairs, tables and services you sell so order lines can reference them."
            action={
              <Button icon={Plus} onClick={() => { setForm(EMPTY); setEditing("new"); }}>
                New product
              </Button>
            }
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            onCardClick={openEdit}
            columns={[
              { key: "goods", label: "Goods", dot: "bg-leaf-500", matches: (p) => p.type === "goods" },
              { key: "service", label: "Services", dot: "bg-azure-600", matches: (p) => p.type === "service" },
              { key: "combo", label: "Combos", dot: "bg-gold-500", matches: (p) => p.type === "combo" },
            ]}
            renderCard={(p) => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-[13px] font-semibold ${p.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{p.name}</p>
                  <Badge tone={p.type === "service" ? "azure" : p.type === "combo" ? "gold" : "leaf"}>{PRODUCT_TYPES[p.type]?.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-mute">{p.category || "Uncategorised"}</p>
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="text-ink-mute">
                    Cost <span className="num font-medium text-ink">{p.costPrice != null ? money(p.costPrice) : "—"}</span>
                  </span>
                  <span className="text-ink-mute">
                    Sell <span className="num font-medium text-ink">{money(p.salesPrice)}</span>
                  </span>
                </div>
              </div>
            )}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Product",
                render: (p) => (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-walnut-50 text-walnut-600">
                      {p.type === "service" ? <Wrench className="h-4 w-4" strokeWidth={1.7} /> : <Boxes className="h-4 w-4" strokeWidth={1.7} />}
                    </span>
                    <div className="leading-tight">
                      <p className={`text-[13.5px] font-medium ${p.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{p.name}</p>
                      <p className="text-xs text-ink-mute">{p.category || "Uncategorised"}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (p) => <Badge tone={p.type === "service" ? "azure" : p.type === "combo" ? "gold" : "neutral"}>{PRODUCT_TYPES[p.type]?.label}</Badge>,
              },
              { key: "archived", header: "", render: (p) => (p.isArchived ? <Badge tone="neutral">Archived</Badge> : null) },
              {
                key: "cost",
                header: "Cost price",
                align: "right",
                render: (p) => (p.costPrice != null ? <span className="num">{money(p.costPrice)}</span> : <span className="text-ink-faint">-</span>),
              },
              {
                key: "sales",
                header: "Sales price",
                align: "right",
                render: (p) => <span className="num font-medium text-ink">{money(p.salesPrice)}</span>,
              },
              {
                key: "margin",
                header: "Margin",
                align: "right",
                render: (p) => {
                  const m = margin(p);
                  return m == null ? <span className="text-ink-faint">-</span> : <span className="num text-leaf-700">{money(m)}</span>;
                },
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (p) => (
                  <div className="flex justify-end gap-1">
                    <IconButton label="Edit" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    {user.role === "admin" && (
                      <IconButton label={p.isArchived ? "Restore" : "Archive"} tone={p.isArchived ? "default" : "danger"} onClick={() => toggleArchive(p)}>
                        {p.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </IconButton>
                    )}
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(p) => p.id}
          />
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="product-modal-title"
        title={editing === "new" ? "New product" : "Edit product"}
        width="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="product-form" loading={saving}>{editing === "new" ? "Create product" : "Save changes"}</Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-5">
          {errors.form && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{errors.form}</p>}

          <Field label="Product type" hint="Type changes which pricing fields apply.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Object.entries(PRODUCT_TYPES).map(([val, m]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: val, ...(val === "service" ? { costPrice: 0 } : {}) }))}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    form.type === val ? "border-walnut-600 bg-walnut-50 ring-1 ring-walnut-600" : "border-line-strong hover:border-walnut-300"
                  }`}
                >
                  <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                  <span className="block text-[11.5px] text-ink-mute">{m.desc}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Name">
            <Input required value={form.name} onChange={set("name")} placeholder="e.g. Teak dining table" autoFocus />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.type !== "service" ? (
              <Field label="Cost price" hint={form.type === "combo" ? "Combined cost of included items" : "What you pay to source it"}>
                <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={set("costPrice")} placeholder="0.00" />
              </Field>
            ) : null}
            <Field label="Sales price">
              <Input type="number" required min="0" step="0.01" value={form.salesPrice} onChange={set("salesPrice")} placeholder="0.00" />
            </Field>
            <Field label="Category" className={form.type !== "service" ? "sm:col-span-2" : ""}>
              <Select value={form.category} onChange={set("category")}>
                <option value="">Uncategorised</option>
                {["Seating", "Tables", "Sofas", "Storage", "Lighting", "Services", "Combos", "Marketing"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}