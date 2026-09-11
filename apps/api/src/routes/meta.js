import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";

const router = Router();

// Everything the frontend needs to render forms, bundled into one request.
router.get("/", requireAuth, requireStaff, async (_req, res) => {
  const [contacts, products, accounts, journals, analyticAccounts, budgets, journalEntries] =
    await Promise.all([
      prisma.contact.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } }),
      prisma.product.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } }),
      prisma.account.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } }),
      prisma.journal.findMany({
        include: { defaultAccount: true },
        orderBy: { name: "asc" },
      }),
      prisma.analyticAccount.findMany({ orderBy: { name: "asc" } }),
      prisma.budget.findMany({
        include: { analyticAccount: true },
        orderBy: { periodStart: "desc" },
      }),
      prisma.journalEntry.count(),
    ]);

  res.json({
    contacts,
    products,
    accounts,
    journals,
    analyticAccounts,
    budgets,
    journalEntryCount: journalEntries,
  });
});

export default router;