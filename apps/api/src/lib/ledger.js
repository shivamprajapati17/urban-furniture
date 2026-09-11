import { prisma } from "./prisma.js";
import { round2 } from "./money.js";

// ---------------------------------------------------------------------------
// Account resolution helpers.
// Each posting rule targets a canonical account, falling back to the first
// account of the right type so the system keeps working with custom CoA data.
// ---------------------------------------------------------------------------

async function findAccount(where, fallbackType) {
  const hit = await prisma.account.findFirst({ where });
  if (hit) return hit;
  if (fallbackType) {
    return prisma.account.findFirst({ where: { type: fallbackType, isArchived: false } });
  }
  return null;
}

// Note: SQLite LIKE (used by `contains`) is case-insensitive for ASCII, so no `mode` filter is needed.
export const accountRoles = {
  purchaseExpense: () => findAccount({ name: { contains: "Purchase Expense" }, isArchived: false }, "expense"),
  saleIncome: () => findAccount({ name: { contains: "Sale Income" }, isArchived: false }, "income"),
  creditors: () => findAccount({ name: { contains: "Creditor" }, isArchived: false }, "liability"),
  debtors: () => findAccount({ name: { contains: "Debtor" }, isArchived: false }, "asset"),
  taxPayable: async () => {
    const hit = await findAccount({ name: { contains: "Tax Payable" }, isArchived: false }, null);
    if (hit) return hit;
    // Fall back to any liability that is not the creditors account.
    const creditors = await accountRoles.creditors();
    return prisma.account.findFirst({
      where: { type: "liability", isArchived: false, id: creditors ? { not: creditors.id } : undefined },
    });
  },
  bank: () => findAccount({ name: "Bank", isArchived: false }, "asset"),
  cash: () => findAccount({ name: "Cash", isArchived: false }, "asset"),
};

async function journalFor(type) {
  return prisma.journal.findFirst({
    where: { type, defaultAccount: { isArchived: false } },
    include: { defaultAccount: true },
  });
}

// ---------------------------------------------------------------------------
// Journal posting (the only place JournalEntries are created).
// ---------------------------------------------------------------------------

export class LedgerError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

/**
 * Create a balanced journal entry inside a transaction.
 * @param tx      prisma transaction client
 * @param opts    { journalType, entryDate, reference, sourceType, sourceId, lines }
 *   lines: [{ accountId, debit, credit, analyticAccountId? }]
 */
export async function postJournal(tx, { journalType, entryDate, reference, sourceType, sourceId, lines }) {
  const clean = lines.map((l) => ({
    accountId: l.accountId,
    debit: round2(l.debit || 0),
    credit: round2(l.credit || 0),
    analyticAccountId: l.analyticAccountId ?? null,
  }));

  const totalDebit = round2(clean.reduce((a, l) => a + l.debit, 0));
  const totalCredit = round2(clean.reduce((a, l) => a + l.credit, 0));

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new LedgerError(
      `Unbalanced journal entry: debit ${totalDebit} does not equal credit ${totalCredit}.`
    );
  }
  if (clean.some((l) => !l.accountId)) {
    throw new LedgerError("Every journal line needs an account.");
  }

  const journal = await journalFor(journalType);
  if (!journal) {
    throw new LedgerError(`No ${journalType} journal configured. Set one up in Chart of Accounts first.`);
  }

  const entry = await tx.journalEntry.create({
    data: {
      journalId: journal.id,
      entryDate: new Date(entryDate),
      reference,
      sourceType,
      sourceId,
      lines: { create: clean },
    },
    include: { lines: true },
  });
  return entry;
}

// ---------------------------------------------------------------------------
// Business posting rules (TRD section 3.1).
// ---------------------------------------------------------------------------

/**
 * Vendor bill posted:  Dr Purchase Expense / Cr Creditor
 */
export async function postVendorBill(tx, { billId, total, date, analyticAccountId }) {
  const purchaseExpense = await accountRoles.purchaseExpense();
  const creditors = await accountRoles.creditors();
  if (!purchaseExpense || !creditors) {
    throw new LedgerError("Set up Purchase Expense and Creditors accounts before posting bills.");
  }
  return postJournal(tx, {
    journalType: "purchase",
    entryDate: date,
    reference: `Vendor Bill #${billId}`,
    sourceType: "bill",
    sourceId: billId,
    lines: [
      { accountId: purchaseExpense.id, debit: total, analyticAccountId: analyticAccountId ?? null },
      { accountId: creditors.id, credit: total },
    ],
  });
}

/**
 * Customer invoice posted:  Dr Debtor / Cr Sale Income / Cr Tax Payable
 */
export async function postCustomerInvoice(tx, { invoiceId, subtotal, tax, date, analyticAccountId }) {
  const debtors = await accountRoles.debtors();
  const saleIncome = await accountRoles.saleIncome();
  const total = round2(subtotal + tax);
  if (total <= 0) throw new LedgerError("Invoice total must be greater than zero.");
  if (!debtors || !saleIncome) {
    throw new LedgerError("Set up Debtors and Sale Income accounts before posting invoices.");
  }
  const lines = [{ accountId: debtors.id, debit: total }];
  lines.push({ accountId: saleIncome.id, credit: subtotal, analyticAccountId: analyticAccountId ?? null });
  if (tax > 0) {
    const taxPayable = await accountRoles.taxPayable();
    lines.push({ accountId: taxPayable.id, credit: tax });
  }
  return postJournal(tx, {
    journalType: "sales",
    entryDate: date,
    reference: `Customer Invoice #${invoiceId}`,
    sourceType: "invoice",
    sourceId: invoiceId,
    lines,
  });
}

/**
 * Payment received (from customer):  Dr Bank/Cash / Cr Debtor
 */
export async function postPaymentIn(tx, { invoiceId, contactId, method, amount, date }) {
  const { bank, cash } = await resolveCashBank(tx, method);
  const debtors = await accountRoles.debtors();
  if (!debtors) throw new LedgerError("Set up the Debtors account before recording payments.");
  return postJournal(tx, {
    journalType: method === "bank" ? "bank" : "cash",
    entryDate: date,
    reference: `Payment from contact #${contactId} on invoice #${invoiceId}`,
    sourceType: "payment",
    sourceId: contactId,
    lines: [
      { accountId: method === "bank" ? bank.id : cash.id, debit: amount },
      { accountId: debtors.id, credit: amount },
    ],
  });
}

/**
 * Payment made (to vendor):  Dr Creditor / Cr Bank/Cash
 */
export async function postPaymentOut(tx, { billId, contactId, method, amount, date }) {
  const { bank, cash } = await resolveCashBank(tx, method);
  const creditors = await accountRoles.creditors();
  if (!creditors) throw new LedgerError("Set up the Creditors account before recording payments.");
  return postJournal(tx, {
    journalType: method === "bank" ? "bank" : "cash",
    entryDate: date,
    reference: `Payment to contact #${contactId} on bill #${billId}`,
    sourceType: "payment",
    sourceId: contactId,
    lines: [
      { accountId: creditors.id, debit: amount },
      { accountId: method === "bank" ? bank.id : cash.id, credit: amount },
    ],
  });
}

async function resolveCashBank(tx, method) {
  const bank = await accountRoles.bank();
  const cash = await accountRoles.cash();
  if (method === "bank" && !bank) throw new LedgerError("Set up a Bank account before recording bank payments.");
  if (method === "cash" && !cash) throw new LedgerError("Set up a Cash account before recording cash payments.");
  return { bank, cash };
}