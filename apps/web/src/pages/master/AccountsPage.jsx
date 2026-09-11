import { useState } from "react";
import { BookOpen, ChevronDown, Plus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useData";
import { ACCOUNT_TYPES } from "../../lib/constants";
import { money, moneySigned } from "../../lib/format";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  RowSkeleton,
  Segmented,
  Select,
  formatError,
  useNotify,
} from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";

const TYPE_ORDER = ["asset", "liability", "income", "expense", "capital"];

function signOf(type) {
  return type === "asset" || type === "expense" ? "Dr" : "Cr";
}

export default function AccountsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const { data, loading, reload } = useFetch("/accounts");
  const [open, setOpen] = useState({ asset: true, liability: true, income: true, expense: true, capital: true });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", type: "asset" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("table");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/accounts", form);
        notify({ title: "Account added", detail: `${form.name} is ready to post to.` });
      } else {
        await api.put(`/accounts/${editing}`, form);
        notify({ title: "Account updated" });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setErrors({ form: formatError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Chart of accounts"
        description="The accounts the ledger posts to. Balances are live from journal entries; type decides which report a balance appears in."
        crumbs={[{ label: "Master data" }, { label: "Chart of accounts" }]}
        actions={
          <div className="flex items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table" },
                { value: "board", label: "Board" },
              ]}
            />
            <Button icon={Plus} onClick={() => { setForm({ name: "", type: "asset" }); setErrors({}); setEditing("new"); }}>
              New account
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel><RowSkeleton rows={8} cols={3} /></Panel>
      ) : !data || data.length === 0 ? (
        <Panel>
          <EmptyState
            icon={BookOpen}
            title="No accounts yet"
            hint="Create the accounts your journal entries will post to: Cash, Bank, Debtors, Creditors, income and expense accounts."
          />
        </Panel>
      ) : view === "board" ? (
        <KanbanBoard
          items={data || []}
          onCardClick={(a) => { setForm({ name: a.name, type: a.type }); setErrors({}); setEditing(a.id); }}
          columns={TYPE_ORDER.map((type) => ({
            key: type,
            label: ACCOUNT_TYPES[type].label,
            dot: type === "asset" ? "bg-leaf-500" : type === "liability" ? "bg-clay-600" : type === "income" ? "bg-azure-600" : type === "expense" ? "bg-gold-500" : "bg-walnut-600",
            matches: (a) => a.type === type,
          }))}
          renderCard={(a) => (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-[13px] font-semibold ${a.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{a.name}</p>
                {a.isArchived && <Badge tone="neutral">Archived</Badge>}
              </div>
              <p className="mt-1.5 text-xs text-ink-mute">{ACCOUNT_TYPES[a.type]?.desc}</p>
              <p className="num mt-2 text-[13px] font-medium text-ink">
                {a.balance === 0 ? <span className="text-ink-faint">—</span> : `${signOf(a.type)} ${money(Math.abs(a.balance))}`}
              </p>
            </div>
          )}
        />
      ) : (
        <div className="space-y-4">
          {TYPE_ORDER.map((type) => {
            const group = (data || []).filter((a) => a.type === type);
            if (group.length === 0) return null;
            const isOpen = open[type];
            const drSide = type === "asset" || type === "expense";
            const total = group.reduce((a, x) => a + (drSide ? x.balance : -x.balance), 0);
            return (
              <Panel key={type} pad={false}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [type]: !o[type] }))}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5"
                >
                  <span className="flex items-center gap-2.5">
                    <ChevronDown className={`h-4 w-4 text-ink-mute transition-transform ${isOpen ? "" : "-rotate-90"}`} strokeWidth={2} />
                    <span className="text-[14.5px] font-semibold text-ink">{ACCOUNT_TYPES[type].label}s</span>
                    <Badge tone="neutral">{group.length}</Badge>
                  </span>
                  <span className="num text-[13px] font-medium text-ink-soft">
                    {signOf(type)} <span className={total !== 0 ? "text-ink" : "text-ink-faint"}>{money(Math.abs(total))}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-line">
                    <div className="divide-y divide-line">
                      {group.map((a) => (
                        <div key={a.id} className="group flex items-center justify-between gap-3 px-5 py-2.5 pl-[52px]">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <p className={`truncate text-[13.5px] ${a.isArchived ? "text-ink-faint line-through" : "text-ink"}`}>{a.name}</p>
                            {a.isArchived && <Badge tone="neutral">Archived</Badge>}
                          </div>
                          <span className="num text-[13px] font-medium tabular-nums text-ink">
                            {a.balance === 0 ? (
                              <span className="text-ink-faint">-</span>
                            ) : (
                              <span className={a.balance > 0 === (type === "asset" || type === "expense") ? "text-ink" : "text-ink-soft"}>
                                {signOf(type)} {money(Math.abs(a.balance))}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="account-modal-title"
        title={editing === "new" ? "New account" : "Rename / reclassify account"}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="account-form" loading={saving}>{editing === "new" ? "Add account" : "Save changes"}</Button>
          </>
        }
      >
        <form id="account-form" onSubmit={save} className="space-y-4">
          {errors.form && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{errors.form}</p>}
          <Field label="Account name" hint="Keep names self-explanatory; the ledger finds accounts by name.">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Delivery charges expense" autoFocus />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {Object.entries(ACCOUNT_TYPES).map(([val, m]) => (
                <option key={val} value={val}>{m.label} · {m.desc}</option>
              ))}
            </Select>
          </Field>
          <p className="rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-ink-mute">
            {user.role === "admin"
              ? "Renaming affects future postings only. Accounts referenced by existing journal lines keep their history."
              : "Account maintenance is limited to naming and type for your role."}
          </p>
        </form>
      </Modal>
    </div>
  );
}