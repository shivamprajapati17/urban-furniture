import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireStaff);

const TYPES = ["goods", "service", "combo"];
const FIELDS = ["name", "type", "salesPrice", "costPrice", "category"];

function validate(body) {
  if (!body.name || !String(body.name).trim()) return "Name is required.";
  if (!TYPES.includes(body.type)) return "Type must be goods, service or combo.";
  if (body.salesPrice === undefined || body.salesPrice === null || Number(body.salesPrice) < 0) {
    return "Sales price is required and must be zero or more.";
  }
  return null;
}

router.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  res.json(products);
});

router.post("/", async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  data.name = String(data.name).trim();
  data.salesPrice = Number(data.salesPrice);
  if (data.costPrice !== undefined && data.costPrice !== null) data.costPrice = Number(data.costPrice);
  const product = await prisma.product.create({ data });
  res.status(201).json(product);
});

router.put("/:id", async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Product not found." });
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  if (data.name) data.name = String(data.name).trim();
  if (data.salesPrice !== undefined) data.salesPrice = Number(data.salesPrice);
  if (data.costPrice !== undefined && data.costPrice !== null) data.costPrice = Number(data.costPrice);
  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

router.post("/:id/archive", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Product not found." });
  const product = await prisma.product.update({ where: { id }, data: { isArchived: !existing.isArchived } });
  res.json(product);
});

export default router;