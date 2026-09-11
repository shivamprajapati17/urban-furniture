import { useMemo, useState } from "react";
import { BadgeCheck, FileText, HandCoins, Receipt } from "lucide-react";
import { useFetch } from "../../lib/useData";
import { useAuth } from "../../context/AuthContext";
import { money, dateOnly } from "../../lib/format";
import { round2 } from "../../lib/format-helpers";
import { Avatar as AvatarUI, Button, EmptyState, PageHeader, Panel, RowSkeleton, StatusBadge, Segmented } from "../../components/ui";
import DocDetail from "../../components/DocDetail";
import PayModal from "../../components/PayModal";

export default function ContactHome() {
  const { user } = useAuth();
  const { data, loading, reload } = useFetch("/me/documents");
  const [selected, setSelected] = useState(null); // { kind, id }
  const [quickPay, setQuickPay] = useState(null); // invoice object to pay
  const [tab, setTab] = useState("all");

  const invoices = useMemo(() => (data?.invoices || []).filter((i) => tab === "all" || tab === "invoices"), [data, tab]);
  const bills = useMemo(() => (data?.bills || []).filter((b) => tab === "all" || tab === "bills"), [data, tab]);

  const contact = data?.contact;
  const canReceive = contact && ["customer", "both"].includes(contact.type);
  const canViewBills = contact && ["vendor", "both"].includes(contact.type);
  const showTabs = canReceive && canViewBills;

  const selectedDoc = selected
    ? selected.kind === "invoice"
      ? (data?.invoices || []).find((i) => i.id === selected.id) || null
      : (data?.bills || []).find((b) => b.id === selected.id) || null
    : null;

  return (
    <div className="page-enter">
      <PageHeader
        title={canReceive ? "Your invoices" : "Your bills"}
        description={
          canReceive
            ? "Invoices raised against you. View the details and pay the outstanding balance here."
            : "Bills Urban Furniture has received from you. Payments are recorded by our team."
        }
      />

      {!loading && data && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
          <div className="flex items-center gap-3">
            <AvatarUI name={contact?.name} size={38} />
            <div>
              <p className="text-[15px] font-semibold text-ink">{contact?.name}</p>
              <p className="text-xs text-ink-mute">{contact?.city ? `${contact.city}${contact.state ? `, ${contact.state}` : ""}` : ""}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-mute">Total outstanding</p>
            <p className="num text-2xl font-bold text-clay-700">{money(data.totalDue)}</p>
          </div>
        </div>
      )}

      {showTabs && (
        <div className="mb-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: `All documents (${(data?.invoices?.length || 0) + (data?.bills?.length || 0)})` },
              { value: "invoices", label: `My invoices (${data?.invoices?.length || 0})` },
              { value: "bills", label: `Bills (${data?.bills?.length || 0})` },
            ]}
          />
        </div>
      )}

      {loading ? (
        <Panel><RowSkeleton rows={5} cols={5} /></Panel>
      ) : !data ? (
        <Panel><EmptyState icon={FileText} title="Nothing to show" /></Panel>
      ) : (
        <div className="space-y-6">
          {canReceive && invoices.length > 0 && (
            <section>
              {showTabs && tab !== "bills" && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Invoices to pay</p>
              )}
              <Panel>
                {invoices.map((i) => {
                  const outstanding = round2(i.totalAmount - i.paidAmount);
                  return (
                    <div
                      key={i.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected({ kind: "invoice", id: i.id })}
                      onKeyDown={(e) => e.key === "Enter" && setSelected({ kind: "invoice", id: i.id })}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-walnut-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf-50 text-leaf-700">
                          <FileText className="h-4.5 w-4.5" strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">Invoice #{i.id}</p>
                          <p className="truncate text-xs text-ink-mute">
                            Issued {dateOnly(i.invoiceDate)} · due {dateOnly(i.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right">
                          <p className="num text-[13.5px] font-medium text-ink">{money(i.totalAmount)}</p>
                          <p className={`num text-xs font-semibold ${outstanding > 0 ? "text-clay-700" : "text-leaf-700"}`}>
                            {outstanding > 0 ? `${money(outstanding)} due` : "fully paid"}
                          </p>
                        </div>
                        <StatusBadge status={i.status} />
                        {outstanding > 0 && i.status !== "paid" && (
                          <Button
                            size="sm"
                            icon={HandCoins}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickPay(i);
                            }}
                          >
                            Pay now
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            </section>
          )}

          {canViewBills && bills.length > 0 && (
            <section>
              {showTabs && tab !== "invoices" && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Bills from Urban Furniture</p>
              )}
              <Panel>
                {bills.map((b) => {
                  const outstanding = round2(b.totalAmount - b.paidAmount);
                  return (
                    <div
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected({ kind: "bill", id: b.id })}
                      onKeyDown={(e) => e.key === "Enter" && setSelected({ kind: "bill", id: b.id })}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-walnut-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                          <Receipt className="h-4.5 w-4.5" strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">Bill #{b.id}</p>
                          <p className="truncate text-xs text-ink-mute">
                            {dateOnly(b.billDate)} · due {dateOnly(b.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right">
                          <p className="num text-[13.5px] font-medium text-ink">{money(b.totalAmount)}</p>
                          <p className={`num text-xs font-semibold ${outstanding > 0 ? "text-clay-700" : "text-leaf-700"}`}>
                            {outstanding > 0 ? `${money(outstanding)} open` : "paid to vendor"}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  );
                })}
              </Panel>
            </section>
          )}

          {((canReceive && invoices.length === 0) || (canViewBills && bills.length === 0)) && !showTabs && (
            <Panel>
              <EmptyState
                icon={BadgeCheck}
                title={canReceive ? "No invoices yet" : "No bills yet"}
                hint={
                  canReceive
                    ? "When Urban Furniture issues an invoice to you, it will appear here with a Pay now button."
                    : "Bills from your orders will appear here once issued."
                }
              />
            </Panel>
          )}
        </div>
      )}

      <DocDetail
        doc={selectedDoc}
        kind={selected?.kind || "invoice"}
        endpointBase="/me"
        pathOverride="/me/pay"
        canPay={selected?.kind === "invoice"}
        onClose={() => setSelected(null)}
        onChanged={() => reload()}
      />

      <PayModal
        open={!!quickPay}
        onClose={() => setQuickPay(null)}
        pathOverride="/me/pay"
        doc={
          quickPay
            ? {
                kind: "invoice",
                id: quickPay.id,
                partyName: contact?.name,
                totalAmount: quickPay.totalAmount,
                paidAmount: quickPay.paidAmount,
                status: quickPay.status,
              }
            : null
        }
        onPaid={() => {
          setQuickPay(null);
          reload();
        }}
      />
    </div>
  );
}