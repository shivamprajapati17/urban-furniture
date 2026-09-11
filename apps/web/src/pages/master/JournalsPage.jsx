import { useMemo, useState } from "react";
import { BookOpenCheck, Landmark, Pencil, PiggyBank, Plus, ShoppingCart, Tag } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useData";
import { JOURNAL_TYPES } from "../../lib/constants";
import { money } from "../../lib/format";
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
  Segmented,
  Select,
  formatError,
  useNotify,
} from "../../components/ui";
import KanbanBoard from "../../components/KanbanBoard";

const TYPE_ICONS = { sales: ShoppingCart, purchase: PiggyBank, bank: Landmark, cash: Tag };

const EMPTY = { name: "", type: "sales", defaultAccountId: "" };

export default function JournalsPage() {
  const notify = useNotify();
  const { data: journals, loading: jLoading, reload: jReload } = useFetch("/accounts/journals");
  const { data: accounts, loading: aLoading } = useFetch("/accounts");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("table");

  const loading = jLoading || aLoading;

  const incomeLike = useMemo(() => (accounts || []).filter((a) => a.type === "income" || a.type === "expense" || a.type === "asset"), [accounts]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/accounts/journals", form);
        notify({ title: "Journal created", detail: `${form.name} will route postings of its type.` });
      } else {
        await api.put(`/accounts/journals/${editing}`, form);
        notify({ title: "Journal updated" });
      }
      setEditing(null);
      jReload();
    } catch (err) {
      setErrors({ form: formatError(err) });
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = Object.entries(JOURNAL_TYPES).map(([val, m]) => ({ value: val, label: m.label }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Journals"
        description="Journals name where postings come from. The default account is the income, expense or asset account each journal posts its main line to."
        crumbs={[{ label: "Master data" }, { label: "Journals" }]}
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
            <Button icon={Plus} onClick={() => { setForm(EMPTY); setErrors({}); setEditing("new"); }}>
              New journal
            </Button>
          </div>
        }
      />

      <Panel>
        {loading ? (
          <RowSkeleton rows={4} cols={4} />
        ) : !journals || journals.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="No journals configured" hint="A journal ties a posting source (sales, purchase, bank, cash) to its default account." />
        ) : view === "board" ? (
          <KanbanBoard
            items={journals || []}
            onCardClick={(j) => {
              setForm({ name: j.name, type: j.type, defaultAccountId: j.defaultAccountId });
              setEditing(j.id);
            }}
            columns={Object.entries(JOURNAL_TYPES).map(([key, m]) => ({
              key,
              label: m.label,
              dot: key === "sales" ? "bg-leaf-500" : key === "purchase" ? "bg-gold-500" : key === "bank" ? "bg-azure-600" : "bg-walnut-600",
              matches: (j) => j.type === key,
            }))}
            renderCard={(j) => {
              const Icon = TYPE_ICONS[j.type] || Tag;
              return (
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-walnut-50 text-walnut-600">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <p className="truncate text-[13px] font-semibold text-ink">{j.name}</p>
                  </div>
                  <p className="mt-2 text-xs text-ink-mute">
                    Posts to <span className="font-medium text-ink">{j.defaultAccount?.name}</span>
                    <span className="text-ink-faint"> ({j.defaultAccount?.type})</span>
                  </p>
                </div>
              );
            }}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Journal",
                render: (j) => {
                  const Icon = TYPE_ICONS[j.type] || Tag;
                  return (
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-walnut-50 text-walnut-600">
                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                      </span>
                      <span className="text-[13.5px] font-medium text-ink">{j.name}</span>
                    </div>
                  );
                },
              },
              {
                key: "type",
                header: "Type",
                render: (j) => <Badge tone="neutral">{JOURNAL_TYPES[j.type]?.label}</Badge>,
              },
              {
                key: "account",
                header: "Default account",
                render: (j) => (
                  <span className="text-[13px] text-ink-soft">
                    {j.defaultAccount?.name} <span className="text-ink-faint">({j.defaultAccount?.type})</span>
                  </span>
                ),
              },
              {
                key: "role",
                header: "Posts",
                render: (j) => <span className="text-[13px] text-ink-mute">{JOURNAL_TYPES[j.type]?.label} entries land here automatically</span>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (j) => (
                  <div className="flex justify-end">
                    <IconButton
                      label="Edit"
                      onClick={() => {
                        setForm({ name: j.name, type: j.type, defaultAccountId: j.defaultAccountId });
                        setEditing(j.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ),
              },
            ]}
            rows={journals || []}
            rowKey={(j) => j.id}
          />
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="journal-modal-title"
        title={editing === "new" ? "New journal" : "Edit journal"}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="journal-form" loading={saving}>{editing === "new" ? "Create journal" : "Save changes"}</Button>
          </>
        }
      >
        <form id="journal-form" onSubmit={save} className="space-y-4">
          {errors.form && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{errors.form}</p>}
          <Field label="Journal name">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Showroom sales journal" autoFocus />
          </Field>
          <Field label="Journal type">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Default account" hint="Income and expense postings reference this account when you configure the chart.">
            <Select value={form.defaultAccountId} onChange={(e) => setForm((f) => ({ ...f, defaultAccountId: e.target.value }))}>
              <option value="">Select an account…</option>
              {incomeLike.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}