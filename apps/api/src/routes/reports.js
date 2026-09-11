import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";
import { round2 } from "../lib/money.js";

const router = Router();
// Dashboard is public — no auth middleware needed
// Auth required only for data reports that contain financial information

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  return map;
}

// ------------------------------- Balance sheet -------------------------------

router.get("/balance-sheet", requireAuth, requireStaff, async (req, res) => {
  const asOf = req.query.date ? new Date(req.query.date) : new Date();
  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: { entryDate: { lte: endOfDay(asOf) } } },
    include: { account: true },
    orderBy: { accountId: "asc" },
  });

  const balances = new Map(); // accountId -> { account, balance } where balance = debit - credit
  for (const l of lines) {
    const cur = balances.get(l.accountId) || { account: l.account, balance: 0 };
    cur.balance = round2(cur.balance + (l.debit || 0) - (l.credit || 0));
    balances.set(l.accountId, cur);
  }

  const sections = { asset: [], liability: [], capital: [], income: [], expense: [] };
  for (const { account, balance } of balances.values()) {
    if (sections[account.type]) sections[account.type].push({ account: account.name, balance: round2(balance) });
  }

  const totalAssets = round2(sections.asset.reduce((a, x) => a + x.balance, 0));
  const totalLiabilities = round2(-sections.liability.reduce((a, x) => a + x.balance, 0));
  // section balances are debit - credit: income accounts show negative, expense positive.
  const incomeSum = sections.income.reduce((a, x) => a + x.balance, 0);
  const expenseSum = sections.expense.reduce((a, x) => a + x.balance, 0);
  const netIncome = round2(-incomeSum - expenseSum);
  const totalCapital = round2(-sections.capital.reduce((a, x) => a + x.balance, 0) + netIncome);

  res.json({
    asOf: asOf.toISOString().slice(0, 10),
    assets: sections.asset,
    totalAssets,
    liabilities: sections.liability.map((x) => ({ ...x, balance: -x.balance })),
    totalLiabilities,
    capitalAccounts: sections.capital.map((x) => ({ ...x, balance: -x.balance })),
    retainedEarnings: round2(netIncome),
    totalCapital,
    balanced: round2(totalAssets - (totalLiabilities + totalCapital)) === 0,
  });
});

// ------------------------------------ P&L -----------------------------------

router.get("/pnl", requireAuth, requireStaff, async (req, res) => {
  const from = new Date(req.query.from || new Date(new Date().getFullYear(), 0, 1));
  const to = req.query.to ? endOfDay(new Date(req.query.to)) : new Date();
  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: { entryDate: { gte: from, lte: to } }, account: { type: { in: ["income", "expense"] } } },
    include: { account: true },
    orderBy: { accountId: "asc" },
  });

  const income = new Map();
  const expense = new Map();
  for (const l of lines) {
    const target = l.account.type === "income" ? income : expense;
    const cur = target.get(l.accountId) || { account: l.account.name, amount: 0 };
    cur.amount = round2(cur.amount + (l.account.type === "income" ? l.credit - l.debit : l.debit - l.credit));
    target.set(l.accountId, cur);
  }
  const incomeList = [...income.values()];
  const expenseList = [...expense.values()];
  const totalIncome = round2(incomeList.reduce((a, x) => a + x.amount, 0));
  const totalExpense = round2(expenseList.reduce((a, x) => a + x.amount, 0));

  res.json({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    income: incomeList,
    totalIncome,
    expenses: expenseList,
    totalExpenses: totalExpense,
    netProfit: round2(totalIncome - totalExpense),
  });
});

// ------------------------------- Budget report -------------------------------

router.get("/budget", async (_req, res) => {
  const budgets = await prisma.budget.findMany({ include: { analyticAccount: true } });
  const rows = [];
  for (const b of budgets) {
    const agg = await prisma.journalEntryLine.aggregate({
      where: {
        analyticAccountId: b.analyticAccountId,
        journalEntry: { entryDate: { gte: b.periodStart, lte: endOfDay(b.periodEnd) } },
      },
      _sum: { debit: true, credit: true },
    });
    const actual = round2((agg._sum.debit || 0) + (agg._sum.credit || 0));
    rows.push({
      id: b.id,
      name: b.name,
      periodStart: b.periodStart.toISOString().slice(0, 10),
      periodEnd: b.periodEnd.toISOString().slice(0, 10),
      responsiblePerson: b.responsiblePerson,
      analyticAccount: b.analyticAccount.name,
      analyticAccountType: b.analyticAccount.type,
      plannedAmount: round2(b.plannedAmount),
      actualAmount: actual,
      variance: round2(b.plannedAmount - actual),
      utilization: b.plannedAmount > 0 ? Math.round((actual / b.plannedAmount) * 100) : 0,
    });
  }
  res.json(rows);
});

// --------------------------------- Dashboard ---------------------------------

router.get("/dashboard", async (_req, res) => {
  const [invoices, bills, payments, entries, contacts, products, openPOs, openSOs] = await Promise.all([
    prisma.customerInvoice.findMany({ include: { customer: true } }),
    prisma.vendorBill.findMany({ include: { vendor: true } }),
    prisma.payment.findMany({ include: { contact: true, bill: true, invoice: true }, orderBy: { paymentDate: "desc" }, take: 8 }),
    prisma.journalEntry.findMany({ include: { journal: true, lines: { include: { account: true } } }, orderBy: { entryDate: "desc" }, take: 8 }),
    prisma.contact.count(),
    prisma.product.count(),
    prisma.purchaseOrder.count({ where: { status: { in: ["draft", "confirmed"] } } }),
    prisma.salesOrder.count({ where: { status: { in: ["draft", "confirmed"] } } }),
  ]);

  const totalReceivable = round2(
    invoices.filter((i) => i.status !== "paid").reduce((a, i) => a + (i.totalAmount - i.paidAmount), 0)
  );
  const totalPayable = round2(
    bills.filter((b) => b.status !== "paid").reduce((a, b) => a + (b.totalAmount - b.paidAmount), 0)
  );

  // Cash + Bank balance from the ledger.
  const cashLines = await prisma.journalEntryLine.findMany({
    where: { account: { name: { in: ["Cash", "Bank"] }, type: "asset" } },
    include: { account: true },
  });
  const byAccount = new Map();
  for (const l of cashLines) {
    const cur = byAccount.get(l.accountId) || { account: l.account.name, balance: 0 };
    cur.balance = round2(cur.balance + (l.debit || 0) - (l.credit || 0));
    byAccount.set(l.accountId, cur);
  }
  const cashBankAccounts = [...byAccount.values()];
  const cashBankBalance = round2(cashBankAccounts.reduce((a, x) => a + x.balance, 0));

  const recentEntries = entries.map((e) => ({
    id: e.id,
    date: e.entryDate,
    reference: e.reference,
    journal: e.journal.name,
    lines: e.lines.map((l) => ({ account: l.account.name, debit: l.debit, credit: l.credit })),
  }));

  res.json({
    totalReceivable,
    totalPayable,
    cashBankAccounts,
    cashBankBalance,
    counts: { contacts, products, openPOs, openSOs, invoices: invoices.length, bills: bills.length },
    recentPayments: payments,
    recentEntries,
  });
});

export default router;