import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireStaff);

const ANALYTIC_TYPES = ["income", "expense"];

// --------------------------- Analytic accounts ---------------------------

router.get("/", async (_req, res) => {
  const items = await prisma.analyticAccount.findMany({
    include: { _count: { select: { budgets: true, journalEntryLines: true } } },
    orderBy: { name: "asc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { name, type } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required." });
  if (!ANALYTIC_TYPES.includes(type)) return res.status(400).json({ error: "Type must be income or expense." });
  const item = await prisma.analyticAccount.create({ data: { name: String(name).trim(), type } });
  res.status(201).json(item);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.analyticAccount.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Analytic account not found." });
  const { name, type } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: "Name is required." });
    data.name = String(name).trim();
  }
  if (type !== undefined) {
    if (!ANALYTIC_TYPES.includes(type)) return res.status(400).json({ error: "Type must be income or expense." });
    data.type = type;
  }
  const item = await prisma.analyticAccount.update({ where: { id }, data });
  res.json(item);
});

// -------------------------------- Budgets --------------------------------

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth, requireStaff);

budgetsRouter.get("/", async (_req, res) => {
  const items = await prisma.budget.findMany({
    include: { analyticAccount: true },
    orderBy: { periodStart: "desc" },
  });
  res.json(items);
});

budgetsRouter.post("/", async (req, res) => {
  const { name, periodStart, periodEnd, responsiblePerson, plannedAmount, analyticAccountId } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Budget name is required." });
  if (!periodStart || !periodEnd) return res.status(400).json({ error: "Period start and end are required." });
  if (Number(plannedAmount) < 0) return res.status(400).json({ error: "Planned amount must be zero or more." });
  const analytic = await prisma.analyticAccount.findUnique({ where: { id: Number(analyticAccountId) } });
  if (!analytic) return res.status(400).json({ error: "Analytic account does not exist." });
  const item = await prisma.budget.create({
    data: {
      name: String(name).trim(),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      responsiblePerson: responsiblePerson || null,
      plannedAmount: Number(plannedAmount),
      analyticAccountId: analytic.id,
    },
    include: { analyticAccount: true },
  });
  res.status(201).json(item);
});

budgetsRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Budget not found." });
  const { name, periodStart, periodEnd, responsiblePerson, plannedAmount, analyticAccountId } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: "Budget name is required." });
    data.name = String(name).trim();
  }
  if (periodStart !== undefined) data.periodStart = new Date(periodStart);
  if (periodEnd !== undefined) data.periodEnd = new Date(periodEnd);
  if (responsiblePerson !== undefined) data.responsiblePerson = responsiblePerson || null;
  if (plannedAmount !== undefined) data.plannedAmount = Number(plannedAmount);
  if (analyticAccountId !== undefined) {
    const analytic = await prisma.analyticAccount.findUnique({ where: { id: Number(analyticAccountId) } });
    if (!analytic) return res.status(400).json({ error: "Analytic account does not exist." });
    data.analyticAccountId = analytic.id;
  }
  const item = await prisma.budget.update({ where: { id }, data, include: { analyticAccount: true } });
  res.json(item);
});

export default router;