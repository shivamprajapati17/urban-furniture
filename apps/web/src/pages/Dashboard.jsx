import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CirclePlus,
  HandCoins,
  Landmark,
  Plus,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useFetch } from "../lib/useData";
import { useAuth } from "../context/AuthContext";
import { money, dateOnly } from "../lib/format";
import { Avatar, Button, DataTable, EmptyState, Panel, RowSkeleton, SectionTitle } from "../components/ui";

function Kpi({ label, value, sub, icon: Icon, accent = "walnut", children }) {
  const accents = {
    walnut: "bg-walnut-600/10 text-walnut-700",
    leaf: "bg-leaf-50 text-leaf-700",
    clay: "bg-clay-50 text-clay-700",
    azure: "bg-azure-50 text-azure-700",
  };
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2 text-ink-mute">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accents[accent]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <p className="text-[13px] font-medium">{label}</p>
      </div>
      <p className="num mt-3 text-[24px] font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-mute">{sub}</p>}
      {children}
    </Panel>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading } = useFetch("/reports/dashboard");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const openDocs = data?.counts
    ? [
        { label: "open purchase orders", n: data.counts.openPOs },
        { label: "open sales orders", n: data.counts.openSOs },
        { label: "invoices issued", n: data.counts.invoices },
        { label: "bills received", n: data.counts.bills },
      ]
    : [];

  return (
    <div className="page-enter">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            {greeting}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13px] text-ink-mute">
            Here is the state of the business today, {dateOnly(new Date())}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={CirclePlus} onClick={() => navigate("/purchase-orders?new=1")}>
            Purchase order
          </Button>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => navigate("/sales-orders?new=1")}>
            Sales order
          </Button>
          <Button size="sm" icon={Plus} onClick={() => navigate("/contacts?new=1")}>
            New contact
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Panel key={i} className="h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Cash & bank balance" value={money(data.cashBankBalance)} icon={Wallet} accent="walnut">
            {data.cashBankAccounts?.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-line pt-2">
                {data.cashBankAccounts.map((a) => (
                  <div key={a.account} className="flex items-center justify-between text-xs">
                    <span className="text-ink-mute">{a.account}</span>
                    <span className="num font-medium text-ink">{money(a.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </Kpi>
          <Kpi label="To receive from customers" value={money(data.totalReceivable)} icon={TrendingUp} accent="leaf"
            sub={`${data.counts?.invoices ?? 0} invoices on the books`} />
          <Kpi label="To pay to vendors" value={money(data.totalPayable)} icon={TrendingDown} accent="clay"
            sub={`${data.counts?.bills ?? 0} vendor bills open`} />
          <Link to="/accounts" className="block">
            <Panel className="h-full p-4 transition-colors hover:border-walnut-400">
              <div className="flex items-center gap-2 text-ink-mute">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-azure-50 text-azure-700">
                  <Scale className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <p className="text-[13px] font-medium">Ledger</p>
              </div>
              <p className="mt-3 text-[24px] font-semibold tracking-tight text-ink">{data.counts?.openPOs + data.counts?.openSOs}</p>
              <p className="mt-0.5 text-xs text-ink-mute">open orders awaiting action</p>
            </Panel>
          </Link>
        </div>
      )}

      {/* Two-column recent activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section>
          <SectionTitle
            right={
              <Link to="/payments" className="text-[13px] font-medium text-walnut-600 hover:text-walnut-800">
                View all
              </Link>
            }
          >
            Recent payments
          </SectionTitle>
          <Panel>
            {loading ? (
              <RowSkeleton rows={4} cols={4} />
            ) : data.recentPayments?.length === 0 ? (
              <EmptyState icon={HandCoins} title="No payments yet" hint="Payments recorded against bills and invoices will appear here." />
            ) : (
              <DataTable
                dense
                columns={[
                  {
                    key: "when",
                    header: "Date",
                    render: (p) => <span className="whitespace-nowrap text-ink-soft">{dateOnly(p.paymentDate)}</span>,
                  },
                  {
                    key: "who",
                    header: "Contact",
                    render: (p) => (
                      <span className="flex items-center gap-2">
                        <Avatar name={p.contact?.name} size={24} />
                        <span className="truncate">{p.contact?.name}</span>
                      </span>
                    ),
                  },
                  {
                    key: "doc",
                    header: "Against",
                    render: (p) =>
                      p.invoice ? (
                        <span className="text-ink-soft">Invoice #{p.invoice.id}</span>
                      ) : p.bill ? (
                        <span className="text-ink-soft">Bill #{p.bill.id}</span>
                      ) : (
                        "-"
                      ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    align: "right",
                    render: (p) => (
                      <span className={`num flex items-center justify-end gap-1 font-medium ${p.direction === "in" ? "text-leaf-700" : "text-clay-700"}`}>
                        {p.direction === "in" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        {money(p.amount)}
                      </span>
                    ),
                  },
                ]}
                rows={data.recentPayments}
                rowKey={(p) => p.id}
              />
            )}
          </Panel>
        </section>

        <section>
          <SectionTitle
            right={
              <span className="flex items-center gap-1.5 text-xs text-ink-mute">
                <ShieldCheck className="h-3.5 w-3.5 text-leaf-600" strokeWidth={2} />
                Auto-posted, always balanced
              </span>
            }
          >
            Recent ledger entries
          </SectionTitle>
          <Panel>
            {loading ? (
              <RowSkeleton rows={4} cols={3} />
            ) : data.recentEntries?.length === 0 ? (
              <EmptyState icon={Landmark} title="The ledger is quiet" hint="Post a bill or generate an invoice and the journal entries will appear here." />
            ) : (
              <div className="divide-y divide-line">
                {data.recentEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">{e.reference || `Entry #${e.id}`}</p>
                      <p className="text-xs text-ink-mute">
                        {dateOnly(e.date)} · {e.journal}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-[13px] font-medium text-ink">{money(e.lines?.reduce((a, l) => a + l.debit, 0) || 0)}</p>
                      <p className="text-[11px] text-ink-faint">
                        {e.lines?.length ?? 0} {e.lines?.length === 1 ? "line" : "lines"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>

      {/* Volume strip */}
      {!loading && (
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <Banknote className="h-4 w-4 text-ink-mute" /> This workspace
          </span>
          {openDocs.map((d) => (
            <span key={d.label} className="text-[13px] text-ink-mute">
              <span className="num font-semibold text-ink">{d.n}</span> {d.label}
            </span>
          ))}
          <span className="text-[13px] text-ink-mute">
            <span className="num font-semibold text-ink">{data.counts?.contacts}</span> contacts
          </span>
          <span className="text-[13px] text-ink-mute">
            <span className="num font-semibold text-ink">{data.counts?.products}</span> products
          </span>
        </div>
      )}
    </div>
  );
}