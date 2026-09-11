import { useState } from "react";
import { CalendarRange, FolderKanban, Pencil, Plus, Target } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useData";
import { ANALYTIC_TYPES } from "../../lib/constants";
import { money, dateOnly, dateInputValue, fromISO } from "../../lib/format";
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

const EMPTY_ANALYTIC = { name: "", type: "expense" };
const EMPTY_BUDGET = { name: "", periodStart: "", periodEnd: "", responsiblePerson: "", plannedAmount: "", analyticAccountId: "" };

function AnalyticAccountsTab({ accounts, loading }) {
  const notify = useNotify();
  const { reload } = accounts;
  const list = accounts.data || [];
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ANALYTIC);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("table");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/analytic-accounts", form);
        notify({ title: "Cost centre added", detail: `${form.name} can now be tagged on orders and tracked against budgets.` });
      } else {
        await api.put(`/analytic-accounts/${editing}`, form);
        notify({ title: "Cost centre updated" });
      }
      setEditing(null);
      reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Table" },
            { value: "board", label: "Board" },
          ]}
        />
        <Button icon={Plus} onClick={() => { setForm(EMPTY_ANALYTIC); setEditing("new"); }}>
          New cost centre
        </Button>
      </div>
      <Panel>
        {loading ? (
          <RowSkeleton rows={4} cols={4} />
        ) : list.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No cost centres yet" hint="Cost centres tag income and expense lines so the budget report can compare planned vs actual." />
        ) : view === "board" ? (
          <KanbanBoard
            items={list}
            onCardClick={(a) => { setForm({ name: a.name, type: a.type }); setEditing(a.id); }}
            columns={[
              { key: "expense", label: "Expense centres", dot: "bg-gold-500", matches: (a) => a.type === "expense" },
              { key: "income", label: "Income centres", dot: "bg-leaf-500", matches: (a) => a.type === "income" },
            ]}
            renderCard={(a) => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{a.name}</p>
                  <Badge tone={a.type === "income" ? "leaf" : "gold"}>{ANALYTIC_TYPES[a.type]?.label}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-mute">
                  <span className="num">{a._count.journalEntryLines} tagged lines</span>
                  <span className="num">{a._count.budgets} budgets</span>
                </div>
              </div>
            )}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Cost centre",
                render: (a) => <span className="text-[13.5px] font-medium text-ink">{a.name}</span>,
              },
              {
                key: "type",
                header: "Tracks",
                render: (a) => <Badge tone={a.type === "income" ? "leaf" : "gold"}>{ANALYTIC_TYPES[a.type]?.label}</Badge>,
              },
              {
                key: "usage",
                header: "Tagged lines",
                align: "right",
                render: (a) => <span className="num text-[13px] text-ink-soft">{a._count.journalEntryLines} journal lines</span>,
              },
              {
                key: "budgets",
                header: "Budgets",
                align: "right",
                render: (a) => <span className="num text-[13px] text-ink-soft">{a._count.budgets}</span>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (a) => (
                  <div className="flex justify-end">
                    <IconButton
                      label="Edit"
                      onClick={() => { setForm({ name: a.name, type: a.type }); setEditing(a.id); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ),
              },
            ]}
            rows={list}
            rowKey={(a) => a.id}
          />
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New cost centre" : "Edit cost centre"}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="analytic-form" loading={saving}>{editing === "new" ? "Create" : "Save changes"}</Button>
          </>
        }
      >
        <form id="analytic-form" onSubmit={save} className="space-y-4">
          <Field label="Name" hint="What this centre tracks, e.g. Marketing, Store Rent, Showroom Sales.">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <Field label="Tracks">
            <Segmented
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              options={[
                { value: "expense", label: "Expense (spend)" },
                { value: "income", label: "Income (revenue)" },
              ]}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}

