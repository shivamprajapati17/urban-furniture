"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Tag, Upload, UserRound } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useData";
import {
  CONTACT_TYPES,
  PRODUCT_TYPES,
  ACCOUNT_TYPES,
  JOURNAL_TYPES,
} from "../../lib/constants";
import { initials } from "../../lib/format";
import {
  Badge,
  Button,
  Modal,
  PageHeader,
  Panel,
  RowSkeleton,
  Select,
  Field,
  Input,
  IconButton,
  formatError,
  useNotify,
} from "../../components/ui";

const PILL_CLASSES = {
  draft: "bg-paper-deep text-ink-soft",
  confirmed: "bg-azure-50 text-azure-700",
  posted: "bg-azure-50 text-azure-700",
  billed: "bg-azure-50 text-azure-700",
  invoiced: "bg-azure-50 text-azure-700",
  paid: "bg-leaf-50 text-leaf-700",
  overdue: "bg-clay-50 text-clay-700",
};

function DocPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-current/18 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${PILL_CLASSES[status] || PILL_CLASSES.draft}`}
    >
      {status}
    </span>
  );
}

// ---------- Shared modal scaffolding ----------

function SaveRow({
  open,
  onClose,
  title,
  children,
  footer,
  left = false,
  saving,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={left ? "max-w-lg" : "max-w-md"}
      footer={footer}
    >
      {children}
    </Modal>
  );
}

// ---------- Contacts ----------

const EMPTY_CONTACT = {
  name: "",
  type: "customer",
  email: "",
  mobile: "",
  city: "",
  state: "",
  pincode: "",
  profileImageUrl: "",
  isArchived: false,
};

function ContactsPanel() {
  const notify = useNotify();
  const { data = null, loading, reload: reloadLocal } = useFetch("/contacts");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const fileRef = useRef(null);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, profileImageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        type: form.type,
        profileImageUrl: form.profileImageUrl || null,
      };
      if (editing === "new") {
        await api.post("/contacts", body);
        notify({ title: "Contact created", detail: `${body.name} is ready for transactions.` });
      } else {
        await api.put(`/contacts/${editing}`, body);
        notify({ title: "Contact updated" });
      }
      setEditing(null);
      reloadLocal();
    } catch (err) {
      notify({ title: "Could not save contact", detail: formatError(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(
    () =>
      (data || [])
        .filter((c) => !c.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  return (
    <>
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(EMPTY_CONTACT); setEditing("new"); }}>
          New contact
        </Button>
      </div>

      {loading ? (
        <Panel>
          <RowSkeleton rows={5} cols={6} />
        </Panel>
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink-mute">
              <Tag className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-ink">No contacts yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-mute">
              Add the vendors and customers you trade with so they can be selected on orders and invoices.
            </p>
            <Button
              className="mt-4"
              onClick={() => { setForm(EMPTY_CONTACT); setEditing("new"); }}
            >
              New contact
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-paper/70">
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Contact
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Type
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Email
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Mobile
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {list.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-walnut-50/60"
                >
                  <td className="px-4 py-3 first:pl-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white"
                        style={{ backgroundColor: "#8B5E34", width: 30, height: 30, fontSize: 11 }}
                        aria-hidden
                      >
                        {initials(c.name)}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-medium text-ink">{c.name}</p>
                        {c.isArchived && (
                          <span className="text-[11px] text-ink-faint line-through">archived</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        c.type === "customer"
                          ? "leaf"
                          : c.type === "vendor"
                          ? "gold"
                          : "azure"
                      }
                    >
                      {CONTACT_TYPES[c.type]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {c.mobile || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft text-right">
                    {[c.city, c.state, c.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <SaveRow
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New contact" : "Edit contact"}
        left
        saving={saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="contact-form" loading={saving}>
              {editing === "new" ? "Create contact" : "Save contact"}
            </Button>
          </>
        }
      >
        <form id="contact-form" onSubmit={save} className="space-y-4">
          <Field label="Profile photo" hint="Optional. Shows in the contact list.">
            <div className="flex items-center gap-3">
              {form.profileImageUrl ? (
                <img src={form.profileImageUrl} alt="" className="h-14 w-14 rounded-full border border-line object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong bg-paper text-ink-faint">
                  <UserRound className="h-5 w-5" strokeWidth={1.6} />
                </span>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
                  Upload photo
                </Button>
                {form.profileImageUrl && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setForm((f) => ({ ...f, profileImageUrl: "" }))}>
                    Remove
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              </div>
            </div>
          </Field>
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Azure Furniture"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <div className="flex rounded-lg border border-line bg-paper-deep/60 p-1">
              {[
                { value: "customer", label: "Customer" },
                { value: "vendor", label: "Vendor" },
                { value: "both", label: "Both" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    form.type === opt.value
                      ? "bg-surface text-walnut-700 shadow-card"
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="vendor@example.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile">
              <Input
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Bengaluru"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="Karnataka"
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                placeholder="560034"
              />
            </Field>
          </div>
        </form>
      </SaveRow>
    </>
  );
}

// ---------- Products ----------

const EMPTY_PRODUCT = {
  name: "",
  type: "goods",
  salesPrice: "",
  costPrice: "",
  category: "",
  isArchived: false,
};

function ProductsPanel() {
  const notify = useNotify();
  const { data = null, loading, reload: reloadLocal } = useFetch("/products");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_PRODUCT);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        salesPrice: form.salesPrice === "" ? undefined : Number(form.salesPrice),
        costPrice: form.costPrice === "" ? undefined : Number(form.costPrice),
      };
      if (editing === "new") {
        await api.post("/products", body);
        notify({ title: "Product added", detail: `${body.name} is ready for orders.` });
      } else {
        await api.put(`/products/${editing}`, body);
        notify({ title: "Product updated" });
      }
      setEditing(null);
      reloadLocal();
    } catch (err) {
      notify({ title: "Could not save product", detail: formatError(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(
    () =>
      (data || [])
        .filter((p) => !p.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  return (
    <>
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(EMPTY_PRODUCT); setEditing("new"); }}>
          New product
        </Button>
      </div>

      {loading ? (
        <Panel>
          <RowSkeleton rows={5} cols={5} />
        </Panel>
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink-mute">
              <Tag className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-ink">No products yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-mute">
              Add the items you buy and sell — chairs, tables, fabrication services, bundled offers — so
              they can be used on orders.
            </p>
            <Button
              className="mt-4"
              onClick={() => { setForm(EMPTY_PRODUCT); setEditing("new"); }}
            >
              New product
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-paper/70">
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Product
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Type
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Sales price
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Cost price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {list.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-walnut-50/60">
                  <td className="px-4 py-3 first:pl-5">
                    <p className="text-[13.5px] font-medium text-ink">{p.name}</p>
                    {p.category && (
                      <p className="text-xs text-ink-mute">{p.category}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        p.type === "goods"
                          ? "leaf"
                          : p.type === "service"
                          ? "azure"
                          : "gold"
                      }
                    >
                      {PRODUCT_TYPES[p.type]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {p.salesPrice != null ? `₹${p.salesPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {p.costPrice != null ? `₹${p.costPrice.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <SaveRow
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New product" : "Edit product"}
        saving={saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              {editing === "new" ? "Create product" : "Save product"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Wooden office chair"
              autoFocus
            />
          </Field>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Seating"
            />
          </Field>
          <Field label="Type">
            <div className="flex rounded-lg border border-line bg-paper-deep/60 p-1">
              {[
                { value: "goods", label: "Goods" },
                { value: "service", label: "Service" },
                { value: "combo", label: "Combo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    form.type === opt.value
                      ? "bg-surface text-walnut-700 shadow-card"
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sales price">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.salesPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salesPrice: e.target.value }))
                }
                placeholder="0.00"
              />
            </Field>
            <Field label="Cost price">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, costPrice: e.target.value }))
                }
                placeholder="0.00"
              />
            </Field>
          </div>
        </form>
      </SaveRow>
    </>
  );
}

// ---------- Chart of Accounts ----------

const EMPTY_ACCOUNT = { name: "", type: "asset" };

function AccountsPanel() {
  const notify = useNotify();
  const { data = null, loading, reload: reloadLocal } = useFetch("/accounts");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_ACCOUNT);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/accounts", form);
        notify({ title: "Account added", detail: `${form.name} is ready for journal entries.` });
      } else {
        await api.put(`/accounts/${editing}`, form);
        notify({ title: "Account updated" });
      }
      setEditing(null);
      reloadLocal();
    } catch (err) {
      notify({ title: "Could not save account", detail: formatError(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(
    () =>
      (data || [])
        .filter((a) => !a.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const group = (items, label) =>
    items.length > 0
      ? (
        <section key={label} className="mb-4 last:mb-0">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {label}
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-paper/70">
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Account
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="transition-colors hover:bg-walnut-50/60"
                >
                  <td className="px-4 py-3 first:pl-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-ink">{a.name}</p>
                      <IconButton
                        label="Edit"
                        onClick={() => {
                          setForm({ name: a.name, type: a.type });
                          setEditing(a.id);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 rotate-45" strokeWidth={1.8} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )
      : null;

  return (
    <>
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(EMPTY_ACCOUNT); setEditing("new"); }}>
          New account
        </Button>
      </div>

      {loading ? (
        <Panel>
          <RowSkeleton rows={8} cols={1} />
        </Panel>
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink-mute">
              <Tag className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-ink">No accounts yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-mute">
              Set up your chart of accounts — cash, bank, debtors, creditors, sale income, purchase
              expense — so transactions can be posted to the right places.
            </p>
            <Button
              className="mt-4"
              onClick={() => { setForm(EMPTY_ACCOUNT); setEditing("new"); }}
            >
              New account
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>            {TYPE_LIST.map((type) => {
              const items = list.filter((a) => a.type === type);
              return group(items, ACCOUNT_TYPES[type]?.label);
            },
          )}
        </Panel>
      )}

      <SaveRow
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New account" : "Edit account"}
        saving={saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="account-form" loading={saving}>
              {editing === "new" ? "Create account" : "Save account"}
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={save} className="space-y-4">
          <Field label="Account name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Cash in hand"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <Select
              required
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {Object.entries(ACCOUNT_TYPES).map(([key, meta]) => (
                <option key={key} value={String(key)}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </SaveRow>
    </>
  );
}

// ---------- Journals ----------

const EMPTY_JOURNAL = { name: "", type: "sales", defaultAccountId: "" };

function JournalsPanel() {
  const notify = useNotify();
  const { data = null, loading, reload: reloadLocal } = useFetch("/accounts/journals");
  const { data: accountsData = null } = useFetch("/accounts");
  const accounts = useMemo(() => accountsData || [], [accountsData]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_JOURNAL);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        defaultAccountId: Number(form.defaultAccountId),
      };
      if (editing === "new") {
        await api.post("/accounts/journals", body);
        notify({ title: "Journal added", detail: `${body.name} is ready for transactions.` });
      } else {
        await api.put(`/accounts/journals/${editing}`, body);
        notify({ title: "Journal updated" });
      }
      setEditing(null);
      reloadLocal();
    } catch (err) {
      notify({ title: "Could not save journal", detail: formatError(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(
    () =>
      (data || [])
        .filter((j) => !j.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  return (
    <>
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(EMPTY_JOURNAL); setEditing("new"); }}>
          New journal
        </Button>
      </div>

      {loading ? (
        <Panel>
          <RowSkeleton rows={4} cols={3} />
        </Panel>
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink-mute">
              <Tag className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-ink">No journals yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-mute">
              Configure the journals used when posting entries — sales, purchase, bank and cash — each with
              a default account.
            </p>
            <Button
              className="mt-4"
              onClick={() => { setForm(EMPTY_JOURNAL); setEditing("new"); }}
            >
              New journal
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-paper/70">
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Journal
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Type
                </th>
                <th className="sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-mute">
                  Default account
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {list.map((j) => (
                <tr
                  key={j.id}
                  className="transition-colors hover:bg-walnut-50/60"
                >
                  <td className="px-4 py-3 first:pl-5">
                    <p className="text-[13.5px] font-medium text-ink">{j.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{JOURNAL_TYPES[j.type]?.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {j.defaultAccount?.name || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <SaveRow
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New journal" : "Edit journal"}
        saving={saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="journal-form" loading={saving}>
              {editing === "new" ? "Create journal" : "Save journal"}
            </Button>
          </>
        }
      >
        <form id="journal-form" onSubmit={save} className="space-y-4">
          <Field label="Journal name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Sales journal"
              autoFocus
            />
          </Field>
          <Field label="Type">          <Select
              required
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value }))
              }
            >
              {Object.entries(JOURNAL_TYPES).map(([key, meta]) => (
                <option key={key} value={String(key)}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default account">
            <Select
              required
              value={form.defaultAccountId}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultAccountId: e.target.value }))
              }
            >
              <option value="">Select an account…</option>
              {(accounts || [])
                .filter((a) => !a.isArchived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </Field>
        </form>
      </SaveRow>
    </>
  );
}

// ---------- Page ----------

const TABS = [
  { value: "contacts", label: "Contacts" },
  { value: "products", label: "Products" },
  { value: "accounts", label: "Chart of accounts" },
  { value: "journals", label: "Journals" },
];

const TYPE_LIST = ["asset", "liability", "income", "expense", "capital"];

export default function MasterKanban() {
  const [tab, setTab] = useState("contacts");

  return (
    <div className="page-enter">
      <PageHeader
        title="Master data"
        description="Set up the master records everything else is built from: the people you trade with, the items you buy and sell, the accounts that make up your ledger, and the journals used when posting entries."
        crumbs={[{ label: "Dashboard" }, { label: "Master data" }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded bg-paper-deep px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-mute">
              {TABS.find((t) => t.value === tab)?.label}
            </span>
          </div>
        }
      />

      <Panel>
        <div className="flex gap-4 border-b border-line pb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === t.value
                  ? "bg-walnut-100 text-walnut-800"
                  : "text-ink-mute hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-1">
          {tab === "contacts" && <ContactsPanel />}
        </div>
      </Panel>

      {tab === "products" && <ProductsPanel />}
      {tab === "accounts" && <AccountsPanel />}
      {tab== "journals" && <JournalsPanel />}
    </div>
  );
}
