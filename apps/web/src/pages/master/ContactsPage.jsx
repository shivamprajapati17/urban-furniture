import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, ContactRound, FileSpreadsheet, Mail, MapPin, Pencil, Phone, Plus, Upload, UserRound } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useData";
import { CONTACT_TYPES } from "../../lib/constants";
import { money } from "../../lib/format";
import { downloadCSV, fileStamp } from "../../lib/export";
import {
  Avatar,
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

const EMPTY = {
  name: "",
  type: "customer",
  email: "",
  mobile: "",
  city: "",
  state: "",
  pincode: "",
  profileImageUrl: "",
};

export default function ContactsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useFetch("/contacts");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null = closed, EMPTY-like object = open
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("table");
  const fileRef = useRef(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      openCreate();
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const list = data || [];
    return list.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!`${c.name} ${c.email || ""} ${c.city || ""}`.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, typeFilter]);

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setEditing("new");
  };
  const openEdit = (c) => {
    setForm({ name: c.name, type: c.type, email: c.email || "", mobile: c.mobile || "", city: c.city || "", state: c.state || "", pincode: c.pincode || "", profileImageUrl: c.profileImageUrl || "" });
    setErrors({});
    setEditing(c.id);
  };

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
      const body = { ...form, profileImageUrl: form.profileImageUrl || null };
      if (editing === "new") {
        await api.post("/contacts", body);
        notify({ title: "Contact created", detail: `${form.name} is ready to transact with.` });
      } else {
        await api.put(`/contacts/${editing}`, body);
        notify({ title: "Contact updated", detail: `${form.name} saved.` });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setErrors({ form: formatError(err) });
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (c) => {
    try {
      await api.post(`/contacts/${c.id}/archive`);
      notify({
        title: c.isArchived ? "Contact restored" : "Contact archived",
        detail: c.isArchived ? `${c.name} can be used in new transactions again.` : `${c.name} is hidden from new transactions but history is kept.`,
        tone: c.isArchived ? "success" : "info",
      });
      reload();
    } catch (err) {
      notify({ title: "Could not archive", detail: formatError(err), tone: "error" });
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Contacts"
        description="Customers, vendors and parties that are both. Archived contacts stay on historical documents but can't start new ones."
        crumbs={[{ label: "Master data" }, { label: "Contacts" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              disabled={rows.length === 0}
              onClick={() =>
                downloadCSV(
                  `contacts-${fileStamp()}.csv`,
                  rows.map((c) => ({
                    name: c.name,
                    type: c.type,
                    email: c.email || "",
                    mobile: c.mobile || "",
                    city: c.city || "",
                    state: c.state || "",
                    pincode: c.pincode || "",
                    status: c.isArchived ? "archived" : "active",
                  }))
                )
              }
            >
              Export CSV
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              New contact
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or city…" className="w-full sm:w-72" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              { value: "customer", label: "Customers" },
              { value: "vendor", label: "Vendors" },
              { value: "both", label: "Both" },
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
          <RowSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ContactRound}
            title="No contacts yet"
            hint="Add the customers and vendors you trade with. Each one gets a profile here."
            action={<Button icon={Plus} onClick={openCreate}>New contact</Button>}
          />
        ) : view === "board" ? (
          <KanbanBoard
            items={rows}
            onCardClick={openEdit}
            columns={[
              { key: "customer", label: "Customers", dot: "bg-leaf-500", matches: (c) => c.type === "customer" },
              { key: "vendor", label: "Vendors", dot: "bg-gold-500", matches: (c) => c.type === "vendor" },
              { key: "both", label: "Customer & vendor", dot: "bg-azure-600", matches: (c) => c.type === "both" },
            ]}
            renderCard={(c) => (
              <div>
                <div className="flex items-center gap-2">
                  <Avatar name={c.name} size={26} src={c.profileImageUrl} />
                  <p className={`truncate text-[13px] font-semibold ${c.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{c.name}</p>
                </div>
                <p className="mt-1.5 truncate text-xs text-ink-mute">{c.email || "—"}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-faint">
                  <span className="truncate">{[c.city, c.state].filter(Boolean).join(", ") || "No location"}</span>
                  <span className="shrink-0">{c._count.purchaseOrders + c._count.salesOrders} orders</span>
                </div>
              </div>
            )}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Contact",
                render: (c) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} size={30} src={c.profileImageUrl} />
                    <div className="min-w-0 leading-tight">
                      <p className={`truncate text-[13.5px] font-medium ${c.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{c.name}</p>
                      <p className="text-xs text-ink-mute">{CONTACT_TYPES[c.type]?.label}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                header: "",
                render: (c) => c.isArchived && <Badge tone="neutral">Archived</Badge>,
              },
              {
                key: "contact",
                header: "Contact details",
                render: (c) => (
                  <div className="flex flex-col gap-0.5 text-[13px] text-ink-soft">
                    {c.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-ink-faint" /> {c.email}
                      </span>
                    )}
                    {c.mobile && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-ink-faint" /> {c.mobile}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "place",
                header: "Location",
                render: (c) => (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                    {c.city ? (
                      <>
                        <MapPin className="h-3.5 w-3.5 text-ink-faint" /> {c.city}
                        {c.state ? `, ${c.state}` : ""}
                      </>
                    ) : (
                      <span className="text-ink-faint">-</span>
                    )}
                  </span>
                ),
              },
              {
                key: "volume",
                header: "Docs",
                align: "right",
                render: (c) => (
                  <span className="num text-[13px] text-ink-mute">
                    {c._count.purchaseOrders + c._count.salesOrders} orders
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <IconButton label="Edit" onClick={() => openEdit(c)} disabled={c.isArchived}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    {user.role === "admin" && (
                      <IconButton label={c.isArchived ? "Restore" : "Archive"} tone={c.isArchived ? "default" : "danger"} onClick={() => toggleArchive(c)}>
                        {c.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </IconButton>
                    )}
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(c) => c.id}
          />
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="contact-modal-title"
        title={editing === "new" ? "New contact" : "Edit contact"}
        subtitle={editing === "new" ? "Add a customer, vendor, or a party that is both." : "Update the contact profile."}
        width="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="contact-form" loading={saving}>
              {editing === "new" ? "Create contact" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="contact-form" onSubmit={save} className="space-y-5">
          {errors.form && (
            <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{errors.form}</p>
          )}
          <div className="space-y-3">
            <Field label="Profile photo" hint="Optional. Shows in the contact list and on documents.">
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
            <Field label="Contact type" hint="Gates which documents this contact can appear on.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Object.entries(CONTACT_TYPES).map(([val, m]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: val }))}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      form.type === val ? "border-walnut-600 bg-walnut-50 ring-1 ring-walnut-600" : "border-line-strong hover:border-walnut-300"
                    }`}
                  >
                    <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                    <span className="block text-[11.5px] text-ink-mute">{m.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Full name / company" error={errors.name}>
              <Input required value={form.name} onChange={set("name")} placeholder="e.g. Azure Furniture" autoFocus />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Contact details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" />
              </Field>
              <Field label="Mobile">
                <Input value={form.mobile} onChange={set("mobile")} placeholder="+91 98XXX XXXXX" />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Address</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="City">
                <Input value={form.city} onChange={set("city")} placeholder="Bengaluru" />
              </Field>
              <Field label="State">
                <Input value={form.state} onChange={set("state")} placeholder="Karnataka" />
              </Field>
              <Field label="PIN code">
                <Input value={form.pincode} onChange={set("pincode")} placeholder="560001" />
              </Field>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}