function BudgetsTab({ budgets }) {
  const notify = useNotify();
  const { data: allAnalytics, reload: reloadAnalytics } = budgets.metaAnalytics;
  const list = budgets.data || [];
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BUDGET);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, plannedAmount: Number(form.plannedAmount), analyticAccountId: Number(form.analyticAccountId) };
      if (editing === "new") {
        await api.post("/budgets", body);
        notify({ title: "Budget created", detail: "The budget report will compare this against actual postings." });
      } else {
        await api.put(`/budgets/${editing}`, body);
        notify({ title: "Budget updated" });
      }
      setEditing(null);
      budgets.reload();
      reloadAnalytics();
    } catch (err) {
      notify({ title: "Could not save budget", detail: formatError(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          icon={Plus}
          onClick={() => {
            const y = new Date().getFullYear();
            setForm({ ...EMPTY_BUDGET, periodStart: `${y}-04-01`, periodEnd: `${y + 1}-03-31` });
            setEditing("new");
          }}
        >
          New budget
        </Button>
      </div>
      <Panel>
        {list.length === 0 ? (
          <EmptyState icon={Target} title="No budgets yet" hint="Set a planned amount per cost centre and period; actuals come straight from tagged journal lines." />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Budget",
                render: (b) => (
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">{b.name}</p>
                    <p className="text-xs text-ink-mute">
                      {b.analyticAccount?.name} · owned by {b.responsiblePerson || "unassigned"}
                    </p>
                  </div>
                ),
              },
              {
                key: "period",
                header: "Period",
                render: (b) => (
                  <span className="whitespace-nowrap text-[13px] text-ink-soft">
                    {dateOnly(b.periodStart)} - {dateOnly(b.periodEnd)}
                  </span>
                ),
              },
              {
                key: "planned",
                header: "Planned",
                align: "right",
                render: (b) => <span className="num font-medium text-ink">{money(b.plannedAmount)}</span>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (b) => (
                  <div className="flex justify-end">
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setForm({
                          name: b.name,
                          periodStart: dateInputValue(b.periodStart),
                          periodEnd: dateInputValue(b.periodEnd),
                          responsiblePerson: b.responsiblePerson || "",
                          plannedAmount: b.plannedAmount,
                          analyticAccountId: b.analyticAccountId,
                        }) || setEditing(b.id)
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ),
              },
            ]}
            rows={list}
            rowKey={(b) => b.id}
          />
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New budget" : "Edit budget"}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="budget-form" loading={saving}>{editing === "new" ? "Create budget" : "Save changes"}</Button>
          </>
        }
      >
        <form id="budget-form" onSubmit={save} className="space-y-4">
          <Field label="Budget name">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Marketing FY 2026-27" autoFocus />
          </Field>
          <Field label="Cost centre" hint="Actuals accumulate from journal lines tagged with this centre.">
            <Select required value={form.analyticAccountId} onChange={(e) => setForm((f) => ({ ...f, analyticAccountId: e.target.value }))}>
              <option value="">Select a cost centre…</option>
              {(allAnalytics || []).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({ANALYTIC_TYPES[a.type]?.label})</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <Input type="date" required value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
            </Field>
            <Field label="Ends">
              <Input type="date" required value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            </Field>
          </div>
          <Field label="Planned amount">
            <Input type="number" required min="0" step="0.01" value={form.plannedAmount} onChange={(e) => setForm((f) => ({ ...f, plannedAmount: e.target.value }))} />
          </Field>
          <Field label="Responsible person">
            <Input value={form.responsiblePerson} onChange={(e) => setForm((f) => ({ ...f, responsiblePerson: e.target.value }))} placeholder="Who owns this budget" />
          </Field>
        </form>
      </Modal>
    </>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState("centres");
  const analytics = useFetch("/analytic-accounts");
  const budgets = useFetch("/budgets");
  const metaAnalytics = useFetch("/meta", { skip: tab !== "budgets" });

  return (
    <div className="page-enter">
      <PageHeader
        title="Cost centres & budgets"
        description="Tag income and expense lines with a cost centre, then compare planned spend against what actually posted."
        crumbs={[{ label: "Master data" }, { label: "Cost centres & budgets" }]}
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "centres", label: "Cost centres" },
              { value: "budgets", label: "Budgets" },
            ]}
          />
        }
      />
      {tab === "centres" ? (
        <AnalyticAccountsTab accounts={analytics} loading={analytics.loading} />
      ) : (
        <BudgetsTab budgets={{ ...budgets, metaAnalytics }} />
      )}
    </div>
  );
}