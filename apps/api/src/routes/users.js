import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const ROLES = ["admin", "accountant", "contact"];

function safe(user) {
  const { passwordHash, ...rest } = user;
  return { ...rest, verified: !!user.faceVerifiedAt, hasFace: !!user.faceImageUrl };
}

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { contact: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(users.map(safe));
});

router.post("/", async (req, res) => {
  const { name, email, password, role, contactId, faceImageUrl } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required." });
  const emailClean = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(emailClean)) return res.status(400).json({ error: "A valid email is required." });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Role must be admin, accountant or contact." });

  const existing = await prisma.user.findUnique({ where: { email: emailClean } });
  if (existing) return res.status(400).json({ error: "A user with this email already exists." });

  const numericContactId = contactId ? Number(contactId) : null;
  if (role === "contact") {
    const contact = await prisma.contact.findUnique({ where: { id: numericContactId } });
    if (!contact) return res.status(400).json({ error: "Pick the contact this login belongs to." });
  }

  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: emailClean,
      passwordHash: await bcrypt.hash(String(password), 10),
      role,
      contactId: numericContactId,
      faceImageUrl: faceImageUrl || null,
    },
    include: { contact: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json(safe(user));
});

export default router;