import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireStaff);

const TYPES = ["customer", "vendor", "both"];
const FIELDS = ["name", "type", "email", "mobile", "city", "state", "pincode", "profileImageUrl"];

function validate(body) {
  if (!body.name || !String(body.name).trim()) return "Name is required.";
  if (!TYPES.includes(body.type)) return "Type must be customer, vendor or both.";
  return null;
}

router.get("/", async (req, res) => {
  const { q, type } = req.query;
  const contacts = await prisma.contact.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(q
        ? { OR: [{ name: { contains: String(q) } }, { email: { contains: String(q) } }] }
        : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true, salesOrders: true } } },
  });
  res.json(contacts);
});

router.post("/", async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const contact = await prisma.contact.create({ data: { ...data, name: String(data.name).trim() } });
  res.status(201).json(contact);
});

router.put("/:id", async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const id = Number(req.params.id);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Contact not found." });
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  if (data.name) data.name = String(data.name).trim();
  const contact = await prisma.contact.update({ where: { id }, data });
  res.json(contact);
});

router.post("/:id/archive", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Contact not found." });
  const contact = await prisma.contact.update({ where: { id }, data: { isArchived: !existing.isArchived } });
  res.json(contact);
});

export default router;