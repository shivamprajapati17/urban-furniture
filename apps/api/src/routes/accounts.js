import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireStaff);

const ACCOUNT_TYPES = ["asset", "liability", "income", "expense", "capital"];
const JOURNAL_TYPES = ["sales", "purchase", "bank", "cash"];

// --------------------------- Chart of Accounts ---------------------------

router.get("/", async (_req, res) => {
  const accounts = await prisma.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  // Attach live ledger balances (debit - credit) so the CoA can be read like a register.
  const lines = await prisma.journalEntryLine.findMany({ select: { accountId: true, debit: true, credit: true } });
  const balances = new Map();
  for (const l of lines) balances.set(l.accountId, (balances.get(l.accountId) || 0) + l.debit - l.credit);
  const rounded = new Map();
  for (const [id, v] of balances) rounded.set(id, Math.round(v * 100) / 100);
  res.json(accounts.map((a) => ({ ...a, balance: rounded.get(a.id) || 0 })));
});

router.post("/", async (req, res) => {
  const { name, type } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Account name is required." });
  if (!ACCOUNT_TYPES.includes(type)) return res.status(400).json({ error: "Invalid account type." });
  const account = await prisma.account.create({ data: { name: String(name).trim(), type } });
  res.status(201).json(account);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Account not found." });
  const { name, type } = req.body || {};
  if (name !== undefined && (!name || !String(name).trim())) {
    return res.status(400).json({ error: "Account name is required." });
  }
  if (type !== undefined && !ACCOUNT_TYPES.includes(type)) {
    return res.status(400).json({ error: "Invalid account type." });
  }
  const account = await prisma.account.update({
    where: { id },
    data: { ...(name ? { name: String(name).trim() } : {}), ...(type ? { type } : {}) },
  });
  res.json(account);
});

router.post("/:id/archive", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Account not found." });
  const account = await prisma.account.update({ where: { id }, data: { isArchived: !existing.isArchived } });
  res.json(account);
});

// ------------------------------ Journals --------------------------------

router.get("/journals", async (_req, res) => {
  const journals = await prisma.journal.findMany({
    include: { defaultAccount: true },
    orderBy: { name: "asc" },
  });
  res.json(journals);
});

router.post("/journals", async (req, res) => {
  const { name, type, defaultAccountId } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Journal name is required." });
  if (!JOURNAL_TYPES.includes(type)) return res.status(400).json({ error: "Invalid journal type." });
  const account = await prisma.account.findUnique({ where: { id: Number(defaultAccountId) } });
  if (!account) return res.status(400).json({ error: "Default account does not exist." });
  const journal = await prisma.journal.create({
    data: { name: String(name).trim(), type, defaultAccountId: account.id },
    include: { defaultAccount: true },
  });
  res.status(201).json(journal);
});

router.put("/journals/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.journal.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Journal not found." });
  const { name, type, defaultAccountId } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: "Journal name is required." });
    data.name = String(name).trim();
  }
  if (type !== undefined) {
    if (!JOURNAL_TYPES.includes(type)) return res.status(400).json({ error: "Invalid journal type." });
    data.type = type;
  }
  if (defaultAccountId !== undefined) {
    const account = await prisma.account.findUnique({ where: { id: Number(defaultAccountId) } });
    if (!account) return res.status(400).json({ error: "Default account does not exist." });
    data.defaultAccountId = account.id;
  }
  const journal = await prisma.journal.update({ where: { id }, data, include: { defaultAccount: true } });
  res.json(journal);
});

export default router;