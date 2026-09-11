import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken, requireAuth } from "../lib/auth.js";

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    contactId: u.contactId ?? null,
    faceImageUrl: u.faceImageUrl ?? null,
    faceVerifiedAt: u.faceVerifiedAt ?? null,
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { contact: true },
  });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

/**
 * One-time live face verification. The user must already have a face image on
 * record (set by an admin); the live capture is stored as the latest photo and
 * the account is marked verified.
 */
router.post("/verify-face", requireAuth, async (req, res) => {
  const { faceImageUrl } = req.body || {};
  if (!faceImageUrl || !String(faceImageUrl).startsWith("data:image")) {
    return res.status(400).json({ error: "A live face capture is required." });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!user.faceImageUrl) {
    return res.status(400).json({ error: "No face image is on file. Ask an admin to set one first." });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { faceImageUrl: String(faceImageUrl), faceVerifiedAt: new Date() },
  });
  res.json({ ok: true, user: publicUser(updated) });
});

export default router;